/**
 * Helpers centralisés pour les tables Supabase **non générées** dans `types.ts`
 * (read-only). Permet d'isoler les `as any` à un seul point d'entrée par table
 * au lieu de les disséminer dans les composants.
 *
 * Lorsque les types seront regénérés, il suffira de remplacer ces helpers par
 * `supabase.from('table')` direct.
 */
import { supabase } from './client';

type AnyClient = any;

const cast = supabase as AnyClient;

/** Tables connues non typées (à enrichir au besoin) */
export const untypedTables = {
  subdivision_rate_config: () => cast.from('subdivision_rate_config'),
  subdivision_zoning_rules: () => cast.from('subdivision_zoning_rules'),
  partners: () => cast.from('partners'),
  app_appearance_config: () => cast.from('app_appearance_config'),
  system_config_audit: () => cast.from('system_config_audit'),
  mutation_fees_config: () => cast.from('mutation_fees_config'),
  land_title_fees_by_type: () => cast.from('land_title_fees_by_type'),
  expertise_fees_config: () => cast.from('expertise_fees_config'),
  publication_categories: () => cast.from('publication_categories'),
  payment_refunds: () => cast.from('payment_refunds'),
  fiscal_periods: () => cast.from('fiscal_periods'),
  tva_collected_by_period: () => cast.from('tva_collected_by_period'),
  map_providers: () => cast.from('map_providers'),
  certificate_templates: () => cast.from('certificate_templates'),
  subdivision_requests: () => cast.from('subdivision_requests'),
  subdivision_reference_lists: () => cast.from('subdivision_reference_lists'),
  subdivision_required_documents: () => cast.from('subdivision_required_documents'),
  subdivision_plan_elements: () => cast.from('subdivision_plan_elements'),
  reseller_commissions_summary: () => cast.from('reseller_commissions_summary'),
  revenue_net_by_period: () => cast.from('revenue_net_by_period'),
  payment_transactions: () => cast.from('payment_transactions'),
  generic: (table: string) => cast.from(table),
} as const;

/** RPC non générées dans les types */
export const untypedRpc = {
  list_public_tables_with_count: () => cast.rpc('list_public_tables_with_count'),
  get_tva_declaration: (params: { p_year: number; p_month: number }) =>
    cast.rpc('get_tva_declaration', params),
  close_fiscal_period: (params: Record<string, unknown>) =>
    cast.rpc('close_fiscal_period', params),
  reopen_fiscal_period: (params: Record<string, unknown>) =>
    cast.rpc('reopen_fiscal_period', params),
  get_orphan_reseller_invoices_count: () =>
    cast.rpc('get_orphan_reseller_invoices_count'),
  regenerate_orphan_reseller_sales: () =>
    cast.rpc('regenerate_orphan_reseller_sales'),
  backfill_provider_fees: (params: Record<string, unknown>) =>
    cast.rpc('backfill_provider_fees', params),
  get_billing_summary: (params: Record<string, unknown>) =>
    cast.rpc('get_billing_summary', params),
  purge_old_audit_logs: (params: { _days: number }) =>
    cast.rpc('purge_old_audit_logs', params),
} as const;

/** Cast générique pour payload partiel (Insert/Update) sur table non typée */
export const asUntypedPayload = <T extends Record<string, unknown>>(payload: T): any => payload;

/** Récupère VITE_SUPABASE_URL sans cast `import.meta as any` à chaque usage */
export const getSupabaseUrl = (): string | undefined =>
  (import.meta as unknown as { env?: { VITE_SUPABASE_URL?: string } }).env?.VITE_SUPABASE_URL;
