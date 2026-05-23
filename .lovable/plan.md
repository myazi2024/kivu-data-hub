## Objectif
Appliquer la même correction de calcul de surface (basée sur la géométrie GPS) à l'affichage de la parcelle sélectionnée sur la Carte Cadastrale, juste au-dessus des boutons "Données" et "Actions".

## Problème
Dans `src/pages/CadastralMap.tsx` ligne 607, le panneau de parcelle sélectionnée affiche :
```tsx
{selectedParcel.area_sqm?.toLocaleString()} m²
```
Cette valeur vient directement de `cadastral_parcels.area_sqm` (BD), incohérente avec la géométrie GPS (ex. triangle 788/387/802 → BD ≈ 2 887 m², géométrie ≈ 149 000 m²).

## Solution

### 1. Extraire un helper partagé
Créer `src/utils/parcelGeometricArea.ts` exportant :
```ts
export function computeEffectiveAreaSqm(
  gpsCoords: { lat: number; lng: number }[] | null | undefined,
  dbAreaSqm: number,
): number
```
Réutilise `buildMetricFrame`, `gpsToNormalized`, `polygonAreaSqmAccurate` de `subdivision/utils/metrics.ts` / `geometry.ts`. Si ≥3 points GPS et aire calculée > 0 → renvoie l'aire géométrique arrondie. Sinon → `dbAreaSqm`.

### 2. Refactor `useSubdivisionForm.ts`
Remplacer le `computeEffectiveArea` local par l'import du helper partagé (pas de changement de comportement).

### 3. Patcher `src/pages/CadastralMap.tsx`
- Calculer `selectedParcelEffectiveArea` via `useMemo` à partir de `selectedParcel.gps_coordinates` et `selectedParcel.area_sqm`.
- Ligne 607 : afficher `selectedParcelEffectiveArea.toLocaleString()` au lieu de `selectedParcel.area_sqm`.

## Hors scope
- Pas de modification BD (`cadastral_parcels.area_sqm` reste tel quel).
- Pas de modification des autres écrans qui affichent `area_sqm` (à traiter à la demande).
- Pas de logique métier serveur (frais, calculs admin) impactée.
