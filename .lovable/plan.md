

# Correction du CHECK constraint sur `analytics_charts_config`

## Probleme

La contrainte CHECK sur la colonne `item_type` n'autorise que 3 valeurs : `'chart'`, `'kpi'`, `'tab'`. Or le code envoie aussi `'filter'` et `'cross'` lors du "Sauvegarder tout" (ligne 884 de `AdminAnalyticsChartsConfig.tsx`), ce qui provoque l'erreur PostgreSQL `analytics_charts_config_item_type_check`.

De meme, la contrainte `chart_type_check` n'autorise que `'bar-h'`, `'bar-v'`, `'pie'`, `'donut'`, `'area'`, `NULL`. Si un nouveau type de graphique est ajouté cote code, le meme probleme surviendrait.

## Correction

### Migration SQL (1 fichier)

1. **Supprimer** l'ancien CHECK `analytics_charts_config_item_type_check`
2. **Recreer** le CHECK avec les 5 valeurs : `'chart'`, `'kpi'`, `'tab'`, `'filter'`, `'cross'`

```sql
ALTER TABLE analytics_charts_config DROP CONSTRAINT analytics_charts_config_item_type_check;
ALTER TABLE analytics_charts_config ADD CONSTRAINT analytics_charts_config_item_type_check
  CHECK (item_type IN ('chart', 'kpi', 'tab', 'filter', 'cross'));
```

### Aucune modification de code necessaire

Le code TypeScript est deja correct (`item_type: 'chart' | 'kpi' | 'tab' | 'filter' | 'cross'`). Seul le schema DB est desynchronise.

## Impact

- 1 migration SQL (2 lignes)
- Zero fichier TypeScript modifie
- Corrige immediatement l'erreur de sauvegarde

