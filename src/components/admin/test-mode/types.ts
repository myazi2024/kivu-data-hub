export interface TestDataStats {
  contributions: number;
  invoices: number;
  payments: number;
  cccCodes: number;
  serviceAccess: number;
  titleRequests: number;
  expertiseRequests: number;
  disputes: number;
}

export const EMPTY_STATS: TestDataStats = {
  contributions: 0,
  invoices: 0,
  payments: 0,
  cccCodes: 0,
  serviceAccess: 0,
  titleRequests: 0,
  expertiseRequests: 0,
  disputes: 0,
};

/** All TEST- prefixed tables in FK-safe deletion order (children → parents) */
export const TEST_TABLES_DELETION_ORDER = [
  { table: 'cadastral_contributor_codes' as const, filter: 'ilike', column: 'parcel_number', value: 'TEST-%' },
  { table: 'cadastral_service_access' as const, filter: 'ilike', column: 'parcel_number', value: 'TEST-%' },
  { table: 'cadastral_invoices' as const, filter: 'ilike', column: 'parcel_number', value: 'TEST-%' },
  { table: 'cadastral_contributions' as const, filter: 'ilike', column: 'parcel_number', value: 'TEST-%' },
  { table: 'payment_transactions' as const, filter: 'jsonb', column: 'metadata->>test_mode', value: 'true' },
  { table: 'real_estate_expertise_requests' as const, filter: 'ilike', column: 'parcel_number', value: 'TEST-%' },
  { table: 'cadastral_land_disputes' as const, filter: 'ilike', column: 'parcel_number', value: 'TEST-%' },
  { table: 'land_title_requests' as const, filter: 'ilike', column: 'reference_number', value: 'TEST-%' },
] as const;

/** Generation step for progress tracking */
export interface GenerationStep {
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
}

/** Safely cast config objects for audit logging */
export const toRecord = (obj: unknown): Record<string, unknown> =>
  obj as Record<string, unknown>;
