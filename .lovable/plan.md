

## Alignement de la config admin Analytics avec les nouveaux visuels Construction

### Constat
Les nouveaux items ajoutés à `ParcelsWithTitleBlock.tsx` (`kpi-avg-capacity`, `hosting-capacity`, `occupancy-pressure`) doivent être déclarés dans :
1. `ANALYTICS_TABS_REGISTRY` (config par défaut chargée par `useInitializedConfig`).
2. `CROSS_VARIABLE_REGISTRY` (variables croisables pour les 2 charts).
3. La table BD `analytics_charts_config` via le mécanisme `syncRegistryToDb` (admin → bouton « Synchroniser »).

Sans cela, l'admin Analytics ne voit pas ces items et ne peut ni masquer/réordonner ni configurer les croisements.

### Cible
- `src/config/analyticsTabsRegistry.ts` (tab `built` / `construction`)
- `src/config/crossVariables.ts` (tab idem)
- Aucune migration BD : la sync se fait via l'UI admin existante (`syncRegistryToDb`), qui upserte automatiquement.

### Changements

**1. `analyticsTabsRegistry.ts`** — ajouter dans le tab Construction :
- KPI `kpi-avg-capacity` (item_type `kpi`, titre « Cap. moyenne », icône `Users`).
- Chart `hosting-capacity` (item_type `chart`, type par défaut `bar-v`, titre « Capacité d'accueil »).
- Chart `occupancy-pressure` (item_type `chart`, type par défaut `donut`, titre « Pression d'occupation »).
- `display_order` cohérent avec l'insertion logique (après `occupation` / `floor-dist`).

**2. `crossVariables.ts`** — ajouter pour le tab Construction :
- `hosting-capacity` : variables croisables = occupation, construction-type, property-category, construction-nature, construction-decade, standing, building-size.
- `occupancy-pressure` : mêmes variables.

**3. Action admin** — après merge, l'admin clique « Synchroniser » dans `AdminAnalyticsConfig` ; `syncRegistryToDb` insère les rows manquantes (`missingItems`) dans `analytics_charts_config`. Aucun script BD requis.

### Hors scope
- Aucun changement à `ParcelsWithTitleBlock.tsx` (déjà fait).
- Aucun changement à `useInitializedConfig`, `analyticsConfigSync`, ni à l'UI admin (mécanique générique déjà en place).
- Aucune migration SQL.

