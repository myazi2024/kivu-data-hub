import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CadastralParcelPublic {
  id: string;
  parcel_number: string;
  area_sqm: number | null;
  surface_calculee_bornes: number | null;
  gps_coordinates: Array<{ lat: number; lng: number; borne: string }>;
  province: string | null;
  ville: string | null;
  commune: string | null;
}

export const useCadastralParcels = () => {
  return useQuery({
    queryKey: ['cadastral-parcels-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cadastral_parcels')
        .select('id, parcel_number, area_sqm, surface_calculee_bornes, gps_coordinates, province, ville, commune')
        .not('gps_coordinates', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data as CadastralParcelPublic[];
    },
  });
};
