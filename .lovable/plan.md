

# Audit de la configuration graphique Analytics — Résultats

## Synthèse globale

L'audit couvre les 3 fichiers de config (`analyticsTabsRegistry.ts`, `crossVariables.ts`, `useAnalyticsChartsConfig.ts`) et les 13 blocs de visualisation.

## 1. Alignement Registry ↔ Blocs

| Onglet | Registry (charts + KPIs) | Block chartDefs + KPIs | Verdict |
|--------|--------------------------|------------------------|---------|
| `title-requests` | 19 charts + 7 KPIs | 19 charts + 7 KPIs | **OK** |
| `parcels-titled` | 17 charts + 4 KPIs | 17 charts + 4 KPIs | **OK** |
| `contributions` | 15 charts + 7 KPIs | 15 charts + 7 KPIs | **OK** |
| `expertise` | 19 charts + 6 KPIs | 19 charts + 6 KPIs | **OK** |
| `mutations` | 11 charts + 6 KPIs | 11 charts + 6 KPIs | **OK** |
| `mortgages` | 6 charts + 6 KPIs | 6 charts + 6 KPIs | **OK** |
| `subdivision` | 9 charts + 6 KPIs | 9 charts + 6 KPIs | **OK** |
| `disputes` | 17 charts + 9 KPIs | 17 charts + 9 KPIs | **OK** |
| `ownership` | 4 charts + 4 KPIs | 4 charts + 4 KPIs | **OK** |
| `certificates` | 5 charts + 4 KPIs | 5 charts + 4 KPIs | **OK** |
| `invoices` | 6 charts + 5 KPIs | 6 charts + 5 KPIs | **OK** |
| `building-permits` | 7 charts + 5 KPIs | 7 charts + 5 KPIs | **OK** |
| `taxes` | 5 charts + 6 KPIs | 5 charts + 6 KPIs | **OK** |
| `_global` | 4 config items | N/A (config only) | **OK** |
| `rdc-map` | 8 charts + 22 KPIs | Carte RDC | **OK** |

**Tous les onglets sont parfaitement alignés.** Aucune clé orpheline, aucune clé manquante.

## 2. Cross-variables — Cohérence

13 tabs dans le registry, 13 dans `crossVariables.ts` — **en phase**.

### Problème identifié : cross-variables ajoutées en config mais non passées dans le bloc

Lors du dernier audit, des cross-variables ont été ajoutées dans `crossVariables.ts` pour les charts `lease-duration`, `issue-year`, `issue-trend`, `owner-duration` et `legal-status` de l'onglet `title-requests`. **Mais le bloc `TitleRequestsBlock.tsx` ne passe pas `crossVariables={cx(...)}` ni `rawRecords` ni `groupField` à ces charts** (lignes 269-288).

Concrètement, les charts suivants ont des cross-variables définies dans la config mais **aucun picklist ne s'affiche** :
- `lease-duration` — config: Province, Type titre → **bloc: aucun `cx()` passé**
- `issue-year` — config: Province, Type titre → **bloc: aucun `cx()` passé**
- `issue-trend` — config: Province, Type titre → **bloc: aucun `cx()` passé**
- `owner-duration` — config: Province, Type titre → **bloc: aucun `cx()` passé**
- `legal-status` — config: Province, Type titre → **bloc: aucun `cx()` passé**

C'est le seul problème fonctionnel trouvé.

## 3. Filtres — TAB_FILTER_DEFAULTS

| Tab | hideStatus | dateField | Verdict |
|-----|-----------|-----------|---------|
| `title-requests` | `true` | `title_issue_date` | **OK** (corrigé lors du dernier audit) |
| `ownership` | `true` | `ownership_start_date` | **OK** |
| `disputes` | `false` | `created_at`, statusField: `current_status` | **OK** |
| Tous les autres | `false` | `created_at` | **OK** |

`title_issue_date` n'est pas dans `DATE_FIELD_OPTIONS` — l'admin ne pourra pas le sélectionner dans le dropdown si on le change. **Problème mineur** : il faudrait l'ajouter à la liste.

## 4. Points sains

- Tous les `display_order` sont séquentiels et corrects
- Les `chart_type` par défaut correspondent aux usages dans les blocks
- Les `col_span: 2` sont bien appliqués aux charts évolution/tendance
- Le merge DB/defaults (`useInitializedConfig`) fonctionne correctement
- Les tabs système (`_global`, `rdc-map`) sont exclus des vues utilisateur

## 5. Corrections à apporter

### A. Passer les cross-variables aux 5 charts dans `TitleRequestsBlock.tsx`

Ajouter `crossVariables={cx('...')} rawRecords={filtered} groupField="..."` aux charts :
- `lease-duration` → `groupField="lease_years"`
- `issue-year` → `groupField="title_issue_date"`
- `issue-trend` → `groupField="title_issue_date"`
- `owner-duration` → pas de groupField direct (données dénormalisées depuis owners), utiliser `rawRecords={filtered}` avec `groupField="property_title_type"`
- `legal-status` → données JSONB (owners), utiliser `rawRecords={filtered}` avec `groupField="current_owner_legal_status"`

### B. Ajouter `title_issue_date` à `DATE_FIELD_OPTIONS`

Dans `useAnalyticsChartsConfig.ts`, ajouter :
```ts
{ value: 'title_issue_date', label: 'Date de délivrance (title_issue_date)' }
```

### Fichiers modifiés (2)
- `src/components/visualizations/blocks/TitleRequestsBlock.tsx` — ajouter `crossVariables`/`rawRecords`/`groupField` aux 5 charts
- `src/hooks/useAnalyticsChartsConfig.ts` — ajouter `title_issue_date` à `DATE_FIELD_OPTIONS`

