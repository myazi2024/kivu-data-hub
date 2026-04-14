import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  ParcelRecord, ContributionRecord, TitleRequestRecord,
  BuildingPermitRecord, TaxHistoryRecord, MortgageRecord,
  ExpertiseRequestRecord, MutationRequestRecord, SubdivisionRequestRecord,
  DisputeRecord, OwnershipHistoryRecord, CertificateRecord, InvoiceRecord,
} from '@/types/landAnalytics';

export interface LandAnalyticsData {
  titleRequests: TitleRequestRecord[];
  parcels: ParcelRecord[];
  contributions: ContributionRecord[];
  buildingPermits: BuildingPermitRecord[];
  taxHistory: TaxHistoryRecord[];
  mortgages: MortgageRecord[];
  expertiseRequests: ExpertiseRequestRecord[];
  mutationRequests: MutationRequestRecord[];
  subdivisionRequests: SubdivisionRequestRecord[];
  disputes: DisputeRecord[];
  ownershipHistory: OwnershipHistoryRecord[];
  certificates: CertificateRecord[];
  invoices: InvoiceRecord[];
}

/** Column used to filter TEST- data per table */
const TEST_FILTER_COLUMN: Record<string, string> = {
  cadastral_parcels: 'parcel_number',
  cadastral_contributions: 'parcel_number',
  land_title_requests: 'reference_number',
  real_estate_expertise_requests: 'parcel_number',
  cadastral_land_disputes: 'parcel_number',
  cadastral_invoices: 'parcel_number',
  generated_certificates: 'reference_number',
  mutation_requests: 'reference_number',
  subdivision_requests: 'reference_number',
};

/** Fetch all rows with pagination to bypass 1000-row limit.
 *  Filters TEST-% rows based on isTestRoute context. */
async function fetchAll(
  table: string,
  select: string,
  isTestRoute: boolean,
  filters?: (q: any) => any
): Promise<any[]> {
  const PAGE = 1000;
  let from = 0;
  const allRows: any[] = [];
  const testCol = TEST_FILTER_COLUMN[table];

  while (true) {
    let query = (supabase.from as any)(table).select(select);
    if (filters) query = filters(query);
    // Filter test data based on route context
    if (testCol) {
      query = isTestRoute
        ? query.ilike(testCol, 'TEST-%')
        : query.not(testCol, 'ilike', 'TEST-%');
    }
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) {
      console.error(`[Analytics] Error fetching ${table}:`, error.message);
      return allRows;
    }
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return allRows;
}

export const useLandDataAnalytics = (isTestRoute = false) => {
  return useQuery({
    queryKey: ['land-analytics-v8', isTestRoute],
    queryFn: async (): Promise<LandAnalyticsData> => {
      const [
        parcels, contribs, titleReqs, permits,
        taxes, mortgages, expertise, mutations,
        subdivisions, disputes,
        ownershipHistory, certificates, invoices,
      ] = await Promise.all([
        // Parcels
        fetchAll('cadastral_parcels',
          'id, parcel_number, parcel_type, province, ville, commune, quartier, avenue, territoire, collectivite, groupement, village, property_title_type, current_owner_legal_status, declared_usage, construction_type, construction_nature, construction_year, area_sqm, gps_coordinates, lease_type, property_category, construction_materials, standing, lease_years, is_subdivided, has_dispute, created_at',
          isTestRoute, q => q.is('deleted_at', null)),
        // Contributions
        fetchAll('cadastral_contributions',
          'id, parcel_number, parcel_type, province, ville, commune, quartier, avenue, territoire, collectivite, groupement, village, property_title_type, current_owner_legal_status, current_owners_details, declared_usage, construction_type, construction_nature, construction_year, contribution_type, area_sqm, is_suspicious, fraud_score, fraud_reason, appeal_submitted, appeal_status, lease_type, property_category, construction_materials, standing, status, reviewed_at, created_at, building_permits, building_shapes, sound_environment, nearby_noise_sources',
          isTestRoute),
        // Title requests
        fetchAll('land_title_requests',
          'id, request_type, requester_type, requester_gender, owner_gender, nationality, section_type, province, ville, commune, quartier, avenue, territoire, collectivite, groupement, village, declared_usage, construction_type, construction_nature, construction_materials, standing, construction_year, floor_number, owner_legal_status, status, payment_status, total_amount_usd, area_sqm, deduced_title_type, estimated_processing_days, is_owner_same_as_requester, created_at, reviewed_at',
          isTestRoute),
        // Building permits
        fetchAll('cadastral_building_permits',
          'id, parcel_id, permit_number, administrative_status, issue_date, validity_period_months, is_current, issuing_service, created_at',
          isTestRoute),
        // Tax history
        fetchAll('cadastral_tax_history',
          'id, parcel_id, tax_year, payment_status, amount_usd, payment_date, created_at',
          isTestRoute),
        fetchAll('cadastral_mortgages',
          'id, parcel_id, creditor_type, duration_months, mortgage_status, mortgage_amount_usd, contract_date, created_at',
          isTestRoute),
        // Expertise
        fetchAll('real_estate_expertise_requests',
          'id, parcel_number, parcel_id, status, payment_status, market_value_usd, property_condition, construction_quality, construction_year, number_of_floors, total_built_area_sqm, road_access_type, has_electricity, has_water_supply, has_internet, has_sewage_system, has_parking, has_security_system, has_garden, garden_area_sqm, flood_risk_zone, erosion_risk_zone, distance_to_main_road_m, distance_to_market_km, distance_to_school_km, distance_to_hospital_km, expertise_date, assigned_at, created_at',
          isTestRoute),
        fetchAll('mutation_requests',
          'id, parcel_number, parcel_id, mutation_type, requester_type, status, payment_status, total_amount_usd, market_value_usd, title_age, late_fee_amount, reviewed_at, created_at',
          isTestRoute),
        fetchAll('subdivision_requests',
          'id, parcel_number, parcel_id, status, number_of_lots, purpose_of_subdivision, requester_type, submission_payment_status, total_amount_usd, parent_parcel_area_sqm, reviewed_at, created_at',
          isTestRoute),
        // Disputes
        fetchAll('cadastral_land_disputes',
          'id, parcel_number, parcel_id, dispute_nature, dispute_type, current_status, resolution_level, lifting_status, lifting_request_reference, lifting_reason, declarant_quality, dispute_start_date, created_at',
          isTestRoute),
        // New tables
        fetchAll('cadastral_ownership_history',
          'id, parcel_id, owner_name, legal_status, mutation_type, ownership_start_date, ownership_end_date, created_at',
          isTestRoute),
        fetchAll('generated_certificates',
          'id, certificate_type, parcel_number, recipient_name, reference_number, status, generated_at',
          isTestRoute),
        fetchAll('cadastral_invoices',
          'id, invoice_number, parcel_number, client_email, total_amount_usd, status, payment_method, geographical_zone, discount_amount_usd, created_at',
          isTestRoute),
      ]);

      // Lookup maps for enrichment
      const byId = new Map<string, any>();
      const byNum = new Map<string, any>();
      parcels.forEach(p => {
        byId.set(p.id, p);
        byNum.set(p.parcel_number, p);
      });

      // Set of TEST parcel IDs for FK-table filtering
      const testParcelIds = new Set<string>();
      parcels.forEach(p => {
        if (p.parcel_number?.toUpperCase().startsWith('TEST-')) {
          testParcelIds.add(p.id);
        }
      });

      /** Filter records linked to TEST-% parcels via parcel_id FK */
      const filterByTestFK = (records: any[]) =>
        isTestRoute
          ? records.filter(r => r.parcel_id && testParcelIds.has(r.parcel_id))
          : records.filter(r => !r.parcel_id || !testParcelIds.has(r.parcel_id));


      const enrich = (records: any[]) =>
        records.map(r => {
          const p = (r.parcel_id && byId.get(r.parcel_id)) || (r.parcel_number && byNum.get(r.parcel_number));
          if (!p) return r;
          return {
            ...r,
            province: r.province || p.province,
            ville: r.ville || p.ville,
            commune: r.commune || p.commune,
            quartier: r.quartier || p.quartier,
            avenue: r.avenue || p.avenue,
            territoire: r.territoire || p.territoire,
            collectivite: r.collectivite || p.collectivite,
            groupement: r.groupement || p.groupement,
            village: r.village || p.village,
            parcel_type: r.parcel_type || p.parcel_type,
            section_type: r.section_type || (p.parcel_type === 'SU' ? 'urbaine' : 'rurale'),
          };
        });

      // Enrich records by parcel_number lookup (certificates, invoices)
      const enrichByParcelNumber = (records: any[]) =>
        records.map(r => {
          const p = r.parcel_number && byNum.get(r.parcel_number);
          if (!p) return r;
          return {
            ...r,
            province: r.province || p.province,
            ville: r.ville || p.ville,
            commune: r.commune || p.commune,
            quartier: r.quartier || p.quartier,
            avenue: r.avenue || p.avenue,
            territoire: r.territoire || p.territoire,
            collectivite: r.collectivite || p.collectivite,
            groupement: r.groupement || p.groupement,
            village: r.village || p.village,
            parcel_type: r.parcel_type || p.parcel_type,
            section_type: r.section_type || (p.parcel_type === 'SU' ? 'urbaine' : 'rurale'),
          };
        });


      return {
        titleRequests: titleReqs,
        parcels,
        contributions: contribs,
        buildingPermits: enrich(filterByTestFK(permits)),
        taxHistory: enrich(filterByTestFK(taxes)),
        mortgages: enrich(filterByTestFK(mortgages)),
        expertiseRequests: enrich(expertise),
        mutationRequests: enrich(mutations),
        subdivisionRequests: enrich(subdivisions),
        disputes: enrich(disputes),
        
        ownershipHistory: enrich(filterByTestFK(ownershipHistory)),
        
        certificates: enrichByParcelNumber(certificates),
        invoices: enrichByParcelNumber(invoices),
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};
