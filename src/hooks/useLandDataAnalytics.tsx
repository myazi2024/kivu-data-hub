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
    let query = supabase.from(table).select(select);
    if (filters) query = filters(query);
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) {
      console.error(`[Analytics] Error fetching ${table}:`, error.message);
      return allRows; // return what we have so far
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
    queryKey: ['land-analytics-v4'],
    queryFn: async (): Promise<LandAnalyticsData> => {
      const [
        parcels, contribs, titleReqs, permits,
        taxes, mortgages, expertise, mutations,
        subdivisions, disputes,
      ] = await Promise.all([
        fetchAll('cadastral_parcels',
          'id, parcel_number, parcel_type, province, ville, commune, quartier, avenue, territoire, collectivite, groupement, village, property_title_type, current_owner_legal_status, declared_usage, construction_type, construction_nature, area_sqm, gps_coordinates, lease_type, created_at',
          q => q.is('deleted_at', null)),
        fetchAll('cadastral_contributions',
          'id, parcel_number, parcel_type, province, ville, commune, quartier, avenue, territoire, collectivite, groupement, village, property_title_type, current_owner_legal_status, current_owners_details, declared_usage, construction_type, construction_nature, building_permits, mortgage_history, tax_history, status, created_at',
          q => q.eq('status', 'approved')),
        fetchAll('land_title_requests',
          'id, request_type, requester_type, section_type, province, ville, commune, quartier, avenue, territoire, collectivite, groupement, village, declared_usage, construction_type, construction_nature, owner_legal_status, status, payment_status, total_amount_usd, created_at'),
        fetchAll('cadastral_building_permits',
          'id, parcel_id, administrative_status, issue_date, created_at'),
        fetchAll('cadastral_tax_history',
          'id, parcel_id, tax_year, payment_status, amount_usd, created_at'),
        fetchAll('cadastral_mortgages',
          'id, parcel_id, creditor_type, duration_months, mortgage_status, mortgage_amount_usd, contract_date, created_at'),
        fetchAll('real_estate_expertise_requests',
          'id, parcel_number, parcel_id, status, created_at'),
        fetchAll('mutation_requests',
          'id, parcel_number, parcel_id, mutation_type, status, created_at'),
        fetchAll('subdivision_requests',
          'id, parcel_number, parcel_id, status, number_of_lots, created_at'),
        fetchAll('cadastral_land_disputes',
          'id, parcel_number, parcel_id, dispute_nature, dispute_type, current_status, resolution_level, lifting_status, lifting_request_reference, created_at'),
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
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};
