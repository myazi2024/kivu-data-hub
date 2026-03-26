export interface TestDataStats {
  parcels: number;
  contributions: number;
  invoices: number;
  payments: number;
  cccCodes: number;
  serviceAccess: number;
  titleRequests: number;
  expertiseRequests: number;
  disputes: number;
  boundaryConflicts: number;
  
  ownershipHistory: number;
  taxHistory: number;
  fraudAttempts: number;
  certificates: number;
  boundaryHistory: number;
  mortgages: number;
  buildingPermits: number;
}

export const EMPTY_STATS: TestDataStats = {
  parcels: 0,
  contributions: 0,
  invoices: 0,
  payments: 0,
  cccCodes: 0,
  serviceAccess: 0,
  titleRequests: 0,
  expertiseRequests: 0,
  disputes: 0,
  boundaryConflicts: 0,
  
  ownershipHistory: 0,
  taxHistory: 0,
  fraudAttempts: 0,
  certificates: 0,
  boundaryHistory: 0,
  mortgages: 0,
  buildingPermits: 0,
};

/** All TEST- prefixed tables in FK-safe deletion order (children → parents) */
export const TEST_TABLES_DELETION_ORDER = [
  // Children of contributions
  { table: 'fraud_attempts' as const, filter: 'contribution_join' as const, column: '', value: '' },
  { table: 'cadastral_contributor_codes' as const, filter: 'ilike' as const, column: 'parcel_number', value: 'TEST-%' },
  // Children of invoices
  { table: 'cadastral_service_access' as const, filter: 'ilike' as const, column: 'parcel_number', value: 'TEST-%' },
  // Payments (before invoices)
  { table: 'payment_transactions' as const, filter: 'jsonb' as const, column: 'metadata->>test_mode', value: 'true' },
  // Invoices (before contributions)
  { table: 'cadastral_invoices' as const, filter: 'ilike' as const, column: 'parcel_number', value: 'TEST-%' },
  // Contributions
  { table: 'cadastral_contributions' as const, filter: 'ilike' as const, column: 'parcel_number', value: 'TEST-%' },
  // Parcel children (ownership, tax, boundary history handled via parcel_id join)
  { table: 'cadastral_ownership_history' as const, filter: 'parcel_join' as const, column: '', value: '' },
  { table: 'cadastral_tax_history' as const, filter: 'parcel_join' as const, column: '', value: '' },
  // Parcels
  { table: 'cadastral_parcels' as const, filter: 'ilike' as const, column: 'parcel_number', value: 'TEST-%' },
  // Independent tables
  { table: 'real_estate_expertise_requests' as const, filter: 'ilike' as const, column: 'parcel_number', value: 'TEST-%' },
  { table: 'cadastral_land_disputes' as const, filter: 'ilike' as const, column: 'parcel_number', value: 'TEST-%' },
  { table: 'land_title_requests' as const, filter: 'ilike' as const, column: 'reference_number', value: 'TEST-%' },
  { table: 'cadastral_boundary_conflicts' as const, filter: 'ilike' as const, column: 'reporting_parcel_number', value: 'TEST-%' },
  { table: 'generated_certificates' as const, filter: 'ilike' as const, column: 'reference_number', value: 'TEST-%' },
] as const;

/** Generation step for progress tracking */
export interface GenerationStep {
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
}

/** Safely cast config objects for audit logging */
export const toRecord = (obj: unknown): Record<string, unknown> =>
  obj as Record<string, unknown>;
