import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  ParcelRecord, ContributionRecord, TitleRequestRecord,
  TaxHistoryRecord, MortgageRecord,
  ExpertiseRequestRecord, SubdivisionRequestRecord,
  DisputeRecord, OwnershipHistoryRecord,
} from '@/types/landAnalytics';

export interface LandAnalyticsData {
  titleRequests: TitleRequestRecord[];
  parcels: ParcelRecord[];
  contributions: ContributionRecord[];
  taxHistory: TaxHistoryRecord[];
  mortgages: MortgageRecord[];
  expertiseRequests: ExpertiseRequestRecord[];
  subdivisionRequests: SubdivisionRequestRecord[];
  disputes: DisputeRecord[];
  ownershipHistory: OwnershipHistoryRecord[];
}

export const EMPTY_LAND_ANALYTICS: LandAnalyticsData = {
  titleRequests: [], parcels: [], contributions: [], taxHistory: [], mortgages: [],
  expertiseRequests: [], subdivisionRequests: [], disputes: [],
  ownershipHistory: [],
};

/**
 * Données d'un seul onglet, filtrées par le serveur (get_analytics_tab_dataset) :
 * admins / profils habilités = tous les onglets ; acheteurs = onglets avec au moins
 * un visuel valide. Les autres onglets ne transmettent aucune donnée.
 */
export const useLandDataAnalytics = (isTestRoute = false, tabKey?: string | null) => {
  const query = useQuery({
    queryKey: ['land-analytics-tab', tabKey, isTestRoute],
    enabled: !!tabKey,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<LandAnalyticsData> => {
      const { data: raw, error } = await (supabase.rpc as any)('get_analytics_tab_dataset', {
        p_tab_key: tabKey, p_test: isTestRoute,
      });
      if (error) {
        console.error('[Analytics] get_analytics_tab_dataset:', error.message);
        return EMPTY_LAND_ANALYTICS;
      }
      const d = (raw ?? {}) as Record<string, any[]>;
      const parcels: any[] = d.parcels ?? [];
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
            land_district: r.land_district || p.land_district,
            section_type: r.section_type || (p.parcel_type === 'SU' ? 'urbaine' : 'rurale'),
          };
        });


      return {
        titleRequests: d.titleRequests ?? [],
        parcels,
        contributions: enrich(d.contributions ?? []),
        taxHistory: enrich(d.taxHistory ?? []),
        mortgages: enrich(d.mortgages ?? []),
        expertiseRequests: enrich(d.expertiseRequests ?? []),
        subdivisionRequests: enrich(d.subdivisionRequests ?? []),
        disputes: enrich(d.disputes ?? []),
        ownershipHistory: enrich(d.ownershipHistory ?? []),
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  return {
    ...query,
    data: query.data ?? (query.isFetching ? undefined : EMPTY_LAND_ANALYTICS),
    isLoading: !query.data && query.isFetching,
  };
};
