# Plan — Afficher les routes bordantes sur le croquis

## Problème
Dans `StepLotDesigner.tsx` (ligne 968 et 1263), les routes externes (`isExternal === true`, ajoutées via `BorderingRoadsPanel`) sont filtrées avant d'être passées à `LotCanvas`. Résultat : rien ne s'affiche sur le croquis quand on déclare une route bordante.

Même si on les laissait passer, le rendu actuel centre la bande de route sur `road.path` (qui pour une route bordante = `[side.a, side.b]`, donc collée au côté de la parcelle). La bande chevaucherait la parcelle au lieu d'être à l'extérieur.

## Correction

### 1. `StepLotDesigner.tsx`
- Ligne 968 (passage à `LotCanvas`) : **ne plus filtrer** `!r.isExternal`. Passer `roads` complet pour que le canvas connaisse les routes externes.
- Ligne 1263 (`RoadsListPanel`) : **conserver** le filtre `!r.isExternal`. Les routes bordantes restent gérées dans `BorderingRoadsPanel`.

### 2. `LotCanvas.tsx` — rendu spécifique aux routes externes
Dans le bloc `roads.map(road => …)` (ligne 826), brancher en début de boucle :

```ts
if (road.isExternal && road.borderingParcelSideIndex != null) {
  // Calculer la normale sortante depuis le centroïde de la parcelle-mère
  // vers le milieu du côté concerné, et tracer une bande parallèle
  // entièrement à l'extérieur (offset = halfW vers l'extérieur,
  // donc la face intérieure de la bande coïncide avec le côté).
  return renderExternalRoadBand(road, parentVertices, ...);
}
```

Comportement du `renderExternalRoadBand` :
- Points A = `parentVertices[side]`, B = `parentVertices[(side+1) % n]`, en coords écran via `toScreen`.
- Largeur en pixels : `(road.widthM / sideLength) * (CANVAS_W - 2*PADDING)` (même formule).
- Normale **sortante** : prendre la normale perpendiculaire à AB et choisir le sens opposé au centroïde de `parentVertices`.
- Quatre sommets de la bande : `A`, `B`, `B + n*W`, `A + n*W` (bande entièrement dehors).
- Rendu :
  - polygone rempli (style "voie publique existante" : couleur ambre `#d4a574` opacité 0.25, contour solide `#92400e`).
  - libellé `{road.name} ({width}m)` centré sur la bande, parallèle au côté.
  - **non interactif** sur le canvas (pas de drag, pas de sélection, pas de hit-area) — gestion via `BorderingRoadsPanel` uniquement.
- Exclure les routes externes :
  - du bloc "hit-areas" (ligne 1467)
  - du calcul `getAllRoadIntersectionPoints` (ligne 1510)
  - du tri sélection (`selectedRoadId`) — non sélectionnables au canvas.

### 3. Hors scope
- Aucune modification de logique métier, validation, fees, ou DB.
- Pas de changement des routes internes ni de `RoadsListPanel`.
- Pas de drag/édition graphique des routes bordantes (modifications via panneau).

## Fichiers touchés
- `src/components/cadastral/subdivision/steps/StepLotDesigner.tsx` (1 ligne)
- `src/components/cadastral/subdivision/LotCanvas.tsx` (branche de rendu + exclusions hit-area/intersections)
