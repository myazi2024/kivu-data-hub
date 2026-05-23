## Cause racine

Le concepteur calcule deux superficies avec deux référentiels incompatibles :

- **Parcelle mère** : `parentParcel.areaSqm` vient de la base (`area_sqm` officiel), p.ex. 3 354 m².
- **Lots issus du découpage** : `computeArea(verts)` appelle `polygonAreaSqmAccurate(verts, metricFrame)` = `aire_normalisée(poly) × sxM × syM`, où `sxM × syM` est l'aire de la **boîte englobante GPS** en m² (haversine sur la lat/lng min-max).

Quand la parcelle mère n'est pas alignée sur sa boîte englobante (parcelle oblique, en L, allongée…), `bbox_m² × normPolyArea(parent) ≠ area_sqm_DB`. Le `lot 1` initial est créé avec `Math.round(parentParcel.areaSqm)` (DB), mais dès qu'on splitte/coupe, les nouveaux lots utilisent l'échelle bbox. Résultat : la **somme des lots ≈ bbox × normParentArea**, qui peut être 30× plus grande que `area_sqm_DB` → alerte « 110 159 m² dépasse 3 354 m² ».

`useCanvasDrag.computeMetrics` souffre du même biais sur chaque drag de sommet/arête.

## Correctif

Réintroduire le scaling **proportionnel à la parcelle mère** pour les aires (l'ancien code de `geometry.ts` lignes 207/213/471 le faisait déjà : `(normArea / parentNormArea) × parentAreaSqm`). Les longueurs/périmètres continuent d'utiliser la frame GPS anisotrope, qui reste correcte pour les distances.

### 1. `src/components/cadastral/subdivision/utils/metrics.ts`

Ajouter une variante d'aire pilotée par la parcelle mère :

```ts
export function polygonAreaSqmRelative(
  poly: Point2D[],
  parentNormArea: number,
  parentAreaSqm: number,
): number {
  if (poly.length < 3 || parentNormArea <= 0 || parentAreaSqm <= 0) return 0;
  return (polygonArea(poly) / parentNormArea) * parentAreaSqm;
}
```

### 2. `StepLotDesigner.tsx`

- Mémoriser `parentNormArea = polygonArea(parentVertices)` (via `useMemo`, fallback 0).
- Remplacer `computeArea` :
  ```ts
  const computeArea = useCallback(
    (poly: Point2D[]) => Math.max(1, Math.round(
      parentNormArea > 0 && parentParcel?.areaSqm
        ? polygonAreaSqmRelative(poly, parentNormArea, parentParcel.areaSqm)
        : polygonAreaSqmAccurate(poly, metricFrame)
    )),
    [metricFrame, parentNormArea, parentParcel?.areaSqm],
  );
  ```
- `computePerim` inchangé (longueurs GPS toujours correctes).

### 3. `src/components/cadastral/subdivision/hooks/useCanvasDrag.ts`

- Étendre la signature pour recevoir `parentNormArea` et `parentAreaSqm` (optionnels).
- Dans `computeMetrics`, utiliser `polygonAreaSqmRelative` quand les deux valeurs parent sont fournies, sinon retomber sur `polygonAreaSqmAccurate`.
- Mettre à jour l'appelant (`LotCanvas.tsx`) pour passer ces deux props (déjà disponibles via `parentVertices` + `parentParcel`).

### 4. Vérification

- Ouvrir une demande de lotissement, entrer dans l'onglet Lots, découper la parcelle mère : la somme des lots doit rester ≤ `parentParcel.areaSqm` + 1 %. L'alerte « dépasse celle de la parcelle mère » ne doit plus apparaître pour un découpage interne valide.
- Le badge « ✅ Plan conforme » doit apparaître quand il n'y a ni erreur ni warning.
- Le périmètre et les largeurs de voies (déjà calculés via `polygonPerimeterM`/`edgeLengthM`) restent inchangés.

## Hors-scope

- Pas de changement de schéma DB ni d'édition des données existantes.
- Pas de modification des frais de lotissement (`subdivisionFees.ts` reçoit déjà `areaSqm` cohérent).
- Pas de refonte de `polygonAreaSqmAccurate` : conservée pour les cas sans parent (ex. mini-map).
