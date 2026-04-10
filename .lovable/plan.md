

# Supprimer les visuels construction/usage de l'onglet Contributions

## Constat

L'onglet **Contributions** contient 3 graphiques qui concernent la parcelle et non la contribution :
- **Usage déclaré** (`usage`)
- **Type construction** (`construction-type`)
- **Catégorie de bien** (`property-category`)

Ces 3 visuels existent **déjà** dans l'onglet **Parcelles** (`ParcelsWithTitleBlock`). Les autres mentionnés (Nature construction, Matériaux, Standing) sont déjà exclusivement dans Parcelles — pas de doublon.

## Modifications

### 1. `src/components/visualizations/blocks/ContributionsBlock.tsx`
- Supprimer les lignes de calcul : `byDeclaredUsage`, `byConstructionType`, `byPropertyCategory` et la normalisation associée (`normalizeConstructionType`, `normalizeDeclaredUsage`)
- Supprimer les 3 blocs `ChartCard` correspondants (lignes 109-114)
- Renuméroter les `display_order` restants dans le JSX

### 2. `src/hooks/useAnalyticsChartsConfig.ts`
- Supprimer les 3 entrées du registre `contributions` : `usage` (order 5), `construction-type` (order 6), `property-category` (order 4)
- Renuméroter les `display_order` des entrées restantes

### 3. `src/config/crossVariables.ts`
- Supprimer les 3 entrées du bloc `contributions` : `usage`, `construction-type`, `property-category`

## Impact

- 3 fichiers modifiés
- ~15 lignes supprimées
- Aucune migration SQL
- L'admin Config graphiques reflétera automatiquement la suppression

