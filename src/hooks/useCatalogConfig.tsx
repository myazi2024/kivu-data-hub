import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CatalogConfig {
  search_animated_examples: string[];
  search_predictive_settings: {
    enabled: boolean;
    min_chars: number;
    debounce_ms: number;
    max_results: number;
  };
  discount_code_placeholders: string[];
  ccc_configuration: {
    base_value_usd: number;
    validity_days: number;
    code_prefix: string;
    min_value_usd: number;
  };
  ui_display_settings: {
    services_expanded_by_default: boolean;
    show_data_availability_indicator: boolean;
    animation_duration_ms: number;
    placeholder_typing_speed_ms: number;
  };
  service_availability_messages: {
    all_available: string;
    partial_available: string;
    minimal_available: string;
    data_missing: string;
    data_available: string;
  };
  available_provinces: string[];
}

const DEFAULT_CONFIG: CatalogConfig = {
  search_animated_examples: ['BIC-001-RV-2024', 'SU/001/GOMA/2023', 'SR/045/BUKAVU/2024'],
  search_predictive_settings: {
    enabled: true,
    min_chars: 2,
    debounce_ms: 300,
    max_results: 5
  },
  discount_code_placeholders: ['BIC-RV001', 'PROMO2024', 'REMISE50'],
  ccc_configuration: {
    base_value_usd: 5.00,
    validity_days: 90,
    code_prefix: 'CCC-',
    min_value_usd: 0.50
  },
  ui_display_settings: {
    services_expanded_by_default: true,
    show_data_availability_indicator: true,
    animation_duration_ms: 200,
    placeholder_typing_speed_ms: 150
  },
  service_availability_messages: {
    all_available: 'Bonne nouvelle : cette parcelle dispose d\'informations cadastrales détaillées.',
    partial_available: 'Cette parcelle dispose de certaines informations cadastrales.',
    minimal_available: 'Cette parcelle dispose d\'informations limitées.',
    data_missing: 'Données manquantes',
    data_available: 'Données disponibles'
  }
};

export const useCatalogConfig = () => {
  const [config, setConfig] = useState<CatalogConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('catalog_config')
        .select('config_key, config_value')
        .eq('is_active', true);

      if (error) throw error;

      const loadedConfig = { ...DEFAULT_CONFIG };
      data?.forEach(item => {
        if (item.config_key in loadedConfig) {
          (loadedConfig as any)[item.config_key] = item.config_value;
        }
      });

      setConfig(loadedConfig);
    } catch (error) {
      console.error('Erreur chargement configuration catalogue:', error);
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();

    // Écouter les changements en temps réel
    const channel = supabase
      .channel('catalog-config-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'catalog_config'
        },
        () => {
          console.log('📡 Configuration catalogue mise à jour');
          loadConfig();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    config,
    loading,
    refreshConfig: loadConfig
  };
};