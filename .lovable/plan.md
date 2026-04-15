

# Synchroniser le clic territoire (carte) → filtre analytics + zoom carte

## Problème

1. **Carte ne zoome pas** : En mode `showAll` (Rurale, pas de province), cliquer un territoire appelle `setSelectedTerritoire(name)` mais la condition de rendu exige `selectedTerritoire && selectedProvince` — la province n'est jamais résolue.
2. **Filtre analytics ne s'ajuste pas** : Le filtre utilise son propre `filter.territoire` interne. Il n'y a aucun mécanisme pour que le clic carte mette à jour ce filtre.

## Modifications

### 1. `src/lib/geographicData.ts` — Ajouter `getProvinceForTerritoire`

Fonction de reverse-lookup qui parcourt `geographicData` pour trouver la province contenant un territoire donné.

```ts
export const getProvinceForTerritoire = (territoire: string): string | undefined => {
  for (const [province, data] of Object.entries(geographicData)) {
    if (data.territoires[territoire]) return province;
  }
  return undefined;
};
```

### 2. `src/components/DRCInteractiveMap.tsx` — Résoudre province au clic territoire

Remplacer `onTerritoireSelect={setSelectedTerritoire}` dans le bloc `showAll` par un handler qui :
- Résout la province via `getProvinceForTerritoire(name)`
- Appelle `setSelectedProvince(provinceData)` avec la province trouvée dans `provincesData`
- Appelle `setSelectedTerritoire(name)`
- Met `selectedSectionType` à `'rurale'`

Ainsi la condition `selectedTerritoire && selectedProvince` est satisfaite → la carte zoome.

### 3. `src/components/DRCInteractiveMap.tsx` — Propager vers le filtre analytics

Ajouter un nouveau callback `onFilterSync` passé à `ProvinceDataVisualization`, qui permet de pousser des changements de filtre (province, sectionType, territoire) depuis la carte vers le filtre.

Concrètement : créer un nouveau contexte `FilterSyncContext` dans AnalyticsFilters, et l'utiliser dans le handler de clic territoire pour mettre à jour `filter.province`, `filter.sectionType = 'rurale'`, et `filter.territoire`.

### 4. `src/components/visualizations/filters/AnalyticsFilters.tsx` — Écouter les changements externes

Ajouter un `useEffect` qui surveille les valeurs des contextes `MapProvinceContext`, `TerritoireFilterContext`, et `SectionTypeContext`. Quand ces valeurs changent (provenant de la carte), synchroniser `filter` via `onChange(...)`.

```ts
const mapProvince = useContext(MapProvinceContext);
const mapTerritoire = useContext(TerritoireFilterContext);
const mapSectionType = useContext(SectionTypeContext);

useEffect(() => {
  // Sync filter when map values differ from current filter
  if (mapTerritoire && mapTerritoire !== filter.territoire) {
    onChange({ ...filter, province: mapProvince || filter.province, sectionType: 'rurale', territoire: mapTerritoire });
  }
}, [mapTerritoire, mapProvince, mapSectionType]);
```

### 5. `src/components/DRCTerritoiresMap.tsx` — Aucune modification

Le composant appelle déjà `onTerritoireSelect` au clic — c'est suffisant.

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/lib/geographicData.ts` | +`getProvinceForTerritoire()` |
| `src/components/DRCInteractiveMap.tsx` | +handler clic territoire avec résolution province |
| `src/components/visualizations/filters/AnalyticsFilters.tsx` | +`useEffect` sync depuis contextes carte |

## Résultat attendu

Cliquer un territoire sur la carte en mode Rurale/showAll :
1. La carte zoome sur le territoire (province auto-résolue)
2. Le filtre analytique s'ajuste automatiquement (province + Rurale + territoire sélectionné)

