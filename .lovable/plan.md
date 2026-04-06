

# Synchroniser les filtres Ville/Commune/Quartier de la carte vers les blocs Analytics

## Probleme

Quand on selectionne une ville, commune ou quartier sur la carte, la carte change de niveau (provinces → communes → quartiers) mais les 14 blocs analytiques en dessous ne filtrent que par **province**. Les contextes `VilleFilterContext`, `CommuneFilterContext` et `QuartierFilterContext` sont fournis par `ProvinceDataVisualization` mais **aucun bloc ne les consomme**.

## Correction

### Dans chacun des 14 blocs (`src/components/visualizations/blocks/*.tsx`)

Modifier le `useEffect` existant qui synchronise `mapProvince` pour aussi synchroniser `ville`, `commune` et `quartier` depuis leurs contextes respectifs :

```typescript
// Avant (identique dans les 14 blocs)
const mapProvince = useContext(MapProvinceContext);
useEffect(() => { 
  setFilter(f => ({ ...f, province: mapProvince || undefined, ville: undefined })); 
}, [mapProvince]);

// Apres
const mapProvince = useContext(MapProvinceContext);
const mapVille = useContext(VilleFilterContext);
const mapCommune = useContext(CommuneFilterContext);
const mapQuartier = useContext(QuartierFilterContext);
useEffect(() => { 
  setFilter(f => ({ 
    ...f, 
    province: mapProvince || undefined, 
    ville: mapVille || undefined, 
    commune: mapCommune || undefined, 
    quartier: mapQuartier || undefined,
  })); 
}, [mapProvince, mapVille, mapCommune, mapQuartier]);
```

Chaque bloc devra aussi importer `VilleFilterContext`, `CommuneFilterContext` et `QuartierFilterContext` depuis `AnalyticsFilters`.

### Fichiers modifies (14 blocs)
- `TitleRequestsBlock.tsx`
- `ParcelsWithTitleBlock.tsx`
- `ContributionsBlock.tsx`
- `ExpertiseBlock.tsx`
- `MutationBlock.tsx`
- `SubdivisionBlock.tsx`
- `DisputesBlock.tsx`
- `MortgagesBlock.tsx`
- `BuildingPermitsBlock.tsx`
- `TaxesBlock.tsx`
- `OwnershipHistoryBlock.tsx`
- `FraudAttemptsBlock.tsx`
- `CertificatesBlock.tsx`
- `InvoicesBlock.tsx`

