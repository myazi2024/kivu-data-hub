

# Mise à jour du mode test — Wiring des cross-variables manquantes dans les blocs

## Problème

Les cross-variables ont été ajoutées dans `crossVariables.ts` mais **13 charts dans 4 blocs** ne passent pas les props `crossVariables={cx(...)}`, `rawRecords` et `groupField` — les picklists n'apparaissent donc pas dans l'UI.

Les données test générées sont déjà correctes (tous les champs nécessaires sont présents dans `testDataGenerators.ts`).

## Charts à corriger

### TitleRequestsBlock.tsx (10 charts)

| Chart | groupField |
|-------|-----------|
| `gender` (ColorMappedPieCard) | `current_owner_gender` |
| `nationality` | `current_owner_nationality` |
| `entity-type` | `entity_type` |
| `right-type` | `state_right_type` |
| `mutation-type` | `mutation_type` |
| `hist-legal-status` | `legal_status` (owners JSONB) |
| `hist-duration` | `legal_status` (owners JSONB) |
| `transfers-per-parcel` | `property_title_type` |
| `title-owner-match` | `is_title_in_current_owner_name` |
| `mutation-urgency` | `property_title_type` |
| `mismatch-by-title-type` | `property_title_type` |

Note: `mismatch-by-title-type` a déjà ses données calculées à partir de `filtered` donc `rawRecords={filtered}` suffit.

### ExpertiseBlock.tsx (2 charts)

| Chart | groupField |
|-------|-----------|
| `equipment` | `construction_quality` |
| `proximity` | `construction_quality` |

### MutationBlock.tsx, SubdivisionBlock.tsx, InvoicesBlock.tsx (3 revenue-trend charts)

Ces charts sont de type `area` — les cross-variables pour les `area` charts sont supportées si le composant sous-jacent gère le stacking. Ajouter `crossVariables={cx('revenue-trend')} rawRecords={filtered} groupField` approprié.

| Bloc | groupField |
|------|-----------|
| MutationBlock | `mutation_type` |
| SubdivisionBlock | `purpose_of_subdivision` |
| InvoicesBlock | `payment_method` |

### CertificatesBlock.tsx (1 chart)

`type-trend` utilise `StackedBarCard` (pas `ChartCard`) — les cross-variables ne s'appliquent pas ici (déjà croisé par type). Rien à faire.

## Fichiers modifiés (4)

1. **`src/components/visualizations/blocks/TitleRequestsBlock.tsx`** — ajouter `crossVariables={cx(...)}, rawRecords={filtered}, groupField="..."` aux 10 charts
2. **`src/components/visualizations/blocks/ExpertiseBlock.tsx`** — ajouter cx aux 2 charts
3. **`src/components/visualizations/blocks/MutationBlock.tsx`** — ajouter cx à `revenue-trend`
4. **`src/components/visualizations/blocks/SubdivisionBlock.tsx`** — ajouter cx à `revenue-trend`
5. **`src/components/visualizations/blocks/InvoicesBlock.tsx`** — ajouter cx à `revenue-trend`

## Aucune modification nécessaire dans testDataGenerators.ts

Les données test contiennent déjà tous les champs requis (`is_title_in_current_owner_name`, `current_owner_legal_status`, `current_owner_nationality`, `property_title_type`, etc.).

