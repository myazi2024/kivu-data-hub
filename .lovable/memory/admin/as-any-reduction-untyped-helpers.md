---
name: as-any-reduction-untyped-helpers
description: Réduction `as any` admin via helper `untyped.ts` — pattern centralisé pour tables non générées dans Supabase types.ts (read-only)
type: feature
---

# L6 — Réduction `as any` dans l'admin

## Pattern adopté
Fichier central `src/integrations/supabase/untyped.ts` qui isole les `as any` à un point d'entrée unique pour les tables et RPC **non générées** dans `types.ts` (read-only).

```ts
import { untypedTables, untypedRpc, getSupabaseUrl } from '@/integrations/supabase/untyped';

// Au lieu de :  (supabase as any).from('partners')
const { data } = await untypedTables.partners().select('*');

// Au lieu de :  supabase.rpc('get_tva_declaration' as any, ...)
await untypedRpc.get_tva_declaration({ p_year, p_month });
```

## Tables/RPC enregistrées
- Tables: `subdivision_rate_config`, `subdivision_zoning_rules`, `partners`, `app_appearance_config`, `system_config_audit`, `mutation_fees_config`, `land_title_fees_by_type`, `expertise_fees_config`, `publication_categories`, `payment_refunds`, `fiscal_periods`, `tva_collected_by_period`, `generic(name)`
- RPC: `list_public_tables_with_count`, `get_tva_declaration`, `close_fiscal_period`, `reopen_fiscal_period`

## Bilan
- **153 → 102 occurrences `as any`** dans `src/components/admin` (-33%)
- Fichiers entièrement nettoyés: `AdminMortgages`, `AdminPartners`, `AdminSubdivisionFeesConfig`, `AdminSubdivisionZoningRules`, `AdminSystemHub`, `AdminTvaReporting`, `AdminRefunds`, `AdminPublicationCategories`, `AdminFiscalPeriods`, `billing/BillingOverviewTab`
- Casts évitables retirés: `audit_logs.new_values` Json (plus de `as any`), `Response.status` typé natif, `import.meta.env` via `getSupabaseUrl()`

## Reste (legitime)
- `AdminMapProviders.tsx` (8 occurrences): table `map_providers` non typée + `extra_config` Json
- ~94 occurrences réparties sur fichiers à 1-3 occurrences (faible ROI individuel)

## Future migration
Quand `types.ts` sera regénéré avec ces tables, remplacer `untypedTables.X()` par `supabase.from('X')` direct et supprimer l'entrée du helper.
