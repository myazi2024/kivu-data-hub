import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { untypedTables } from '@/integrations/supabase/untyped';
import { useTestEnvironment, applyTestFilter } from '@/hooks/useTestEnvironment';

export interface ParcelData {
  id: string;
  parcel_number: string;
  gps_coordinates: any;
  parcel_sides: any;
  latitude: number;
  longitude: number;
  /** PII payante : non exposée par la vue publique (voir modèle d'accès PII). */
  current_owner_name?: string | null;
  area_sqm: number;
  province: string;
  ville: string;
  commune: string;
  quartier: string;
  is_subdivided?: boolean;
  title_reference_number?: string | null;
  property_title_type?: string | null;
}

const PARCELS_LIMIT = 2000;

async function fetchParcels(isTestEnv: boolean): Promise<ParcelData[]> {
  // Lecture via la vue publique : `cadastral_parcels` est réservée aux admins par RLS,
  // la table directe renvoie donc 0 ligne aux visiteurs et utilisateurs standards.
  let query = untypedTables
    .generic('cadastral_parcels_public')
    .select('id, parcel_number, gps_coordinates, parcel_sides, area_sqm, province, ville, commune, quartier, latitude, longitude, is_subdivided, title_reference_number, property_title_type');
  query = applyTestFilter(query, 'parcel_number', isTestEnv);
  const { data, error } = await query.limit(PARCELS_LIMIT);
  if (error) throw error;

  return (data || []).map((parcel: any) => {
    let latitude = parcel.latitude;
    let longitude = parcel.longitude;
    if (!latitude && !longitude && Array.isArray(parcel.gps_coordinates) && parcel.gps_coordinates.length > 0) {
      const first = parcel.gps_coordinates[0];
      latitude = first.lat || first.latitude;
      longitude = first.lng || first.longitude;
    }
    return {
      ...parcel,
      latitude: latitude || 0,
      longitude: longitude || 0,
    } as ParcelData;
  }).filter(p => p.latitude !== 0 && p.longitude !== 0);
}

export interface SubdivisionLot {
  id: string;
  lot_number: string;
  parcel_number: string;
  gps_coordinates: Array<{ lat: number; lng: number }>;
  area_sqm: number;
  intended_use?: string;
  owner_name?: string | null;
  color?: string | null;
}

async function fetchSubdivisionLots(): Promise<SubdivisionLot[]> {
  const { data, error } = await supabase
    .from('subdivision_lots' as any)
    .select('id, lot_number, parcel_number, gps_coordinates, area_sqm, intended_use, owner_name, color');
  if (error) {
    console.error('Error loading subdivision lots:', error);
    return [];
  }
  return ((data as any[]) || []) as SubdivisionLot[];
}

export const useCadastralMapData = () => {
  const { isTestRoute } = useTestEnvironment();

  const parcelsQuery = useQuery({
    queryKey: ['cadastral-map', 'parcels', isTestRoute],
    queryFn: () => fetchParcels(isTestRoute),
    staleTime: 60_000,
  });

  const lotsQuery = useQuery({
    queryKey: ['cadastral-map', 'subdivision-lots'],
    queryFn: fetchSubdivisionLots,
    staleTime: 60_000,
  });

  return {
    parcels: parcelsQuery.data ?? [],
    subdivisionLots: lotsQuery.data ?? [],
    loading: parcelsQuery.isLoading,
    error: parcelsQuery.error,
    refetchParcels: parcelsQuery.refetch,
  };
};

export interface ParcelHistoryData {
  ownership_history: any[];
  tax_history: any[];
  mortgage_history: any[];
  boundary_history: any[];
  building_permits: any[];
}

export const useParcelHistory = (parcelId: string | null) => {
  return useQuery({
    queryKey: ['cadastral-map', 'parcel-history', parcelId],
    queryFn: async (): Promise<ParcelHistoryData> => {
      if (!parcelId) {
        return { ownership_history: [], tax_history: [], mortgage_history: [], boundary_history: [], building_permits: [] };
      }
      const [ownershipRes, taxRes, mortgageRes, boundaryRes, permitsRes] = await Promise.all([
        supabase.from('cadastral_ownership_history').select('*').eq('parcel_id', parcelId),
        supabase.from('cadastral_tax_history').select('*').eq('parcel_id', parcelId),
        supabase.from('cadastral_mortgages').select('*').eq('parcel_id', parcelId),
        supabase.from('cadastral_boundary_history').select('*').eq('parcel_id', parcelId),
        supabase.from('cadastral_building_permits').select('*').eq('parcel_id', parcelId),
      ]);
      return {
        ownership_history: ownershipRes.data || [],
        tax_history: taxRes.data || [],
        mortgage_history: mortgageRes.data || [],
        boundary_history: boundaryRes.data || [],
        building_permits: permitsRes.data || [],
      };
    },
    enabled: !!parcelId,
    staleTime: 30_000,
  });
};
