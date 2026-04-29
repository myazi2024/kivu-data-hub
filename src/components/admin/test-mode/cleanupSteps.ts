/**
 * Front mirror of `supabase/functions/_shared/cleanupSteps.ts`.
 * Kept in sync manually — the edge function is the authoritative consumer
 * but the same ordering must be displayed in `CleanupProgress`.
 *
 * If you change one, change the other.
 */
export const CLEANUP_STEPS = [
  'permit_payments',
  'permit_admin_actions',
  'fraud_attempts',
  'contributor_codes',
  'service_access',
  'payment_transactions',
  'invoices',
  'contributions',
  'mutation_requests',
  'subdivision_requests',
  'land_disputes',
  'expertise_payments',
  'expertise_requests',
  'land_title_requests',
  'ownership_history',
  'tax_history',
  'boundary_history',
  'mortgage_payments',
  'mortgages',
  'building_permits',
  'parcels',
  'generated_certificates',
  'boundary_conflicts',
] as const;

export type CleanupStep = (typeof CLEANUP_STEPS)[number];
