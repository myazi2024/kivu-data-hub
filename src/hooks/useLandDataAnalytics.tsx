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

export const useLandDataAnalytics = () => {
  return useQuery({
    queryKey: ['land-analytics-v3'],
    queryFn: async (): Promise<LandAnalyticsData> => {
      const [
        parcelsRes, contribRes, titleReqRes, permitsRes,
        taxRes, mortgagesRes, expertiseRes, mutationRes,
        subdivisionRes, disputesRes,
      ] = await Promise.all([
        supabase.from('cadastral_parcels')
          .select('id, parcel_number, parcel_type, province, ville, commune, quartier, avenue, territoire, collectivite, groupement, village, property_title_type, current_owner_legal_status, declared_usage, construction_type, construction_nature, area_sqm, gps_coordinates, lease_type, created_at')
          .is('deleted_at', null),
        supabase.from('cadastral_contributions')
          .select('id, parcel_number, parcel_type, province, ville, commune, quartier, avenue, territoire, collectivite, groupement, village, property_title_type, current_owner_legal_status, current_owners_details, declared_usage, construction_type, construction_nature, building_permits, mortgage_history, tax_history, status, created_at')
          .eq('status', 'approved'),
        supabase.from('land_title_requests')
          .select('id, request_type, requester_type, section_type, province, ville, commune, quartier, avenue, territoire, collectivite, groupement, village, declared_usage, construction_type, construction_nature, owner_legal_status, status, payment_status, total_amount_usd, created_at'),
        supabase.from('cadastral_building_permits')
          .select('id, parcel_id, administrative_status, issue_date, created_at'),
        supabase.from('cadastral_tax_history')
          .select('id, parcel_id, tax_year, payment_status, amount_usd, created_at'),
        supabase.from('cadastral_mortgages')
          .select('id, parcel_id, creditor_type, duration_months, mortgage_status, mortgage_amount_usd, contract_date, created_at'),
        supabase.from('real_estate_expertise_requests')
          .select('id, parcel_number, parcel_id, status, created_at'),
        supabase.from('mutation_requests')
          .select('id, parcel_number, parcel_id, mutation_type, status, created_at'),
        supabase.from('subdivision_requests')
          .select('id, parcel_number, parcel_id, status, number_of_lots, created_at'),
        supabase.from('cadastral_land_disputes')
          .select('id, parcel_number, parcel_id, dispute_nature, dispute_type, current_status, resolution_level, lifting_status, lifting_request_reference, created_at'),
      ]);

      const parcels = parcelsRes.data || [];

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
        titleRequests: titleReqRes.data || [],
        parcels,
        contributions: contribRes.data || [],
        buildingPermits: enrich(permitsRes.data || []),
        taxHistory: enrich(taxRes.data || []),
        mortgages: enrich(mortgagesRes.data || []),
        expertiseRequests: enrich(expertiseRes.data || []),
        mutationRequests: enrich(mutationRes.data || []),
        subdivisionRequests: enrich(subdivisionRes.data || []),
        disputes: enrich(disputesRes.data || []),
      };
    },
  });
};
