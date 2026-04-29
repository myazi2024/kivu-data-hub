/**
 * Single source of truth for the cleanup step ordering used by:
 * - `cleanup-test-data-batch` edge function (server)
 * - `CleanupProgress` component (front)
 *
 * Order matters: FK-children first, parents last. Mirrors
 * `_cleanup_test_data_chunk_internal(p_step text)` accepted values.
 */
export const CLEANUP_STEPS = [
  "permit_payments",
  "permit_admin_actions",
  "fraud_attempts",
  "contributor_codes",
  "service_access",
  "payment_transactions",
  "invoices",
  "contributions",
  "mutation_requests",
  "subdivision_requests",
  "land_disputes",
  "expertise_payments",
  "expertise_requests",
  "land_title_requests",
  "ownership_history",
  "tax_history",
  "boundary_history",
  "mortgage_payments",
  "mortgages",
  "building_permits",
  "parcels",
  "generated_certificates",
  "boundary_conflicts",
] as const;

export type CleanupStep = (typeof CLEANUP_STEPS)[number];
