# Surface parcelle-mère = géométrie GPS, retrait du périmètre

## Cause

- La surface de référence (`parentParcel.areaSqm`) provient de la DB (`area_sqm`). Les côtés affichés sont calculés depuis les GPS via `edgeLengthM`. Pour des polygones obliques, `surface DB` et `largeur×hauteur du bbox GPS` peuvent diverger → incohérence visuelle entre côtés et surface.
- Le périmètre affiché par lot n'apporte pas d'info utile et alourdit l'UI.

## Correctif (UI/présentation uniquement, aucune modif DB ni frais)

### 1. Surface géométrique de la parcelle mère

`src/components/cadastral/subdivision/steps/StepLotDesigner.tsx`

- Calculer `parentAreaGeomSqm = polygonAreaSqmAccurate(parentVertices, metricFrame)` (mémo). C'est exactement la même formule que celle utilisée pour les longueurs des côtés (`edgeLengthM` sur la même `metricFrame`) → cohérence parfaite : `polygonAreaSqmAccurate ≡ sxM × syM × polygonArea(normalisé)`.
- Utiliser `parentAreaGeomSqm` à la place de `parentParcel.areaSqm` pour :
  - le prop `parentAreaSqm` passé à `<LotCanvas/>` (ligne 959),
  - le `parentArea` utilisé dans `coveragePercent` (ligne 822-823) et le message de validation,
  - le `parentAreaSqm` passé à `useCanvasDrag` indirectement (déjà dérivé du même prop),
  - le `computeArea`/`computePerim` (lignes 152-159) → remplacer `parentParcel.areaSqm` par `parentAreaGeomSqm` dans `polygonAreaSqmRelative`. Avec cette substitution, `polygonAreaSqmRelative` retourne strictement la même valeur que `polygonAreaSqmAccurate` → les surfaces des lots, leur somme, et la surface mère sont toutes dans le même référentiel GPS.
- Conserver `parentParcel.areaSqm` (DB) intact pour : les frais (serveur, `_shared/subdivisionFees.ts`), la persistance, l'affichage hors designer. Le designer travaille uniquement avec la version géométrique pour la cohérence visuelle.
- Fallback : si `metricFrame.hasGps === false` (pas de GPS), garder `parentParcel.areaSqm` (comportement actuel).

### 2. Suppression du périmètre dans l'UI du designer

- `src/components/cadastral/subdivision/steps/StepLotDesigner.tsx` lignes 1109-1118 : retirer le bloc « Périmètre » ; ne garder que « Surface » (passer la grille en `grid-cols-1` ou laisser la surface seule).
- `src/components/cadastral/subdivision/LotCanvas.tsx` ligne 1153 : remplacer `{formatSqm(lot.areaSqm)} · P {formatMeters(lot.perimeterM)}` par `{formatSqm(lot.areaSqm)}`.
- Le champ `perimeterM` reste calculé et stocké (utilisé en DB / rapports) — seul l'affichage est retiré.

## Hors-scope

- Aucune modification de `metrics.ts`, `geometry.ts`, `useCanvasDrag.ts`, des frais serveur, ni du schéma DB.
- Aucune modification du `area_sqm` persisté.
- Pas de changement des étiquettes de côtés (déjà GPS-cohérentes depuis l'étape précédente).

## Vérification

1. Onglet Lots : la surface affichée pour la parcelle mère (couverture %, validation) correspond à `Σ edgeLengthM` × cohérence géométrique des côtés visibles.
2. Le message « superficie totale dépasse parcelle mère » n'apparaît plus dès que les lots restent dans le contour.
3. Plus de mention « Périmètre » ni de suffixe `· P …` dans les labels de lots.
4. La surface mère stockée en DB et les frais serveur restent inchangés.
