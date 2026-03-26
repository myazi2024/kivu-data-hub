

# Supprimer l'onglet Analytics "Conflits limites" (redondant avec "Litige foncier")

## Contexte

L'onglet "Conflits limites" (`boundary`) dans les analytics affiche des donnees de la table `cadastral_boundary_conflicts`. Or, l'onglet "Litige foncier" (`disputes`) couvre deja les conflits de delimitation via la table `cadastral_land_disputes` (qui inclut `dispute_nature`, `dispute_type`, etc.). L'onglet est donc redondant.

## Modifications

### 1. Supprimer le bloc analytics BoundaryConflictsBlock

- Supprimer `src/components/visualizations/blocks/BoundaryConflictsBlock.tsx`
- Retirer l'import et l'entree `'boundary'` de `ICON_MAP` et `BLOCK_MAP` dans `ProvinceDataVisualization.tsx`

### 2. Supprimer le registre boundary du config

Dans `useAnalyticsChartsConfig.ts`, supprimer l'entree `'boundary'` du `ANALYTICS_TABS_REGISTRY`.

### 3. Supprimer la collecte de donnees boundaryConflicts

Dans `useLandDataAnalytics.tsx` :
- Retirer le `fetchAll('cadastral_boundary_conflicts', ...)` du `Promise.all`
- Retirer `boundaryConflicts` du type `LandAnalyticsData` et de l'objet retourne

### 4. Nettoyage test-mode

Dans les fichiers test-mode :
- `testDataGenerators.ts` : supprimer `generateBoundaryConflicts`
- `useTestDataActions.ts` : retirer l'appel a `generateBoundaryConflicts`
- `useTestDataStats.ts` : retirer le compteur `boundaryConflicts`
- `types.ts` : retirer `boundaryConflicts` du type et des defaults
- `TestDataStatsCard.tsx` : retirer la ligne "Conflits limites"

### 5. Admin sidebar (optionnel)

L'entree admin "Conflits Limites" (`boundary-conflicts`) dans `AdminSidebar.tsx` gere la table `cadastral_boundary_conflicts` independamment. Elle peut etre conservee si l'admin doit encore gerer les anciens enregistrements, ou supprimee si la table n'est plus alimentee. Je la supprimerai avec son composant `AdminBoundaryConflicts.tsx` et son routage dans `Admin.tsx`.

## Fichiers impactes

| Fichier | Action |
|---------|--------|
| `src/components/visualizations/blocks/BoundaryConflictsBlock.tsx` | Supprimer |
| `src/components/visualizations/ProvinceDataVisualization.tsx` | Retirer entree `boundary` |
| `src/hooks/useAnalyticsChartsConfig.ts` | Supprimer registre `boundary` |
| `src/hooks/useLandDataAnalytics.tsx` | Retirer fetch + type `boundaryConflicts` |
| `src/components/admin/test-mode/testDataGenerators.ts` | Supprimer generateur |
| `src/components/admin/test-mode/useTestDataActions.ts` | Retirer appel |
| `src/components/admin/test-mode/useTestDataStats.ts` | Retirer compteur |
| `src/components/admin/test-mode/types.ts` | Retirer champ |
| `src/components/admin/test-mode/TestDataStatsCard.tsx` | Retirer ligne |
| `src/components/admin/AdminBoundaryConflicts.tsx` | Supprimer |
| `src/components/admin/AdminSidebar.tsx` | Retirer entree |
| `src/pages/Admin.tsx` | Retirer import + case |

12 fichiers modifies/supprimes.

