# Lisibilité dynamique des valeurs sur le croquis

## Objectif

Éliminer la superposition des labels (longueurs des côtés, surfaces, numéros, noms propriétaires, orientations, graduations) sur le croquis de la parcelle-mère et des lots. Adapter l'affichage au niveau de zoom avec :
- **Anti-collision avec leader line** (ligne de rappel) pour décaler les labels qui se chevauchent.
- **Sortie automatique du label hors du lot** (avec leader line) lorsque le lot est trop petit pour le contenir.
- **Seuils de zoom progressifs** gérés selon les bonnes pratiques cartographiques.

Périmètre : composant `LotCanvas.tsx` (utilisé par `StepLotDesigner` et `StepPlanView`). Pas de changement de logique métier.

## Diagnostic actuel

`LotCanvas` rend chaque label à une position fixe :
- Longueurs parcelle-mère : badge rectangulaire au milieu de chaque côté, décalé vers l'extérieur (lignes 941-985).
- Graduations parent (ticks tous les 0,5 / 1 / 2 / 5 m) avec étiquette à chaque tick majeur (lignes 751-851) — déjà filtré par densité pixels mais texte non culled.
- Labels de lots : numéro, surface, nom propriétaire empilés verticalement autour du centroïde (lignes 1389-1409) sans tenir compte de la taille du lot.
- Dimensions des arêtes de lots (lignes 1536-1553) : texte au milieu de chaque arête, sans détection de collision avec les autres labels.

Aucun de ces labels ne sait s'il chevauche un autre. Au zoom in, le `viewBox` rétrécit, les positions se rapprochent à l'écran et tout devient illisible.

## Plan d'implémentation

### 1. Nouveau module `utils/labelLayout.ts`

Petit moteur de placement avec :
- `type LabelBox = { id; x; y; w; h; priority; anchor: { x; y } }` (anchor = point de rattachement réel — milieu d'arête, centroïde…).
- `placeLabels(boxes, options)` : trie par priorité décroissante, place greedy, et pour chaque collision tente jusqu'à 8 positions candidates (offsets perpendiculaires croissants ±). Si aucune position libre dans un rayon `maxOffsetPx`, le label est marqué `dropped` (masqué) ou `leadered = true` selon priorité.
- Retourne `{ placed: PlacedLabel[], leaders: Array<{from, to}> }` avec `from = anchor`, `to = position finale` lorsque le décalage dépasse un seuil.

Priorités (haute → basse) :
1. Numéro de lot
2. Surface du lot
3. Longueur du côté du lot
4. Longueur du côté de la parcelle-mère (badge)
5. Orientation cardinale
6. Nom propriétaire
7. Graduations tick (labels métriques)

### 2. Seuils de zoom (LOD)

Dans `LotCanvas`, calculer `lod` depuis `viewport.zoom` (bonnes pratiques cartographiques) :

| Zoom | Affiché |
|---|---|
| < 1.0 | Numéro de lot seul (+ longueurs parcelle-mère) |
| ≥ 1.0 | + Surface |
| ≥ 1.5 | + Longueurs des côtés des lots |
| ≥ 2.0 | + Orientations cardinales, nom propriétaire |
| ≥ 2.5 | + Graduations métriques fines |

Le filtre `lod` s'applique **avant** le placement (réduit la combinatoire).

### 3. Application dans `LotCanvas.tsx`

- Construire la liste `LabelBox[]` à partir des labels actuellement rendus (estimer la largeur via `label.length * fontSize * 0.6`).
- Appeler `placeLabels()` une fois dans un `useMemo` indexé sur `[lots, parentVertices, viewport, showDimensions, showAreas, showLotNumbers, showOwnerNames]`.
- Remplacer les `<text>` actuels par un rendu à partir de `placed` :
  - Position = position post-placement (qui peut différer du milieu d'arête ou du centroïde).
  - Si `leadered`, dessiner un `<line>` fin pointillé `from anchor to position` en `hsl(var(--muted-foreground))` opacity 0.5 + petit point au point d'ancrage.
  - Si `dropped`, ne rien dessiner.
- Pour les **petits lots** (surface écran < seuil), forcer `leadered = true` sur numéro + surface en les sortant au-dessus du lot.

### 4. Performance

- Le `useMemo` du placement ne se déclenche qu'au changement réel d'entrée. Le pan ne change pas le placement (positions en coords monde transformées au rendu).
- Cull précoce : les labels hors viewport ne rentrent pas dans le solveur.
- Plafond de tentatives par label = 8 ; complexité O(n × k) sur n labels visibles.

## Détails techniques

- Tous les calculs `screen coords` réutilisent `toScreen()` existant.
- Tailles texte/marges via les helpers `sw()` / `fs()` déjà présents pour rester invariants au zoom.
- Aucune migration DB, aucune modif de business logic, aucun changement de props publiques de `LotCanvas`.
- Mode `readOnly` (utilisé dans `StepPlanView`) reçoit le même traitement → bénéficie aussi à l'export PNG.

## Fichiers touchés

- **Créé** : `src/components/cadastral/subdivision/utils/labelLayout.ts`
- **Modifié** : `src/components/cadastral/subdivision/LotCanvas.tsx` (rendu des sections labels parent, dimensions lots, infos lots).

## Hors périmètre

- Pas de changement aux outils de dessin, drag, snapping, validation, ou exports CSV/PDF.
- Pas de nouveaux toggles UI (les switches de `StepPlanView` continuent à fonctionner à l'identique — ils alimentent simplement le filtre amont).
