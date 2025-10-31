import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CadastralParcelData {
  id: string;
  parcel_number: string;
  parcel_type: string;
  property_title_type: string;
  current_owner_name: string;
  location: string;
  area_sqm: number;
  area_hectares: number | null;
  gps_coordinates: Array<{ lat: number; lng: number; borne?: string }>;
  province: string | null;
  ville: string | null;
  commune: string | null;
  quartier: string | null;
  construction_type: string | null;
  declared_usage: string | null;
  created_at: string;
}

export interface ParcelFilters {
  province?: string;
  ville?: string;
  commune?: string;
  parcel_type?: string;
  property_title_type?: string;
  min_area?: number;
  max_area?: number;
}

export const useCadastralParcels = (filters?: ParcelFilters) => {
  const [parcels, setParcels] = useState<CadastralParcelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchParcels = async () => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('cadastral_parcels')
          .select('*', { count: 'exact' })
          .not('gps_coordinates', 'is', null)
          .is('deleted_at', null);

        // Appliquer les filtres
        if (filters?.province) {
          query = query.eq('province', filters.province);
        }
        if (filters?.ville) {
          query = query.eq('ville', filters.ville);
        }
        if (filters?.commune) {
          query = query.eq('commune', filters.commune);
        }
        if (filters?.parcel_type) {
          query = query.eq('parcel_type', filters.parcel_type);
        }
        if (filters?.property_title_type) {
          query = query.eq('property_title_type', filters.property_title_type);
        }
        if (filters?.min_area) {
          query = query.gte('area_sqm', filters.min_area);
        }
        if (filters?.max_area) {
          query = query.lte('area_sqm', filters.max_area);
        }

        const { data, error: fetchError, count } = await query
          .order('created_at', { ascending: false })
          .limit(1000); // Limiter à 1000 parcelles pour la performance

        if (fetchError) throw fetchError;

        // Transformer et valider les données
        const validParcels = (data || [])
          .filter(parcel => {
            try {
              const coords = parcel.gps_coordinates as any;
              return coords && Array.isArray(coords) && coords.length >= 3 &&
                coords.every((c: any) => 
                  typeof c.lat === 'number' && 
                  typeof c.lng === 'number' &&
                  !isNaN(c.lat) && 
                  !isNaN(c.lng)
                );
            } catch {
              return false;
            }
          })
          .map(parcel => ({
            id: parcel.id,
            parcel_number: parcel.parcel_number,
            parcel_type: parcel.parcel_type,
            property_title_type: parcel.property_title_type,
            current_owner_name: parcel.current_owner_name,
            location: parcel.location,
            area_sqm: Number(parcel.area_sqm) || 0,
            area_hectares: parcel.area_hectares ? Number(parcel.area_hectares) : null,
            gps_coordinates: parcel.gps_coordinates as Array<{ lat: number; lng: number; borne?: string }>,
            province: parcel.province,
            ville: parcel.ville,
            commune: parcel.commune,
            quartier: parcel.quartier,
            construction_type: parcel.construction_type,
            declared_usage: parcel.declared_usage,
            created_at: parcel.created_at,
          }));

        setParcels(validParcels);
        setTotalCount(count || 0);
      } catch (err) {
        console.error('Erreur chargement parcelles:', err);
        setError('Erreur lors du chargement des parcelles');
      } finally {
        setLoading(false);
      }
    };

    fetchParcels();

    // Écouter les changements en temps réel
    const channel = supabase
      .channel('cadastral-parcels-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cadastral_parcels'
        },
        () => {
          fetchParcels();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters]);

  return { parcels, loading, error, totalCount };
};
