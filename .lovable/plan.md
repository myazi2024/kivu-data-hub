

# Deplacer 5 visuels de l'onglet Titre foncier vers Parcelles

## Constat

Les graphiques suivants existent dans **les deux onglets** (titre-foncier ET parcelles) :
- Type de construction (`construction-type`)
- Nature de construction (`construction-nature`)
- Materiaux utilises (`construction-materials`)
- Standing (`standing`)
- Usage declare (`declared-usage` dans titre-foncier, `usage` dans parcelles)

Ces donnees concernent la parcelle, pas le titre foncier. L'onglet Parcelles les a deja. Il faut donc **supprimer ces 5 graphiques de l'onglet Titre foncier** pour eliminer la redondance.

## Modifications

### 1. `src/components/visualizations/blocks/TitleRequestsBlock.tsx`

- Supprimer les `useMemo` pour `byDeclaredUsage`, `byConstructionType`, `byConstructionNature`, `byConstructionMaterials`, `byStanding` (lignes 49-54)
- Supprimer la normalisation `declared_usage` et `construction_type` dans `normalized` (lignes 40-44)
- Supprimer les 5 rendus JSX : `declared-usage` (ligne 144), `construction-type` (156-157), `construction-nature` (158-159), `construction-materials` (160-161), `standing` (162-163)
- Nettoyer les imports inutilises (`normalizeConstructionType`, `normalizeDeclaredUsage`, `Building`)

### 2. `src/hooks/useAnalyticsChartsConfig.ts`

- Supprimer les 5 entrees du registre `title-requests` : `declared-usage` (display_order 5), `construction-type` (11), `construction-nature` (12), `construction-materials` (13), `standing` (14)
- Reajuster les `display_order` des graphiques restants pour combler les trous

### 3. `src/config/crossVariables.ts`

- Supprimer les 5 entrees de `title-requests` : `declared-usage`, `construction-type`, `construction-nature`, `construction-materials`, `standing`

## Fichiers concernes

| Fichier | Action |
|---------|--------|
| `TitleRequestsBlock.tsx` | Supprimer 5 graphiques et leurs donnees |
| `useAnalyticsChartsConfig.ts` | Supprimer 5 entrees du registre title-requests |
| `crossVariables.ts` | Supprimer 5 entrees de croisement title-requests |

**Impact** : ~30 lignes supprimees dans 3 fichiers. Aucune migration. L'onglet Parcelles reste inchange (il a deja tous ces visuels).

