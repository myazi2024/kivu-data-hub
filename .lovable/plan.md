

# Déplacer "Type de bail" de l'onglet Parcelles vers Titres fonciers

## Justification
Le type de bail est lié au type de titre de propriété dans le formulaire CCC. Il est logiquement rattaché à l'onglet "Titres fonciers" et non "Parcelles".

## Modifications

### 1. Registre — `src/hooks/useAnalyticsChartsConfig.ts`
- Retirer l'entrée `lease-type` du bloc `parcels-titled.charts`
- Ajouter une entrée `lease-type` dans `title-requests.charts` (après `construction-nature`, display_order ajusté)

### 2. Bloc Parcelles — `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx`
- Supprimer le calcul `byLeaseType` dans le `useMemo` des charts
- Supprimer le rendu conditionnel `{v('lease-type') && <ChartCard ...>}`
- Retirer l'import `Home` de lucide-react (s'il n'est plus utilisé)

### 3. Bloc Titres fonciers — `src/components/visualizations/blocks/TitleRequestsBlock.tsx`
- Ajouter `byLeaseType: countBy(filtered, 'lease_type')` dans les calculs
- Ajouter le rendu `<ChartCard title="Type bail" data={byLeaseType} type="donut" ...>` dans la grille
- Importer l'icône `Home` si nécessaire

### 4. Cross-variables — `src/config/crossVariables.ts`
- Déplacer l'entrée `'lease-type'` du bloc `parcels-titled` vers `title-requests`

**Impact** : ~10 lignes déplacées entre 4 fichiers.

