# Aligner le back-end sur le front-end « Données foncières »

## Constat vérifié

Le front-end a été mis à jour (filtre « Tous statuts » supprimé, note d'en-tête de carte retirée), mais la base et une partie du code n'ont pas suivi :

1. **Base de données** : la table `analytics_charts_config` contient encore
   - `filter-status` (visible) pour 12 onglets : title-requests, parcels-titled, contributions, expertise, mortgages, subdivision, disputes, ownership, certificates, invoices, taxes, boundary ;
   - `filter-status-field` pour ces mêmes onglets ;
   - `map-header-note` (onglet `rdc-map`), déjà orpheline depuis la suppression du bandeau de carte.
2. **Code mort côté front** : le réglage de statut est encore lu et exposé alors que plus aucun écran ne l'utilise :
   - `useAnalyticsChartsConfig.ts` : `buildFilterDefaults` crée encore les entrées `filter-status` / `filter-status-field`, et `useTabFilterConfig` calcule encore `hideStatus` / `statusField` ;
   - `FilterManager.tsx` (admin) : le commutateur « Filtre statut » et le sélecteur de champ de statut pilotent des réglages sans effet.

## Corrections

### 1. Migration SQL (nettoyage des réglages obsolètes)

```sql
DELETE FROM analytics_charts_config
WHERE (item_type = 'filter' AND item_key IN ('filter-status', 'filter-status-field'))
   OR (tab_key = 'rdc-map' AND item_key = 'map-header-note');
```

- Les filtres de temps (`filter-time`), de lieu (`filter-location`) et de champ de date (`filter-date-field`) sont conservés.
- Le rapport d'orphelins admin (`detectOrphansAndMissing`) ne signalera plus `map-header-note`.

### 2. Suppression du code mort front-end

- `useAnalyticsChartsConfig.ts` : retirer `filter-status` et `filter-status-field` de `buildFilterDefaults` ; retirer `hideStatus` et `statusField` de `useTabFilterConfig` / `TabFilterConfig`.
- `FilterManager.tsx` : retirer le commutateur « Filtre statut » et le sélecteur de champ de statut (ne garder que temps, lieu, champ de date).
- `AnalyticsFilters.tsx` / blocs : retirer les props `hideStatus` / `statusField` devenues inutilisées et leur passage dans les `blocks/*.tsx`.

### 3. Vérifications

- `bun run test` (290 tests), `tsgo --noEmit -p tsconfig.app.json`, build via `/tmp/observability/build-errors.log`.
- Requête de contrôle post-migration : plus aucune ligne `filter-status`, `filter-status-field` ou `map-header-note` en base.
- Aucun changement visuel attendu : le filtre de statut n'est déjà plus affiché ; l'admin perd juste deux réglages sans effet.

## Détails techniques

- Fichiers : `src/hooks/useAnalyticsChartsConfig.ts`, `src/components/admin/analytics-config/FilterManager.tsx`, `src/components/visualizations/filters/AnalyticsFilters.tsx`, `src/components/visualizations/blocks/*.tsx` (props), migration Supabase.
- `TAB_FILTER_DEFAULTS.hideStatus` est supprimé partout ; les onglets qui le définissaient gardent `hideTime` / `hideLocation` / `dateField`.
