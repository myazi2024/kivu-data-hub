

## Plan — Verrouiller la forme de la parcelle mère (lot unique initial)

### Objectif

Tant que l'utilisateur n'a pas commencé à diviser, le lot unique auto-créé représente la **parcelle mère officielle**. Sa forme (sommets, arêtes, position, rotation) doit être **immuable**. Seules les opérations de **division** (split/cut) sont autorisées — elles transforment ce lot en plusieurs lots-enfants qui, eux, redeviennent éditables.

### Constat

Aujourd'hui, dès que l'onglet Lots s'ouvre, l'utilisateur peut :
- déplacer un sommet de la parcelle mère,
- glisser une arête,
- déplacer le polygone entier,
- le faire pivoter ou le décaler aux flèches.

→ Risque d'altérer la géométrie cadastrale officielle avant même toute division. Incohérent avec la finalité (la parcelle mère est une donnée vérifiée).

### Approche

Marquer le lot initial avec un drapeau `isParentBoundary: true`. Toute opération qui modifie sa **forme** est bloquée tant que ce drapeau est actif. Les opérations de **division** (split, cut) consomment ce lot et produisent des enfants **sans** ce drapeau → la nouvelle géométrie devient librement éditable.

### Livrables

#### 1. Type — `types.ts`
- Ajouter le champ optionnel `isParentBoundary?: boolean` à `SubdivisionLot`.

#### 2. Hook `useSubdivisionForm.ts`
- Dans `createInitialLot`, marquer le lot créé : `isParentBoundary: true`.
- Dans `updateLot`, autoriser uniquement les modifications **non géométriques** (lotNumber, intendedUse, color, isBuilt, hasFence, annotations, etc.) sur un lot avec `isParentBoundary`. Toute mise à jour de `vertices`, `areaSqm`, `perimeterM` est ignorée.
- `deleteLot` : interdit pour `isParentBoundary` (le lot ne peut disparaître que via une division).

#### 3. Drag — `LotCanvas.tsx` + `useCanvasDrag.ts`
- Dans `handleVertexMouseDown`, `handleEdgeMouseDown`, `handlePolygonMouseDown` : ignorer si le lot ciblé porte `isParentBoundary`.
- Dans la rotation (`rotationDrag`) et le déplacement clavier (flèches) : même garde.
- Visuel : afficher les sommets de la parcelle mère sous forme de petits carrés gris non interactifs (curseur `not-allowed` au survol) au lieu des poignées rondes bleues, pour signaler l'état verrouillé.

#### 4. Opérations de division — déverrouillage
- Dans `handleSplitLot`, `handleCutLot` (et toute autre op qui produit ≥ 2 lots à partir d'un lot source) : les **lots-enfants** créés sont émis **sans** `isParentBoundary`. Le lot mère verrouillé est consommé.
- Dans `handleMergeLots` : si l'un des lots fusionnés est `isParentBoundary` (cas anormal), le résultat n'hérite pas du drapeau.

#### 5. UI pédagogique — `StepLotDesigner.tsx`
- Quand le seul lot présent est `isParentBoundary`, afficher un badge discret « Parcelle mère — forme verrouillée » sur la carte du lot (panneau latéral) et adapter l'alerte : « La parcelle mère est verrouillée. Utilisez **Diviser un lot** pour la découper en lots éditables. »
- Désactiver visuellement (opacity + tooltip) les actions de la barre latérale qui n'ont aucun effet sur la parcelle mère seule (Dupliquer, Supprimer, Rotation).

#### 6. Reprise de brouillon
- Les anciens drafts (lots sans `isParentBoundary`) restent éditables comme aujourd'hui — pas de migration nécessaire. Le verrou n'apparaît que pour les nouveaux lots auto-créés.

### Vérification

1. Ouvrir l'onglet Lots → la parcelle mère est verrouillée : sommets gris, drag impossible, badge « Forme verrouillée ».
2. Tenter de glisser un sommet, une arête, le polygone, ou d'utiliser les flèches/rotation → aucun effet.
3. Cliquer **Diviser un lot** et tracer une coupe → deux lots-enfants apparaissent, **éditables** (sommets bleus, drag actif).
4. Dans le brouillon, recharger après division → les enfants restent éditables, la parcelle mère a disparu.
5. Tenter de supprimer la parcelle mère unique → action désactivée avec tooltip explicite.

### Fichiers modifiés

- `src/components/cadastral/subdivision/types.ts` (ajout flag)
- `src/components/cadastral/subdivision/hooks/useSubdivisionForm.ts` (createInitialLot, updateLot, deleteLot)
- `src/components/cadastral/subdivision/hooks/useCanvasDrag.ts` (gardes sur start*Drag)
- `src/components/cadastral/subdivision/LotCanvas.tsx` (handlers mouse/clavier/rotation, rendu sommets verrouillés)
- `src/components/cadastral/subdivision/steps/StepLotDesigner.tsx` (badge, alerte, désactivation actions)

Aucune migration BD ni edge function impactée.

