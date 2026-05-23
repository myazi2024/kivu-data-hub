## Cause racine

Dans l'onglet « Lots » du concepteur, chaque côté de la parcelle mère reçoit **deux étiquettes superposées** par deux blocs SVG distincts :

1. **Bloc « Parent parcel side measurements »** (`LotCanvas.tsx` lignes 776-821) — utilise `parentSides[i].length` (longueur **saisie par l'utilisateur** au moment de l'enregistrement de la parcelle, ex. 393 m, 383 m, 46 m, 31 m). Fallback : `edgeLengthM` calculé à partir des coordonnées GPS.
2. **Bloc dimensions par lot** (`LotCanvas.tsx` lignes 1287-1304) — itère sur **tous** les lots, y compris le lot virtuel `isParentBoundary` (qui matérialise le contour de la parcelle mère), et affiche pour chaque arête `getDimensionLabel = formatMeters(edgeLengthM(p1, p2, metricFrame))` (haversine sur la frame GPS, ex. 20 m, 46 m, 447 m, 360 m).

Les deux valeurs divergent car la longueur **déclarée** dans `parcel_sides` (saisie manuelle) et la longueur **géométrique** issue des GPS ne correspondent pas (ordre des sommets différent, valeurs manuelles approximatives, ou GPS de test pour une parcelle réelle). La surface (1 323 m²), elle, est calculée une seule fois (via `polygonAreaSqmRelative` → cohérente avec `parentParcel.areaSqm`).

## Correctif

Objectif : **une seule étiquette par côté**, alignée sur la même source géométrique que celle qui pilote l'aire et le découpage des lots (sinon les calculs du plan de lotissement deviennent incohérents avec les longueurs affichées).

### 1. `src/components/cadastral/subdivision/LotCanvas.tsx` — bloc parent (lignes 776-821)

Toujours afficher la longueur **calculée géométriquement** depuis les vertices GPS (`edgeLengthM(v, next, metricFrame)`) — c'est la seule valeur cohérente avec :
- le polygone réel rendu à l'écran,
- la surface de la parcelle (via `polygonArea(parentVertices)`),
- les longueurs des arêtes des lots (mêmes formules `edgeLengthM`),
- le périmètre (`polygonPerimeterM`).

Conserver l'orientation issue de `parentSides[i].orientation` quand elle existe (champ purement descriptif, sans risque d'incohérence numérique).

Remplacer le calcul de `label` :
```ts
const label = formatMeters(edgeLengthM(v, next, metricFrame));
```
Supprimer le fallback `parentSides[i].length`.

### 2. `LotCanvas.tsx` — bloc dimensions par lot (lignes 1287-1304)

Sauter le rendu des étiquettes pour le lot `isParentBoundary` afin d'éliminer la duplication :
```ts
{showDimensions && !lot.isParentBoundary && lot.vertices.map(...)}
```
Les côtés du contour parent restent étiquetés une seule fois par le bloc 1, avec la même formule que les lots enfants → cohérence parfaite.

### 3. Vérification des formules (pas de changement, juste contrôle)

- `edgeLengthM(a, b, frame) = √((Δx·sxM)² + (Δy·syM)²)` avec `sxM`, `syM` issus de `buildMetricFrame` (haversine sur les bornes GPS de la parcelle mère, latitude moyenne pour `sxM`). Formule correcte pour des distances locales (< quelques km).
- `polygonAreaSqmRelative(poly, parentNormArea, parentAreaSqm) = polygonArea(poly)/parentNormArea × parentAreaSqm` garantit `Σ(lots) ≤ parentAreaSqm` (déjà en place).
- `polygonPerimeterM = Σ edgeLengthM` (cohérent).

Tous les côtés affichés et la surface utiliseront donc le même référentiel GPS, et les frais/validations du plan de lotissement (qui consomment `areaSqm` et `perimeterM`) resteront alignés sur ce qui est visible.

## Hors-scope

- Aucune modification de la DB (`parcel_sides` reste tel quel, simplement non utilisé pour l'étiquetage longueur dans le designer).
- Aucune modification de `metrics.ts`, `geometry.ts`, `useCanvasDrag.ts`, ni du calcul des frais.
- Pas de changement du rendu de la surface (déjà unique).

## Vérification visuelle

1. Ouvrir une demande de lotissement → onglet Lots.
2. Chaque côté de la parcelle mère affiche **une seule valeur** (GPS-cohérente) + orientation si renseignée.
3. Découper en plusieurs lots : la somme des longueurs des arêtes coïncide bien avec le périmètre du parent ; aucune étiquette dupliquée.
4. La surface (1 323 m²) reste inchangée.
