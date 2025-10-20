import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SearchConfig {
  id: string;
  config_key: string;
  config_value: any;
  description: string | null;
  is_active: boolean;
}

export const useSearchConfig = () => {
  const [configs, setConfigs] = useState<SearchConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('cadastral_search_config')
        .select('*')
        .order('config_key');

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error('Erreur chargement configs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les configurations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();

    // Supabase Realtime pour synchronisation instantanée
    const channel = supabase
      .channel('cadastral_search_config_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cadastral_search_config'
        },
        (payload) => {
          console.log('Config change detected:', payload);
          fetchConfigs();
          
          toast({
            title: "Configuration mise à jour",
            description: "Les paramètres de recherche ont été synchronisés",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getConfigByKey = (key: string) => {
    return configs.find(c => c.config_key === key && c.is_active);
  };

  const getAnimatedExamples = (): string[] => {
    const config = getConfigByKey('animated_examples');
    return config?.config_value || ["SU/2130/KIN", "SU/0456/GOM", "SR/01/0987/BEN", "SR/0321/MAS"];
  };

  const getFormatConfig = (type: 'urbain' | 'rural') => {
    const config = getConfigByKey(`format_${type}`);
    return config?.config_value || null;
  };

  const getErrorMessages = () => {
    const config = getConfigByKey('error_messages');
    return config?.config_value || {
      not_found: "Aucune parcelle trouvée pour ce numéro cadastral.",
      not_found_help: "Cette parcelle n'est pas encore dans notre base ou le numéro est incorrect.",
      verification_prompt: "Vérifiez vos informations avant de contribuer."
    };
  };

  return {
    configs,
    loading,
    refetch: fetchConfigs,
    getConfigByKey,
    getAnimatedExamples,
    getFormatConfig,
    getErrorMessages
  };
};
