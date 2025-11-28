import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MapConfig {
  enabled?: boolean;
  defaultZoom?: number;
  defaultCenter?: { lat: number; lng: number };
  showMarkers?: boolean;
  autoCalculateSurface?: boolean;
  minMarkers?: number;
  maxMarkers?: number;
  markerColor?: string;
  showSideDimensions?: boolean;
  dimensionUnit?: string;
  dimensionTextColor?: string;
  dimensionFontSize?: number;
  dimensionFormat?: string;
  allowDimensionEditing?: boolean;
  showSideLabels?: boolean;
  lineColor?: string;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed';
  fillColor?: string;
  fillOpacity?: number;
  minSurfaceSqm?: number;
  maxSurfaceSqm?: number;
  enableEditing?: boolean;
  enableDragging?: boolean;
  enableConflictDetection?: boolean;
  enableRoadBorderingFeature?: boolean;
  roadTypes?: Array<{ value: string; label: string }>;
}

// Configuration par défaut de secours (garantit toujours des valeurs valides)
const DEFAULT_MAP_CONFIG: MapConfig = {
  enabled: true,
  defaultZoom: 15,
  defaultCenter: { lat: -4.0383, lng: 21.7587 },
  showMarkers: true,
  autoCalculateSurface: true,
  minMarkers: 3,
  maxMarkers: 50,
  markerColor: '#3b82f6',
  showSideDimensions: true,
  dimensionUnit: 'm',
  dimensionTextColor: '#000000',
  dimensionFontSize: 11,
  dimensionFormat: '{value}m',
  allowDimensionEditing: true,
  showSideLabels: true,
  lineColor: '#3b82f6',
  lineWidth: 3,
  lineStyle: 'solid',
  fillColor: '#3b82f6',
  fillOpacity: 0.2,
  minSurfaceSqm: 0,
  maxSurfaceSqm: 100000,
  enableEditing: true,
  enableDragging: true,
  enableConflictDetection: true,
  enableRoadBorderingFeature: true,
  roadTypes: [
    { value: 'nationale', label: 'Route Nationale' },
    { value: 'provinciale', label: 'Route Provinciale' },
    { value: 'urbaine', label: 'Route Urbaine' },
    { value: 'avenue', label: 'Avenue' },
    { value: 'rue', label: 'Rue' },
    { value: 'ruelle', label: 'Ruelle' },
    { value: 'chemin', label: 'Chemin' },
    { value: 'piste', label: 'Piste' },
  ]
};

export const useMapConfig = () => {
  const [config, setConfig] = useState<MapConfig>(DEFAULT_MAP_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMapConfig();

    // Écouter les changements en temps réel
    const channel = supabase
      .channel('map_config_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cadastral_contribution_config',
          filter: 'config_key=eq.map_preview_settings'
        },
        () => {
          fetchMapConfig();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMapConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('cadastral_contribution_config')
        .select('config_value')
        .eq('config_key', 'map_preview_settings')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Erreur lors de la récupération de la config carte:', error);
        setConfig(DEFAULT_MAP_CONFIG);
        return;
      }

      if (data?.config_value) {
        // Fusionner avec les valeurs par défaut pour éviter les clés manquantes
        const mergedConfig = {
          ...DEFAULT_MAP_CONFIG,
          ...data.config_value as MapConfig
        };
        
        // Convertir les couleurs HSL si nécessaire
        if (mergedConfig.markerColor?.includes('var(--')) {
          mergedConfig.markerColor = '#3b82f6'; // Fallback pour les variables CSS
        }
        if (mergedConfig.lineColor?.includes('var(--')) {
          mergedConfig.lineColor = '#3b82f6';
        }
        if (mergedConfig.fillColor?.includes('var(--')) {
          mergedConfig.fillColor = '#3b82f6';
        }
        
        setConfig(mergedConfig);
      } else {
        setConfig(DEFAULT_MAP_CONFIG);
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la config carte:', err);
      setConfig(DEFAULT_MAP_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  return { config, loading, refetch: fetchMapConfig };
};
