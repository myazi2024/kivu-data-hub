import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ModuleFieldConfig {
  label: string;
  enabled: boolean;
  help?: string;
}

export interface ModuleConfig {
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
  fields?: Record<string, ModuleFieldConfig>;
  submodules?: Record<string, { label: string; enabled: boolean }>;
}

export interface ModulesInfoConfig {
  information: ModuleConfig;
  location_history: ModuleConfig;
  history: ModuleConfig;
  obligations: ModuleConfig;
}

export interface DisplaySettings {
  show_map: boolean;
  map_zoom_level: number;
  show_statistics: boolean;
  show_documents: boolean;
  default_tab: string;
  enable_pdf_download: boolean;
  enable_print: boolean;
}

export interface StatisticsConfig {
  show_area_calculation: boolean;
  show_tax_status: boolean;
  show_owner_duration: boolean;
  currency: string;
  area_unit: string;
}

export interface HelpTexts {
  property_title: string;
  area_calculation: string;
  tax_status: string;
  gps_coordinates: string;
}

export const useResultsConfig = () => {
  const [modulesInfo, setModulesInfo] = useState<ModulesInfoConfig | null>(null);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings | null>(null);
  const [statisticsConfig, setStatisticsConfig] = useState<StatisticsConfig | null>(null);
  const [helpTexts, setHelpTexts] = useState<HelpTexts | null>(null);
  const [loading, setLoading] = useState(true);

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('cadastral_results_config')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      data?.forEach((config) => {
        switch (config.config_key) {
          case 'modules_info':
            setModulesInfo(config.config_value as unknown as ModulesInfoConfig);
            break;
          case 'display_settings':
            setDisplaySettings(config.config_value as unknown as DisplaySettings);
            break;
          case 'statistics_config':
            setStatisticsConfig(config.config_value as unknown as StatisticsConfig);
            break;
          case 'help_texts':
            setHelpTexts(config.config_value as unknown as HelpTexts);
            break;
        }
      });
    } catch (error: any) {
      console.error('Error loading results config:', error);
      toast.error('Erreur lors du chargement de la configuration des résultats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();

    // Écouter les changements en temps réel
    const channel = supabase
      .channel('cadastral_results_config_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cadastral_results_config'
        },
        (payload) => {
          console.log('Results config changed:', payload);
          
          if (payload.eventType === 'DELETE') {
            toast.info('Configuration des résultats mise à jour');
            loadConfigs();
            return;
          }

          const newConfig = payload.new as any;
          
          if (!newConfig.is_active) {
            loadConfigs();
            return;
          }

          switch (newConfig.config_key) {
            case 'modules_info':
              setModulesInfo(newConfig.config_value as unknown as ModulesInfoConfig);
              toast.success('Modules de résultats mis à jour');
              break;
            case 'display_settings':
              setDisplaySettings(newConfig.config_value as unknown as DisplaySettings);
              toast.success('Paramètres d\'affichage mis à jour');
              break;
            case 'statistics_config':
              setStatisticsConfig(newConfig.config_value as unknown as StatisticsConfig);
              toast.success('Configuration des statistiques mise à jour');
              break;
            case 'help_texts':
              setHelpTexts(newConfig.config_value as unknown as HelpTexts);
              toast.success('Textes d\'aide mis à jour');
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateConfig = async (configKey: string, configValue: any) => {
    try {
      const { error } = await supabase
        .from('cadastral_results_config')
        .update({ 
          config_value: configValue,
          updated_at: new Date().toISOString()
        })
        .eq('config_key', configKey);

      if (error) throw error;

      toast.success('Configuration mise à jour avec succès');
      return true;
    } catch (error: any) {
      console.error('Error updating config:', error);
      toast.error('Erreur lors de la mise à jour de la configuration');
      return false;
    }
  };

  return {
    modulesInfo,
    displaySettings,
    statisticsConfig,
    helpTexts,
    loading,
    updateConfig,
    refreshConfigs: loadConfigs
  };
};
