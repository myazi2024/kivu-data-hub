import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MapProvider {
  id: string;
  provider_key: string;
  provider_name: string;
  description: string | null;
  tile_url_template: string;
  attribution: string;
  max_zoom: number;
  min_zoom: number;
  requires_api_key: boolean;
  api_key_env_name: string | null;
  extra_config: Record<string, any>;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
}

const FALLBACK_PROVIDER: MapProvider = {
  id: 'fallback',
  provider_key: 'osm',
  provider_name: 'OpenStreetMap',
  description: 'Carte libre et collaborative',
  tile_url_template: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors',
  max_zoom: 19,
  min_zoom: 1,
  requires_api_key: false,
  api_key_env_name: null,
  extra_config: { subdomains: 'abc' },
  is_active: true,
  is_default: true,
  display_order: 1,
};

/**
 * Hook pour récupérer le fournisseur de carte par défaut actif.
 * Écoute les changements en temps réel sur la table map_providers.
 */
export const useMapProvider = () => {
  const [provider, setProvider] = useState<MapProvider>(FALLBACK_PROVIDER);
  const [allProviders, setAllProviders] = useState<MapProvider[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProvider = async () => {
    try {
      const { data, error } = await supabase
        .from('map_providers')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        console.error('Erreur chargement fournisseurs carte:', error);
        return;
      }

      const providers = (data || []) as unknown as MapProvider[];
      setAllProviders(providers);

      const defaultProvider = providers.find(p => p.is_default) || providers[0];
      if (defaultProvider) {
        setProvider(defaultProvider);
      }
    } catch (err) {
      console.error('Erreur chargement fournisseur carte:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProvider();

    const channel = supabase
      .channel('map_providers_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'map_providers' }, () => {
        fetchProvider();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  /**
   * Construit l'URL de tuile finale.
   * - Si le fournisseur nécessite une clé API : route via l'edge function proxy-mapbox-tiles
   *   (la clé MAPBOX_ACCESS_TOKEN reste côté serveur, jamais exposée au client).
   * - Sinon : utilise directement le template (OSM, etc.).
   * Le paramètre `apiKey` est conservé pour rétro-compatibilité mais n'est plus utilisé.
   */
  const getTileUrl = (_apiKey?: string): string => {
    const url = provider.tile_url_template;
    if (provider.requires_api_key) {
      // Pour Mapbox : extraire styleId et router via edge function
      // Pattern attendu: https://api.mapbox.com/styles/v1/{user}/{style}/tiles/{z}/{x}/{y}?access_token={apiKey}
      const m = url.match(/\/styles\/v1\/([^/]+)\/([^/]+)\/tiles/);
      if (m) {
        const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
        if (supabaseUrl) {
          return `${supabaseUrl}/functions/v1/proxy-mapbox-tiles/styles/v1/${m[1]}/${m[2]}/tiles/{z}/{x}/{y}`;
        }
      }
    }
    return url;
  };

  /**
   * Retourne les options Leaflet TileLayer depuis extra_config.
   */
  const getTileLayerOptions = (apiKey?: string) => {
    const opts: Record<string, any> = {
      attribution: provider.attribution,
      maxZoom: provider.max_zoom,
      minZoom: provider.min_zoom,
    };

    const extra = provider.extra_config || {};
    if (extra.subdomains) opts.subdomains = extra.subdomains;
    if (extra.tileSize) opts.tileSize = extra.tileSize;
    if (extra.zoomOffset !== undefined) opts.zoomOffset = extra.zoomOffset;

    return opts;
  };

  return { provider, allProviders, loading, getTileUrl, getTileLayerOptions, refetch: fetchProvider };
};
