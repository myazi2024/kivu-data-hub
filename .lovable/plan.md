## Objectif
Dans le panneau "Type de zone" (`RoadsListPanel`), ajouter à côté du contrôle "Largeur" un contrôle équivalent pour la **Longueur (m)** d'une voie tracée, avec slider + saisie numérique, harmonisé visuellement avec le bloc largeur existant.

## Comportement

- **Voies internes** (`isExisting=false`, tracées par l'utilisateur) : longueur éditable. Modifier la longueur **redimensionne le polyline `path`** autour de son **point milieu géométrique**, en conservant l'orientation, la largeur et les infrastructures (canal, éclairage, revêtement).
- **Voies bordantes** (`isExisting=true`, côté parcelle) : longueur affichée mais **lecture seule** (elle suit le côté de la parcelle parente, comme aujourd'hui pour le nom).
- Bornes : `min 5 m`, `max 2000 m`, `step 0.5 m`, `formatWidth` (1 décimale) déjà utilisé pour la largeur.
- Si la longueur courante ne peut pas être calculée (path < 2 points, pas de frame métrique), le bloc Longueur n'est pas affiché — on garde uniquement la largeur, comme aujourd'hui.

## Détails techniques

### `RoadsListPanel.tsx`
1. Ajouter une prop `metricFrame?: MetricFrame` à `Props`.
2. Importer `edgeLengthM` (et le type `MetricFrame`) depuis `../../utils/metrics`.
3. Calculer `currentLengthM` pour `editingRoad` :
   - Somme des `edgeLengthM(path[i], path[i+1], metricFrame)` sur le `path`.
4. Helper `rescalePath(path, factor)` :
   - Calcule le centroïde des extrémités (`(path[0] + path[last]) / 2` côté coordonnées normalisées).
   - Renvoie `path.map(p => mid + (p - mid) * factor)`.
5. Helper `setRoadLength(road, newLengthM)` :
   - `factor = newLengthM / currentLengthM` (garde-fou `currentLengthM > 0`).
   - Applique `rescalePath` et appelle `onUpdateRoad(road.id, { path: nextPath })`.
6. Sous le bloc "Largeur" existant (lignes ~194-219), ajouter un bloc "Longueur" identique en structure (Label + Slider + Input number), désactivé si `editingRoad.isExisting` ou si `currentLengthM` indisponible.

### `StepLotDesigner.tsx`
- Ajouter `metricFrame={metricFrame}` au rendu `<RoadsListPanel … />` (ligne ~1424). Aucun autre changement.

### Hors-périmètre
- Pas de modification des algorithmes géométriques (`geometry.ts`, `polygonOps.ts`, `convertZoneType.ts`).
- Pas de modification de `LotCanvas`, du drag, du pan, du zoom, du snap.
- Pas de modification des règles de zonage, des frais, du backend ni du schéma.
- Pas de changement sur `BorderingRoadsPanel` ni sur le bloc Largeur (préservation du comportement validé).

## Fichiers modifiés
- `src/components/cadastral/subdivision/steps/panels/RoadsListPanel.tsx`
- `src/components/cadastral/subdivision/steps/StepLotDesigner.tsx`
