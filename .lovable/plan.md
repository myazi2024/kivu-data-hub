# Conversion "Zone → Voie" : couverture intégrale automatique

## Problème
Quand l'utilisateur dessine une zone (lot ou espace commun) et la convertit en voie via le sélecteur de type, la voie est aujourd'hui rendue comme un rectangle dérivé d'une **ligne centrale** + `widthM` (largeur préréglée 6 m ou largeur inférée mais plafonnée à 30 m). Résultat : pour tout polygone non rectangulaire ou large, la voie affichée ne recouvre pas la zone d'origine — l'utilisateur doit ajuster manuellement la largeur, et le rendu reste approximatif.

Attendu : la voie doit reprendre **exactement** l'emprise du polygone dessiné, sans intervention.

## Approche
Ajouter une emprise (`footprint`) optionnelle sur la voie. Quand elle est présente, le canvas dessine ce polygone tel quel comme corps de voie. `path` + `widthM` restent maintenus pour rester compatibles avec les calculs existants (frais, validation, mini-map, infrastructures dérivées).

## Modifications

### 1. `src/components/cadastral/subdivision/types.ts`
- Ajouter `footprint?: Point2D[]` à `SubdivisionRoad` (coordonnées normalisées, ≥3 points). Commentaire : « Emprise polygonale d'origine quand la voie a été créée par conversion d'une zone dessinée. Si présent, prime sur le rectangle dérivé de `path` + `widthM` pour l'affichage. »

### 2. `src/components/cadastral/subdivision/utils/convertZoneType.ts`
Branche `toType === 'road'` lorsque la source est un polygone (lot ou espace commun) et qu'un `metricFrame` est fourni :
- Calculer `areaM2 = polygonAreaSqmAccurate(polygon, frame)` et `lengthM = edgeLengthM(centerline[0], centerline[1], frame)`.
- `widthM = clamp(round(areaM2 / lengthM, 0.5), 2, 200)` (relever le plafond actuel de 30 m pour ne pas tronquer les grandes zones ; la précision largeur×longueur ≈ aire reste vraie).
- Affecter `footprint: polygon` sur l'objet `SubdivisionRoad` retourné.
- Pour une source `road` (road→road, rare) : ne pas toucher au footprint existant.

### 3. `src/components/cadastral/subdivision/LotCanvas.tsx`
- Dans la branche de rendu des voies internes (après le bloc `isExternal`, autour des lignes 890-960), avant le calcul rectangle TL/TR/BR/BL : si `road.footprint && road.footprint.length >= 3`, rendre un `<polygon>` à partir de `road.footprint.map(toScreen)` avec les mêmes couleurs/sélection que le rectangle actuel (fill, stroke, sélection), et placer le label au centroïde de ce polygone. Conserver la `<polyline>` invisible sur `path` comme zone de clic et les poignées d'extrémités/largeur.
- Quand l'utilisateur **édite manuellement** la voie (drag d'une extrémité de `path` ou drag de la poignée de largeur), appeler `onUpdateRoad(id, { ..., footprint: undefined })` pour basculer au rendu rectangle classique (sinon le footprint figerait l'affichage malgré les changements). Idem dans `handleConvertEdgeToRoad` et toute opération qui réécrit `path` ou `widthM`.

### 4. Pas de changement
- `subdivisionFees.ts` & `infrastructureFromRoads.ts` : continuent d'utiliser `lengthM × widthM` ; comme widthM est désormais inférée pour que le produit colle à l'aire réelle, les frais restent cohérents avec la zone affichée.
- `polygonOps.lotTouchesRoad`, `subdivisionValidation`, `SubdivisionMiniMap`, backend, DB : inchangés.

## Hors périmètre
- Pas de modification du formulaire d'édition des voies (`RoadsListPanel`), des frais admin, du schéma DB, ni des voies bordantes externes.
- Pas de refonte du modèle voie en pur polygone (rétro-compatibilité préservée via `path` + `widthM`).

## Fichiers touchés
- `src/components/cadastral/subdivision/types.ts`
- `src/components/cadastral/subdivision/utils/convertZoneType.ts`
- `src/components/cadastral/subdivision/LotCanvas.tsx`
- `src/components/cadastral/subdivision/steps/StepLotDesigner.tsx` (purge `footprint` lors des éditions manuelles de path/largeur)
