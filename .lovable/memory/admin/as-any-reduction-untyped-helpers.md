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
- Tables: `subdivision_rate_config`, `subdivision_zoning_rules`, `partners`, `app_appearance_config`, `system_config_audit`, `mutation_fees_config`, `land_title_fees_by_type`, `expertise_fees_config`, `publication_categories`, `payment_refunds`, `fiscal_periods`, `tva_collected_by_period`, `map_providers`, `certificate_templates`, `subdivision_requests`, `reseller_commissions_summary`, `revenue_net_by_period`, `payment_transactions`, `generic(name)`
- RPC: `list_public_tables_with_count`, `get_tva_declaration`, `close_fiscal_period`, `reopen_fiscal_period`, `get_orphan_reseller_invoices_count`, `regenerate_orphan_reseller_sales`, `backfill_provider_fees`, `get_billing_summary`, `purge_old_audit_logs`

## Bilan cumulé
- **153 → 71 occurrences `as any`** dans `src/components/admin` (-54%)
- Lot 1 (10 fichiers): `AdminMortgages`, `AdminPartners`, `AdminSubdivisionFeesConfig`, `AdminSubdivisionZoningRules`, `AdminSystemHub`, `AdminTvaReporting`, `AdminRefunds`, `AdminPublicationCategories`, `AdminFiscalPeriods`, `billing/BillingOverviewTab`
- Lot 2 (9 fichiers): `AdminMapProviders`, `CertificateTemplateEditor`, `AdminSubdivisionRequests`, `AdminResellerCommissions`, `AdminPaymentServiceIntegration`, `AdminInvoices`, `AdminFinancialDashboard`, `AdminCadastralTooltip`, `AdminAuditLogs`
- Casts évitables retirés: `audit_logs.new_values` Json, `Response.status` natif, `import.meta.env` via `getSupabaseUrl()`, variant Badge typé strict

## Reste (faible ROI)
- ~71 occurrences réparties sur ~30 fichiers à 1-4 occurrences chacun
- `AdminDashboardOverview` (4), `AdminCadastralMap` (3) — JSON dynamique légitime principalement
- Les casts résiduels sont majoritairement sur payloads Json complexes ou variantes UI

## Future migration
Quand `types.ts` sera regénéré avec ces tables, remplacer `untypedTables.X()` par `supabase.from('X')` direct et supprimer l'entrée du helper.
