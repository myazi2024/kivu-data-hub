import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SearchFilters {
  parcelNumber?: string;
  owner?: string;
  province?: string;
  ville?: string;
  commune?: string;
  quartier?: string;
  minArea?: number;
  maxArea?: number;
  parcelType?: string;
  titleType?: string;
  hasPermit?: boolean;
  hasMortgage?: boolean;
  hasTaxArrears?: boolean;
  proximityLat?: number;
  proximityLng?: number;
  proximityRadius?: number; // en mètres
  drawingCoords?: any[];
}

interface ParcelResult {
  id: string;
  parcel_number: string;
  gps_coordinates: any;
  parcel_sides: any;
  latitude: number;
  longitude: number;
  current_owner_name: string;
  area_sqm: number;
  province: string;
  ville: string;
  commune: string;
  quartier: string;
  parcel_type: string;
  property_title_type: string;
}

export const useCadastralMapSearch = () => {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<ParcelResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState<'area' | 'owner' | 'date'>('area');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const searchParcels = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('cadastral_parcels')
        .select('id, parcel_number, gps_coordinates, parcel_sides, current_owner_name, area_sqm, province, ville, commune, quartier, latitude, longitude, parcel_type, property_title_type, created_at', { count: 'exact' })
        .is('deleted_at', null);

      // Filtres de base
      if (filters.parcelNumber) {
        query = query.ilike('parcel_number', `%${filters.parcelNumber}%`);
      }

      if (filters.owner) {
        query = query.ilike('current_owner_name', `%${filters.owner}%`);
      }

      // Filtres géographiques
      if (filters.province) {
        query = query.eq('province', filters.province);
      }
      if (filters.ville) {
        query = query.eq('ville', filters.ville);
      }
      if (filters.commune) {
        query = query.eq('commune', filters.commune);
      }
      if (filters.quartier) {
        query = query.eq('quartier', filters.quartier);
      }

      // Filtres de superficie
      if (filters.minArea) {
        query = query.gte('area_sqm', filters.minArea);
      }
      if (filters.maxArea) {
        query = query.lte('area_sqm', filters.maxArea);
      }

      // Filtres de type
      if (filters.parcelType) {
        query = query.eq('parcel_type', filters.parcelType);
      }
      if (filters.titleType) {
        query = query.eq('property_title_type', filters.titleType);
      }

      // Tri
      const sortColumn = sortBy === 'area' ? 'area_sqm' : sortBy === 'owner' ? 'current_owner_name' : 'created_at';
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

      const { data, error, count } = await query.limit(500);

      if (error) {
        console.error('Erreur recherche:', error);
        toast.error('Erreur lors de la recherche');
        return;
      }

      let transformedData = (data || []).map(parcel => {
        let latitude = parcel.latitude;
        let longitude = parcel.longitude;
        
        if (!latitude && !longitude && parcel.gps_coordinates && Array.isArray(parcel.gps_coordinates) && parcel.gps_coordinates.length > 0) {
          const firstCoord = parcel.gps_coordinates[0] as any;
          latitude = firstCoord.lat || firstCoord.latitude;
          longitude = firstCoord.lng || firstCoord.longitude;
        }

        return {
          ...parcel,
          latitude: latitude || 0,
          longitude: longitude || 0
        };
      }).filter(p => p.latitude !== 0 && p.longitude !== 0);

      // Filtres de statut (nécessitent des jointures)
      if (filters.hasPermit !== undefined || filters.hasMortgage !== undefined || filters.hasTaxArrears !== undefined) {
        const parcelIds = transformedData.map(p => p.id);
        
        if (filters.hasPermit !== undefined) {
          const { data: permits } = await supabase
            .from('cadastral_building_permits')
            .select('parcel_id')
            .in('parcel_id', parcelIds);
          
          const parcelsWithPermit = new Set(permits?.map(p => p.parcel_id) || []);
          transformedData = transformedData.filter(p => 
            filters.hasPermit ? parcelsWithPermit.has(p.id) : !parcelsWithPermit.has(p.id)
          );
        }

        if (filters.hasMortgage !== undefined) {
          const { data: mortgages } = await supabase
            .from('cadastral_mortgages')
            .select('parcel_id')
            .in('parcel_id', parcelIds)
            .eq('mortgage_status', 'active');
          
          const parcelsWithMortgage = new Set(mortgages?.map(m => m.parcel_id) || []);
          transformedData = transformedData.filter(p => 
            filters.hasMortgage ? parcelsWithMortgage.has(p.id) : !parcelsWithMortgage.has(p.id)
          );
        }

        if (filters.hasTaxArrears !== undefined) {
          const { data: taxes } = await supabase
            .from('cadastral_tax_history')
            .select('parcel_id')
            .in('parcel_id', parcelIds)
            .eq('payment_status', 'pending');
          
          const parcelsWithTaxArrears = new Set(taxes?.map(t => t.parcel_id) || []);
          transformedData = transformedData.filter(p => 
            filters.hasTaxArrears ? parcelsWithTaxArrears.has(p.id) : !parcelsWithTaxArrears.has(p.id)
          );
        }
      }

      // Filtre de proximité
      if (filters.proximityLat && filters.proximityLng && filters.proximityRadius) {
        transformedData = transformedData.filter(parcel => {
          const distance = calculateDistance(
            filters.proximityLat!,
            filters.proximityLng!,
            parcel.latitude,
            parcel.longitude
          );
          return distance <= filters.proximityRadius!;
        });
      }

      // Filtre de zone de dessin
      if (filters.drawingCoords && filters.drawingCoords.length > 0) {
        transformedData = transformedData.filter(parcel => 
          isPointInPolygon(parcel.latitude, parcel.longitude, filters.drawingCoords!)
        );
      }

      setResults(transformedData);
      setTotalCount(count || transformedData.length);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  }, [filters, sortBy, sortOrder]);

  useEffect(() => {
    searchParcels();
  }, [searchParcels]);

  return {
    filters,
    setFilters,
    results,
    loading,
    totalCount,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    refresh: searchParcels
  };
};

// Fonction pour calculer la distance entre deux points GPS
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3; // Rayon de la Terre en mètres
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

// Fonction pour vérifier si un point est dans un polygone
const isPointInPolygon = (lat: number, lng: number, polygon: any[]): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    
    const intersect = ((yi > lng) !== (yj > lng))
        && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};
