import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SearchFilters {
  province?: string;
  sectionType?: 'urbaine' | 'rurale';
  // Champs urbains
  ville?: string;
  commune?: string;
  quartier?: string;
  avenue?: string;
  // Champs ruraux
  territoire?: string;
  collectivite?: string;
  groupement?: string;
  village?: string;
  // Autres critères
  ownerName?: string;
  areaSqmMin?: number;
  areaSqmMax?: number;
  parcelType?: string;
  titleType?: string;
  hasBuildingPermit?: boolean;
  hasMortgage?: boolean;
  hasTaxArrears?: boolean;
  proximityLat?: number;
  proximityLng?: number;
  proximityRadius?: number;
}

export interface ParcelSearchResult {
  id: string;
  parcel_number: string;
  current_owner_name: string;
  area_sqm: number;
  parcel_type: string;
  property_title_type: string;
  province: string | null;
  ville: string | null;
  commune: string | null;
  quartier: string | null;
  latitude: number | null;
  longitude: number | null;
  gps_coordinates: any;
  parcel_sides: any;
  has_building_permit?: boolean;
  has_mortgage?: boolean;
  has_tax_arrears?: boolean;
}

const PAGE_SIZE = 50;

export const useAdvancedCadastralSearch = () => {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<ParcelSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const buildQuery = (activeFilters: SearchFilters, pageNum: number) => {
    let query = supabase
      .from('cadastral_parcels')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Filtres géographiques
    if (activeFilters.province) {
      query = query.ilike('province', `%${activeFilters.province}%`);
    }

    // Filtre sectionType → parcel_type mapping
    if (activeFilters.sectionType === 'urbaine') {
      query = query.eq('parcel_type', 'Terrain bâti');
    } else if (activeFilters.sectionType === 'rurale') {
      query = query.eq('parcel_type', 'Terrain nu');
    }

    // Filtres urbains
    if (activeFilters.ville) {
      query = query.ilike('ville', `%${activeFilters.ville}%`);
    }
    if (activeFilters.commune) {
      query = query.ilike('commune', `%${activeFilters.commune}%`);
    }
    if (activeFilters.quartier) {
      query = query.ilike('quartier', `%${activeFilters.quartier}%`);
    }
    if (activeFilters.avenue) {
      query = query.ilike('avenue', `%${activeFilters.avenue}%`);
    }
    // Filtres ruraux
    if (activeFilters.territoire) {
      query = query.ilike('territoire', `%${activeFilters.territoire}%`);
    }
    if (activeFilters.collectivite) {
      query = query.ilike('collectivite', `%${activeFilters.collectivite}%`);
    }
    if (activeFilters.groupement) {
      query = query.ilike('groupement', `%${activeFilters.groupement}%`);
    }
    if (activeFilters.village) {
      query = query.ilike('village', `%${activeFilters.village}%`);
    }

    // Filtres de propriétaire
    if (activeFilters.ownerName) {
      query = query.ilike('current_owner_name', `%${activeFilters.ownerName}%`);
    }

    // Filtres de superficie — ne pas appliquer si 0 ou undefined
    if (activeFilters.areaSqmMin !== undefined && activeFilters.areaSqmMin > 0) {
      query = query.gte('area_sqm', activeFilters.areaSqmMin);
    }
    if (activeFilters.areaSqmMax !== undefined && activeFilters.areaSqmMax > 0) {
      query = query.lte('area_sqm', activeFilters.areaSqmMax);
    }

    // Filtres de type
    if (activeFilters.parcelType) {
      query = query.eq('parcel_type', activeFilters.parcelType);
    }
    if (activeFilters.titleType) {
      query = query.eq('property_title_type', activeFilters.titleType);
    }

    // Pagination
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    return query;
  };

  const searchParcels = async (customFilters?: SearchFilters, pageNum: number = 0): Promise<ParcelSearchResult[]> => {
    setLoading(true);
    const activeFilters = customFilters || filters;

    try {
      const { data, error, count } = await buildQuery(activeFilters, pageNum);

      if (error) throw error;

      let filteredData: any[] = data || [];

      // Filtres de proximité (post-processing)
      if (activeFilters.proximityLat && activeFilters.proximityLng && activeFilters.proximityRadius) {
        filteredData = filteredData.filter(parcel => {
          if (!parcel.latitude || !parcel.longitude) return false;
          const distance = calculateDistance(
            activeFilters.proximityLat!,
            activeFilters.proximityLng!,
            parcel.latitude,
            parcel.longitude
          );
          return distance <= activeFilters.proximityRadius!;
        });
      }

      // Filtres de statut (nécessite des requêtes supplémentaires) - Mode ET
      const hasStatusFilters = activeFilters.hasBuildingPermit || activeFilters.hasMortgage || activeFilters.hasTaxArrears;
      
      if (hasStatusFilters && filteredData.length > 0) {
        const parcelIds = filteredData.map(p => p.id);
        
        const [permitsData, mortgagesData, taxData] = await Promise.all([
          activeFilters.hasBuildingPermit 
            ? supabase.from('cadastral_building_permits').select('parcel_id').in('parcel_id', parcelIds)
            : Promise.resolve({ data: [] }),
          activeFilters.hasMortgage
            ? supabase.from('cadastral_mortgages').select('parcel_id').in('parcel_id', parcelIds)
            : Promise.resolve({ data: [] }),
          activeFilters.hasTaxArrears
            ? supabase.from('cadastral_tax_history').select('parcel_id').eq('payment_status', 'overdue').in('parcel_id', parcelIds)
            : Promise.resolve({ data: [] })
        ]);

        const parcelsWithPermits = new Set(permitsData.data?.map(p => p.parcel_id) || []);
        const parcelsWithMortgages = new Set(mortgagesData.data?.map(p => p.parcel_id) || []);
        const parcelsWithTaxArrears = new Set(taxData.data?.map(p => p.parcel_id) || []);

        let enrichedData = filteredData.map(parcel => ({
          ...parcel,
          has_building_permit: parcelsWithPermits.has(parcel.id),
          has_mortgage: parcelsWithMortgages.has(parcel.id),
          has_tax_arrears: parcelsWithTaxArrears.has(parcel.id)
        })) as ParcelSearchResult[];

        if (activeFilters.hasBuildingPermit) {
          enrichedData = enrichedData.filter(p => p.has_building_permit);
        }
        if (activeFilters.hasMortgage) {
          enrichedData = enrichedData.filter(p => p.has_mortgage);
        }
        if (activeFilters.hasTaxArrears) {
          enrichedData = enrichedData.filter(p => p.has_tax_arrears);
        }

        filteredData = enrichedData;
      }

      const totalFromDb = count ?? 0;

      if (pageNum === 0) {
        setResults(filteredData);
      } else {
        setResults(prev => [...prev, ...filteredData]);
      }
      
      setTotalCount(totalFromDb);
      setPage(pageNum);
      setHasMore((pageNum + 1) * PAGE_SIZE < totalFromDb);
      
      return filteredData;
    } catch (error) {
      console.error('Erreur recherche avancée:', error);
      setResults([]);
      setTotalCount(0);
      setHasMore(false);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      searchParcels(filters, page + 1);
    }
  };

  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({});
    setResults([]);
    setTotalCount(0);
    setPage(0);
    setHasMore(false);
  };

  return {
    filters,
    results,
    loading,
    totalCount,
    hasMore,
    updateFilters,
    clearFilters,
    searchParcels,
    loadMore
  };
};
