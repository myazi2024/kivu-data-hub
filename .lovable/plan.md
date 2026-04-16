
# Audit de la configuration graphique Analytics (espace admin)

## Résumé

L'audit couvre 3 fichiers de configuration (`analyticsTabsRegistry.ts`, `crossVariables.ts`, `useAnalyticsChartsConfig.ts`) et leur alignement avec les 13 blocs de visualisation (`*Block.tsx`).

## Résultats

### 1. Alignement Registry ↔ Blocs de visualisation

| Onglet | Registry (charts) | Registry (KPIs) | Block | Verdict |
|--------|-------------------|------------------|-------|---------|
| `title-requests` | 16 charts | 6 KPIs | TitleRequestsBlock — 16 chartDefs + 6 KPIs | OK |
| `parcels-titled` | 17 charts | 4 KPIs | ParcelsWithTitleBlock | A vérifier |
| `contributions` | 15 charts | 7 KPIs | ContributionsBlock | A vérifier |
| `expertise` | 19 charts | 6 KPIs | ExpertiseBlock | A vérifier |
| `mutations` | 11 charts | 6 KPIs | MutationsBlock | A vérifier |
| `mortgages` | 6 charts | 6 KPIs | MortgagesBlock | OK |
| `subdivision` | 9 charts | 6 KPIs | SubdivisionBlock | A vérifier |
| `disputes` | 17 charts | 9 KPIs | DisputesBlock | A vérifier |
| `ownership` | 4 charts | 4 KPIs | OwnershipHistoryBlock | OK |
| `certificates` | 5 charts | 4 KPIs | CertificatesBlock | OK |
| `invoices` | 6 charts | 5 KPIs | InvoicesBlock | OK |
| `building-permits` | 7 charts | 5 KPIs | BuildingPermitsBlock | OK |
| `taxes` | 5 charts | 6 KPIs | TaxesBlock | OK |
| `_global` | 4 charts (watermark config) | 0 | Pas de block (config UI only) | OK |
| `rdc-map` | 8 charts + 22 KPIs (tooltip/detail) | — | Carte RDC | OK |

### 2. Cross-variables — Cohérence

**Tabs avec cross-variables** : 13 tabs dans registry, 13 dans crossVariables.ts — **OK, en phase**.

**Problèmes détectés** :

- **`title-requests` cross-variables** référencent des champs de `data.parcels` (`property_title_type`, `declared_usage`, `current_owner_legal_status`) mais la plupart des charts du bloc opèrent sur des données dénormalisées (`owners` extraits du JSONB `current_owners_details`). Les cross-variables `cx('title-type')` passent `rawRecords={filtered}` (parcelles) ce qui fonctionne, mais `cx('nationality')` et `cx('gender')` ne passent pas de `rawRecords` donc le croisement ne peut pas fonctionner sur ces charts car les données sous-jacentes sont des `owners`, pas des `parcels`.

- **Cross-variable orphelines** : `title-requests.lease-type` croise sur `property_title_type` — le champ existe bien sur les parcelles, OK.

### 3. Problèmes identifiés

#### A. Charts sans cross-variables dans `title-requests`
Les charts suivants n'ont **aucune** cross-variable définie alors qu'ils pourraient en bénéficier :
- `lease-duration` — pourrait croiser par province
- `issue-year`, `issue-trend` — pourrait croiser par province, type titre
- `owner-duration` — pourrait croiser par province
- `entity-type`, `right-type` — pas de croisement possible (données JSONB)
- `mutation-type`, `hist-legal-status`, `hist-duration`, `transfers-per-parcel` — données d'historique, croisement limité

#### B. Cross-variables sur charts JSONB (propriétaires)
Les charts `nationality` et `gender` dans `title-requests` ont des cross-variables (`Province`) mais le `ChartCard` ne reçoit pas de `rawRecords` ni de `groupField` — **le picklist de croisement s'affiche mais ne produit aucun résultat**. Il faudrait passer `rawRecords={owners}` et un `groupField` adapté, mais `owners` n'a pas de `province` fiable (copié depuis la contribution).

#### C. `dateField` pour `title-requests`
Le `TAB_FILTER_DEFAULTS` utilise `created_at` comme champ date pour `title-requests`. Depuis la refonte, le champ pertinent serait `title_issue_date` (date de délivrance du titre). Le filtre temporel filtre donc sur la date de création de la parcelle, pas la date de délivrance — **incohérence sémantique**.

#### D. `statusField` non défini pour `title-requests`
Après la refonte, les parcelles n'ont pas de champ `status` uniforme. Le filtre statut est activé mais pourrait ne rien filtrer utilement.

### 4. Points sains

- Toutes les clés `tab_key` sont cohérentes entre registry, blocks, et cross-variables
- Les `display_order` sont séquentiels et corrects
- Les `chart_type` par défaut correspondent aux usages dans les blocks
- Les `col_span: 2` sont correctement appliqués aux charts `area`/`multi-area` (évolution)
- Le système de merge DB/defaults dans `useInitializedConfig` fonctionne correctement
- Les tabs système (`_global`, `rdc-map`) sont correctement exclus des vues utilisateur

### 5. Recommandations (aucune action requise immédiate)

1. **Corriger les cross-variables JSONB** : Pour `nationality` et `gender`, soit retirer les cross-variables, soit passer `rawRecords={owners}` avec le champ `province` copié depuis la contribution.
2. **Changer le dateField par défaut** de `title-requests` à `title_issue_date` dans `TAB_FILTER_DEFAULTS`.
3. **Désactiver le filtre statut** pour `title-requests` (comme pour `ownership`) car les parcelles n'ont pas de statut filtrable pertinent dans ce contexte.
4. **Ajouter des cross-variables manquantes** sur `lease-duration`, `issue-year`, `owner-duration`.

Voulez-vous que j'implémente ces corrections ?
