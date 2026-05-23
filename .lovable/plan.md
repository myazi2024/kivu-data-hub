# Surface parcelle-mère cohérente dès le chargement (onglet Parcelle)

## Problème

Dans `StepParentParcel.tsx`, le champ « Superficie » du bloc *Parcelle mère (chargée automatiquement)* affiche `parentParcel.areaSqm`, qui provient directement de `cadastral_parcels.area_sqm` (DB). Or cette valeur DB est incohérente avec les côtés GPS affichés ailleurs (cas du triangle 788/387/802 → DB ≈ 2 887 m², géométrie réelle ≈ 149 000 m²).

La correction précédente avait été appliquée dans `StepLotDesigner.tsx` et dans `createInitialLot` (lot parent-boundary), mais **pas à la source** chargée dans `useSubdivisionForm.loadParcelData()`. Résultat : l'onglet *Parcelle* affiche encore la valeur DB brute.

## Correctif (source unique)

Dans `src/components/cadastral/subdivision/hooks/useSubdivisionForm.ts` → `loadParcelData()` (lignes 261-308), calculer la superficie géométrique à partir des coordonnées GPS dès la construction de l'objet `ParentParcelInfo`, puis utiliser cette valeur comme `areaSqm`. Fallback DB conservé si moins de 3 points GPS exploitables.

### Helper local

Ajouter, juste avant `setParentParcel(...)` dans chacune des deux branches (lignes 266-282 et 285-308) :

```ts
const dbAreaSqm = (parcelData?.area_sqm /* ou parcel.area_sqm */) || 0;
let effectiveAreaSqm = dbAreaSqm;
if (gpsCoords.length >= 3) {
  const frame = buildMetricFrame(gpsCoords, dbAreaSqm || 1);
  const normVerts = gpsCoords.map((g) => gpsToNormalized(g, gpsCoords));
  const geomArea = polygonAreaSqmAccurate(normVerts, frame);
  if (isFinite(geomArea) && geomArea > 0) {
    effectiveAreaSqm = Math.round(geomArea);
  }
}
// ...
areaSqm: effectiveAreaSqm,
```

`buildMetricFrame`, `polygonAreaSqmAccurate` sont déjà importés (ligne 11). `gpsToNormalized` est déjà importé (ligne 9).

### Effets de bord (souhaités)

- L'onglet *Parcelle* (bloc Parcelle-mère) affiche désormais la superficie géométrique, cohérente avec les côtés GPS.
- Le designer de lots, la validation et le snapshot consomment la même valeur → fin de toute incohérence visuelle.
- `createInitialLot` peut conserver son recalcul actuel (idempotent : même formule, même valeur), ou être simplifié dans une étape ultérieure.

### Hors-scope

- **Aucune écriture en base** : `cadastral_parcels.area_sqm` reste inchangé.
- Les frais serveur (`_shared/subdivisionFees.ts`) qui relisent la DB ne sont pas modifiés.
- Pas de migration ni de recalcul rétroactif.
- Si la parcelle n'a pas de GPS exploitable, comportement actuel conservé (valeur DB).

## Vérification

1. Ouvrir la parcelle triangulaire 788/387/802 m → onglet *Parcelle* doit afficher ≈ 14,9 ha (149 000 m²) au lieu de 2 887 m².
2. Étape *Designer* : la même valeur apparaît (plus de doubles sources).
3. Une parcelle sans coordonnées GPS continue d'afficher la valeur DB sans erreur.
