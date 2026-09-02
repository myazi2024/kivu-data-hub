import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Contexte cadastral d'une parcelle utilisé pour pré-remplir le formulaire
 * d'expertise immobilière. Les données proviennent de la RPC sécurisée
 * `get_parcel_expertise_prefill` (utilisateurs connectés uniquement, sans PII).
 */
export interface ParcelExpertisePrefill {
  id?: string;
  parcel_number?: string;
  area_sqm?: number | null;
  province?: string | null;
  ville?: string | null;
  commune?: string | null;
  quartier?: string | null;
  property_category?: string | null;
  property_title_type?: string | null;
  construction_type?: string | null;
  construction_nature?: string | null;
  construction_materials?: string | null;
  construction_year?: number | null;
  declared_usage?: string | null;
  standing?: string | null;
  floor_number?: string | null;
  building_height?: number | null;
  additional_constructions?: any[] | null;
  sound_environment?: string | null;
  is_rented?: boolean | null;
  is_occupied?: boolean | null;
  monthly_rent_usd?: number | null;
  rental_configuration?: string | null;
  rental_units?: any[] | null;
  rental_units_count?: number | null;
  rental_start_date?: string | null;
  hosting_capacity?: number | null;
  occupant_count?: number | null;
  apartment_number?: string | null;
  apartment_height?: number | null;
  apartment_width?: number | null;
  apartment_length?: number | null;
  apartment_orientation?: string | null;
}

export function useParcelExpertisePrefill(parcelNumber?: string, enabled = true) {
  return useQuery({
    queryKey: ['parcel-expertise-prefill', parcelNumber],
    enabled: enabled && !!parcelNumber,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ParcelExpertisePrefill | null> => {
      const { data, error } = await (supabase as any).rpc('get_parcel_expertise_prefill', {
        p_parcel_number: parcelNumber,
      });
      if (error) {
        console.error('get_parcel_expertise_prefill error:', error);
        return null;
      }
      return (data as ParcelExpertisePrefill) || null;
    },
  });
}
