

## Plan — Élimination des 35 `no-explicit-any` (lignes 327-562 de `DRCInteractiveMap.tsx`)

Les warnings sont concentrés dans **deux blocs jumeaux** qui « slicent » l'objet `analytics: LandAnalyticsData` selon un prédicat géographique :
- Lignes ~325-343 : `buildEntityColorFn` (slicer pour color metric)
- Lignes ~544-563 : Légende contextuelle (sliceArr pour `MapScopeLegend`)

### 1. Cause racine

L'objet `analytics` est déjà **fortement typé** (`LandAnalyticsData` dans `useLandDataAnalytics.tsx`), donc la quasi-totalité des `as any` sont **inutiles** :
- `analytics.parcels as any` → cast superflu, déjà `ParcelRecord[]`
- `(analytics as any).subdivisionRequests` → propriété qui existe déjà sur le type
- `(r: any) =>` dans le `.map` → peut être inféré via génériques
- `pred as any` / `predicate as any` → contournement parce que `buildScopePredicate` retourne `(record: any) => boolean`

### 2. Stratégie de correction

#### A. Extraire un helper générique typé (factorise les 2 blocs jumeaux)

Créer dans `src/components/map/meta/mapMeta.ts` :

```ts
export type GeoScopedRecord = { 
  province?: string | null; ville?: string | null; commune?: string | null;
  quartier?: string | null; territoire?: string | null;
};

export function sliceAnalyticsByPredicate(
  analytics: LandAnalyticsData,
  predicate: (r: GeoScopedRecord) => boolean,
  overrideProvince?: string,
): LandAnalyticsData {
  const slice = <T extends GeoScopedRecord>(arr: T[] | undefined): T[] =>
    (arr || []).filter(predicate).map((r) => 
      overrideProvince ? { ...r, province: overrideProvince } : r
    );
  return {
    ...analytics,
    parcels: slice(analytics.parcels),
    contributions: slice(analytics.contributions),
    titleRequests: slice(analytics.titleRequests),
    disputes: slice(analytics.disputes),
    mortgages: slice(analytics.mortgages),
    mutationRequests: slice(analytics.mutationRequests),
    expertiseRequests: slice(analytics.expertiseRequests),
    subdivisionRequests: slice(analytics.subdivisionRequests),
    ownershipHistory: slice(analytics.ownershipHistory),
    certificates: slice(analytics.certificates),
    invoices: slice(analytics.invoices),
    buildingPermits: slice(analytics.buildingPermits),
    taxHistory: slice(analytics.taxHistory),
  };
}
```

#### B. Resserrer la signature de `buildScopePredicate`

Dans `mapMeta.ts`, remplacer `(record: any) => boolean` par `(r: GeoScopedRecord) => boolean`. Tous les champs accédés (`r.province`, `r.ville`, etc.) sont déjà couverts par `GeoScopedRecord`.

#### C. Réécriture des deux sites d'appel

**Bloc 1 (`buildEntityColorFn`, ~325-343)** : 18 lignes → 4 lignes
```ts
return (entityName: string): string | undefined => {
  const pred = matchPredicate(entityName);
  const sliced = sliceAnalyticsByPredicate(analytics, pred, '__entity__');
  const v = activeProfile.metric({ analytics: sliced, provinceName: '__entity__' });
  // ...
};
```
Note : `matchPredicate` retourne aujourd'hui `(r: any) => boolean` — typer en `(r: GeoScopedRecord) => boolean`.

**Bloc 2 (Légende contextuelle, ~544-563)** : ~18 lignes → 2 lignes
```ts
const predicate = buildScopePredicate(selectedProvince.name, selectedVille, selectedCommune, selectedQuartier, selectedTerritoire);
const scopedAnalytics = sliceAnalyticsByPredicate(analytics, predicate, selectedProvince.name);
```

#### D. Résiduels hors slicers (3 cas)

- **L. 65** : `useState<any>(null)` pour `mapInstance` → typer `Map | null` (importer le type Leaflet) ou `unknown`.
- **L. 131, 135** : `(el as any).__teaserTimers` → définir `interface TeaserElement extends HTMLDivElement { __teaserTimers?: number[] }` et caster proprement, OU déplacer les timers dans un `useRef<number[]>([])`.
- **L. 279** : `html2canvas(...) as any` (option `borderRadius`) → retirer le cast et omettre l'option non-typée (ou utiliser `// eslint-disable-next-line` ciblé si l'option est nécessaire).

### 3. Bénéfices

| Avant | Après |
|---|---|
| 35 warnings ESLint | 0 warning |
| ~36 lignes dupliquées | 1 helper réutilisable |
| Aucune sécurité de type sur les champs analytics slicés | Inférence complète via génériques |
| `r.foo` accessible sur n'importe quoi | Accès limité aux champs `GeoScopedRecord` |

### 4. Fichiers impactés

| Fichier | Action |
|---|---|
| `src/components/map/meta/mapMeta.ts` | Ajouter `GeoScopedRecord` + helper `sliceAnalyticsByPredicate` ; resserrer `buildScopePredicate` |
| `src/components/DRCInteractiveMap.tsx` | Remplacer 2 blocs slicer par appels au helper ; corriger 3 résiduels (mapInstance, teaserTimers, html2canvas) |

### 5. Critères de validation

1. `npx eslint src/components/DRCInteractiveMap.tsx` → 0 warning `no-explicit-any`.
2. `npx tsc --noEmit` → 0 erreur (typage strict respecté).
3. Comportements UI identiques : couleurs choroplèthe par commune/quartier/territoire, légende contextuelle, swipe pager, screenshot html2canvas, teaser au mount.
4. Aucun changement runtime : pure refactor de typage.

