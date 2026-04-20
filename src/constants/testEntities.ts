/**
 * Unified registry of TEST entities for the frontend.
 * Source of truth: public.test_entities_registry (server table).
 *
 * Use `loadTestEntities()` to fetch the live list (cached 5 min).
 * The TEST_ENTITIES static fallback is kept only for offline/error cases —
 * the dynamic loader should be preferred everywhere (CSV export, etc.).
 */
import { supabase } from '@/integrations/supabase/client';

export interface TestEntity {
  /** Stable key matching count_test_data_stats() output and the server registry */
  labelKey: string;
  /** Postgres table name */
  tableName: string;
  /** Column to filter on (e.g. parcel_number, reference_number) */
  markerColumn: string;
  /** ILIKE pattern for the marker column (e.g. 'TEST-%', 'TEST-HYP-%') */
  markerPattern: string;
  /** Display label (FR) */
  label: string;
}

/** Human-readable labels keyed by labelKey (kept client-side; not stored in DB). */
const LABELS: Record<string, string> = {
  parcels: 'Parcelles',
  contributions: 'Contributions',
  invoices: 'Factures',
  cccCodes: 'Codes CCC',
  serviceAccess: 'Accès services',
  titleRequests: 'Demandes titres',
  expertiseRequests: 'Expertises',
  disputes: 'Litiges',
  boundaryConflicts: 'Conflits limites',
  mutationRequests: 'Mutations',
  subdivisionRequests: 'Lotissements',
  mortgages: 'Hypothèques',
  buildingPermits: 'Autorisations de bâtir',
  certificates: 'Certificats',
  ownershipHistory: 'Historique propriété',
  taxHistory: 'Historique fiscal',
  boundaryHistory: 'Historique bornages',
  mortgagePayments: 'Paiements hypothèques',
  expertisePayments: 'Paiements expertises',
  fraudAttempts: 'Tentatives de fraude',
  permitPayments: 'Paiements autorisations',
  permitAdminActions: 'Actions admin autorisations',
};

const labelFor = (key: string) => LABELS[key] ?? key;

/** Static fallback used only if the registry fetch fails. Mirrors the legacy list. */
export const TEST_ENTITIES: TestEntity[] = [
  { labelKey: 'parcels',             tableName: 'cadastral_parcels',                markerColumn: 'parcel_number',           markerPattern: 'TEST-%',      label: labelFor('parcels') },
  { labelKey: 'contributions',       tableName: 'cadastral_contributions',          markerColumn: 'parcel_number',           markerPattern: 'TEST-%',      label: labelFor('contributions') },
  { labelKey: 'invoices',            tableName: 'cadastral_invoices',               markerColumn: 'parcel_number',           markerPattern: 'TEST-%',      label: labelFor('invoices') },
  { labelKey: 'cccCodes',            tableName: 'cadastral_contributor_codes',      markerColumn: 'parcel_number',           markerPattern: 'TEST-%',      label: labelFor('cccCodes') },
  { labelKey: 'serviceAccess',       tableName: 'cadastral_service_access',         markerColumn: 'parcel_number',           markerPattern: 'TEST-%',      label: labelFor('serviceAccess') },
  { labelKey: 'titleRequests',       tableName: 'land_title_requests',              markerColumn: 'reference_number',        markerPattern: 'TEST-%',      label: labelFor('titleRequests') },
  { labelKey: 'expertiseRequests',   tableName: 'real_estate_expertise_requests',   markerColumn: 'reference_number',        markerPattern: 'TEST-%',      label: labelFor('expertiseRequests') },
  { labelKey: 'disputes',            tableName: 'cadastral_land_disputes',          markerColumn: 'parcel_number',           markerPattern: 'TEST-%',      label: labelFor('disputes') },
  { labelKey: 'boundaryConflicts',   tableName: 'cadastral_boundary_conflicts',     markerColumn: 'reporting_parcel_number', markerPattern: 'TEST-%',      label: labelFor('boundaryConflicts') },
  { labelKey: 'mutationRequests',    tableName: 'mutation_requests',                markerColumn: 'reference_number',        markerPattern: 'TEST-%',      label: labelFor('mutationRequests') },
  { labelKey: 'subdivisionRequests', tableName: 'subdivision_requests',             markerColumn: 'reference_number',        markerPattern: 'TEST-%',      label: labelFor('subdivisionRequests') },
  { labelKey: 'mortgages',           tableName: 'cadastral_mortgages',              markerColumn: 'reference_number',        markerPattern: 'TEST-HYP-%',  label: labelFor('mortgages') },
  { labelKey: 'buildingPermits',     tableName: 'cadastral_building_permits',       markerColumn: 'permit_number',           markerPattern: 'TEST-PC%',    label: labelFor('buildingPermits') },
  { labelKey: 'certificates',        tableName: 'generated_certificates',           markerColumn: 'reference_number',        markerPattern: 'TEST-CERT-%', label: labelFor('certificates') },
];

interface CacheEntry {
  data: TestEntity[];
  expiresAt: number;
}
let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Fetch the live test-entities registry (cached 5 min). Falls back to the
 * static TEST_ENTITIES list if the request fails so the UI never breaks.
 */
export async function loadTestEntities(): Promise<TestEntity[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.data;

  const { data, error } = await (supabase as any)
    .from('test_entities_registry')
    .select('label_key, table_name, marker_column, marker_pattern, display_order, is_active')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error || !data) {
    return TEST_ENTITIES;
  }

  const mapped: TestEntity[] = (data as Array<{
    label_key: string;
    table_name: string;
    marker_column: string;
    marker_pattern: string | null;
  }>).map(row => ({
    labelKey: row.label_key,
    tableName: row.table_name,
    markerColumn: row.marker_column,
    markerPattern: row.marker_pattern || 'TEST-%',
    label: labelFor(row.label_key),
  }));

  cache = { data: mapped, expiresAt: Date.now() + CACHE_TTL_MS };
  return mapped;
}
