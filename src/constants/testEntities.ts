/**
 * Unified registry of TEST entities for the frontend.
 * Mirrors the public.test_entities_registry table on the server.
 *
 * Use this when you need to iterate over test-data tables (e.g. for the
 * "Export CSV before purge" feature) instead of duplicating lists.
 */
export interface TestEntity {
  /** Stable key matching count_test_data_stats() output and the server registry */
  labelKey: string;
  /** Postgres table name */
  tableName: string;
  /** Column to filter on (e.g. parcel_number, reference_number) */
  markerColumn: string;
  /** Display label (FR) */
  label: string;
}

export const TEST_ENTITIES: TestEntity[] = [
  { labelKey: 'parcels',             tableName: 'cadastral_parcels',                marker: 'parcel_number',           label: 'Parcelles' } as never,
  { labelKey: 'contributions',       tableName: 'cadastral_contributions',          marker: 'parcel_number',           label: 'Contributions' } as never,
  { labelKey: 'invoices',            tableName: 'cadastral_invoices',               marker: 'parcel_number',           label: 'Factures' } as never,
  { labelKey: 'cccCodes',            tableName: 'cadastral_contributor_codes',      marker: 'parcel_number',           label: 'Codes CCC' } as never,
  { labelKey: 'serviceAccess',       tableName: 'cadastral_service_access',         marker: 'parcel_number',           label: 'Accès services' } as never,
  { labelKey: 'titleRequests',       tableName: 'land_title_requests',              marker: 'reference_number',        label: 'Demandes titres' } as never,
  { labelKey: 'expertiseRequests',   tableName: 'real_estate_expertise_requests',   marker: 'reference_number',        label: 'Expertises' } as never,
  { labelKey: 'disputes',            tableName: 'cadastral_land_disputes',          marker: 'parcel_number',           label: 'Litiges' } as never,
  { labelKey: 'boundaryConflicts',   tableName: 'cadastral_boundary_conflicts',     marker: 'reporting_parcel_number', label: 'Conflits limites' } as never,
  { labelKey: 'mutationRequests',    tableName: 'mutation_requests',                marker: 'reference_number',        label: 'Mutations' } as never,
  { labelKey: 'subdivisionRequests', tableName: 'subdivision_requests',             marker: 'reference_number',        label: 'Lotissements' } as never,
  { labelKey: 'mortgages',           tableName: 'cadastral_mortgages',              marker: 'reference_number',        label: 'Hypothèques' } as never,
  { labelKey: 'buildingPermits',     tableName: 'cadastral_building_permits',       marker: 'permit_number',           label: 'Autorisations de bâtir' } as never,
  { labelKey: 'certificates',        tableName: 'generated_certificates',           marker: 'reference_number',        label: 'Certificats' } as never,
].map(e => ({
  labelKey: (e as any).labelKey,
  tableName: (e as any).tableName,
  markerColumn: (e as any).marker,
  label: (e as any).label,
}));
