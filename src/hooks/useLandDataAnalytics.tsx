import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LandAnalyticsData {
  titleRequests: any[];
  parcels: any[];
  contributions: any[];
  buildingPermits: any[];
  taxHistory: any[];
  mortgages: any[];
  expertiseRequests: any[];
  mutationRequests: any[];
  subdivisionRequests: any[];
  disputes: any[];
  boundaryConflicts: any[];
  ownershipHistory: any[];
  fraudAttempts: any[];
  certificates: any[];
  invoices: any[];
}

/** Fetch all rows with pagination to bypass 1000-row limit */
async function fetchAll(
  table: string,
  select: string,
  filters?: (q: any) => any
): Promise<any[]> {
  const PAGE = 1000;
  let from = 0;
  const allRows: any[] = [];

  while (true) {
    let query = (supabase.from as any)(table).select(select);
    if (filters) query = filters(query);
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

export const useLandDataAnalytics = () => {
  return useQuery({
    queryKey: ['land-analytics-v6'],
    queryFn: async (): Promise<LandAnalyticsData> => {
      const [
        parcels, contribs, titleReqs, permits,
        taxes, mortgages, expertise, mutations,
        subdivisions, disputes, boundaryConflicts,
        ownershipHistory, fraudAttempts, certificates, invoices,
      ] = await Promise.all([
        // Parcels
        fetchAll('cadastral_parcels',
          'id, parcel_number, parcel_type, province, ville, commune, quartier, avenue, territoire, collectivite, groupement, village, property_title_type, current_owner_legal_status, declared_usage, construction_type, construction_nature, construction_year, area_sqm, gps_coordinates, lease_type, created_at',
          q => q.is('deleted_at', null)),
        // Contributions — full fields for dedicated block
        fetchAll('cadastral_contributions',
          'id, parcel_number, parcel_type, province, ville, commune, quartier, avenue, territoire, collectivite, groupement, village, property_title_type, current_owner_legal_status, current_owners_details, declared_usage, construction_type, construction_nature, contribution_type, area_sqm, is_suspicious, fraud_score, fraud_reason, appeal_submitted, appeal_status, lease_type, status, reviewed_at, created_at'),
        // Title requests — added gender, nationality, area_sqm, deduced_title_type, estimated_processing_days, is_owner_same, circonscription
        fetchAll('land_title_requests',
          'id, request_type, requester_type, requester_gender, owner_gender, nationality, section_type, province, ville, commune, quartier, avenue, territoire, collectivite, groupement, village, declared_usage, construction_type, construction_nature, owner_legal_status, status, payment_status, total_amount_usd, area_sqm, deduced_title_type, estimated_processing_days, is_owner_same_as_requester, circonscription_fonciere, created_at, reviewed_at'),
        // Building permits — added validity_period_months, is_current, issuing_service
        fetchAll('cadastral_building_permits',
          'id, parcel_id, administrative_status, issue_date, validity_period_months, is_current, issuing_service, created_at'),
        // Tax history — added payment_date
        fetchAll('cadastral_tax_history',
          'id, parcel_id, tax_year, payment_status, amount_usd, payment_date, created_at'),
        fetchAll('cadastral_mortgages',
          'id, parcel_id, creditor_type, duration_months, mortgage_status, mortgage_amount_usd, contract_date, created_at'),
        // Expertise — all fields
        fetchAll('real_estate_expertise_requests',
          'id, parcel_number, parcel_id, status, payment_status, market_value_usd, property_condition, construction_quality, construction_year, number_of_floors, total_built_area_sqm, road_access_type, has_electricity, has_water_supply, has_internet, has_sewage_system, has_parking, has_security_system, has_garden, garden_area_sqm, flood_risk_zone, erosion_risk_zone, distance_to_main_road_m, distance_to_market_km, distance_to_school_km, distance_to_hospital_km, expertise_date, assigned_at, created_at'),
        fetchAll('mutation_requests',
          'id, parcel_number, parcel_id, mutation_type, requester_type, status, payment_status, total_amount_usd, reviewed_at, created_at'),
        fetchAll('subdivision_requests',
          'id, parcel_number, parcel_id, status, number_of_lots, purpose_of_subdivision, requester_type, submission_payment_status, total_amount_usd, parent_parcel_area_sqm, reviewed_at, created_at'),
        // Disputes — added lifting_reason
        fetchAll('cadastral_land_disputes',
          'id, parcel_number, parcel_id, dispute_nature, dispute_type, current_status, resolution_level, lifting_status, lifting_request_reference, lifting_reason, declarant_quality, dispute_start_date, created_at'),
        // New tables
        fetchAll('cadastral_boundary_conflicts',
          'id, conflict_type, status, reporting_parcel_number, conflicting_parcel_number, created_at, resolved_at'),
        fetchAll('cadastral_ownership_history',
          'id, parcel_id, owner_name, legal_status, mutation_type, ownership_start_date, ownership_end_date, created_at'),
        fetchAll('fraud_attempts',
          'id, user_id, fraud_type, severity, description, contribution_id, created_at'),
        fetchAll('generated_certificates',
          'id, certificate_type, parcel_number, recipient_name, reference_number, status, generated_at'),
        fetchAll('cadastral_invoices',
          'id, invoice_number, parcel_number, client_email, total_amount_usd, status, payment_method, geographical_zone, discount_amount_usd, created_at'),
      ]);

      // Lookup maps for enrichment
      const byId = new Map<string, any>();
      const byNum = new Map<string, any>();
      parcels.forEach(p => {
        byId.set(p.id, p);
        byNum.set(p.parcel_number, p);
      });

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

      // Enrich boundary conflicts by parcel_number lookup
      const enrichByParcelNumber = (records: any[]) =>
        records.map(r => {
          const p1 = r.reporting_parcel_number && byNum.get(r.reporting_parcel_number);
          const p2 = r.parcel_number && byNum.get(r.parcel_number);
          const p = p1 || p2;
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

      // Enrich fraud attempts via contribution_id → contribution → parcel
      const enrichFraud = (records: any[]) =>
        records.map(r => {
          if (r.province) return r; // already has geo
          // Try to find via contribution
          if (r.contribution_id) {
            const contrib = contribs.find((c: any) => c.id === r.contribution_id);
            if (contrib) {
              const p = byNum.get(contrib.parcel_number);
              const src = p || contrib;
              return {
                ...r,
                province: src.province,
                ville: src.ville,
                commune: src.commune,
                quartier: src.quartier,
                territoire: src.territoire,
                collectivite: src.collectivite,
                groupement: src.groupement,
                village: src.village,
                parcel_type: src.parcel_type,
                section_type: src.parcel_type === 'SU' ? 'urbaine' : 'rurale',
              };
            }
          }
          return r;
        });

      return {
        titleRequests: titleReqs,
        parcels,
        contributions: contribs,
        buildingPermits: enrich(permits),
        taxHistory: enrich(taxes),
        mortgages: enrich(mortgages),
        expertiseRequests: enrich(expertise),
        mutationRequests: enrich(mutations),
        subdivisionRequests: enrich(subdivisions),
        disputes: enrich(disputes),
        boundaryConflicts: enrichByParcelNumber(boundaryConflicts),
        ownershipHistory: enrich(ownershipHistory),
        fraudAttempts: enrichFraud(fraudAttempts),
        certificates: enrichByParcelNumber(certificates),
        invoices: enrichByParcelNumber(invoices),
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};
