import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TestModeConfig {
  enabled: boolean;
  auto_cleanup: boolean;
  test_data_retention_days: number;
}

/**
 * Hook pour gérer le mode test global de l'admin
 */
export const useTestMode = () => {
  const [testMode, setTestMode] = useState<TestModeConfig>({
    enabled: false,
    auto_cleanup: false,
    test_data_retention_days: 7
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadTestModeConfig = async () => {
    try {
      setLoading(true);

      const { data } = await supabase
        .from('cadastral_search_config')
        .select('config_value')
        .eq('config_key', 'test_mode')
        .eq('is_active', true)
        .maybeSingle();

      if (data?.config_value) {
        const mode = data.config_value as any;
        setTestMode({
          enabled: mode.enabled ?? false,
          auto_cleanup: mode.auto_cleanup ?? false,
          test_data_retention_days: mode.test_data_retention_days ?? 7
        });
      }
    } catch (error) {
      console.error('Error loading test mode configuration:', error);
      toast({
        title: "Erreur de configuration",
        description: "Impossible de charger le mode test",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTestModeConfig();

    // Écouter les changements de configuration en temps réel
    const channel = supabase
      .channel('test-mode-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cadastral_search_config',
          filter: 'config_key=eq.test_mode'
        },
        () => loadTestModeConfig()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isTestModeActive = (): boolean => {
    return testMode.enabled;
  };

  return {
    testMode,
    loading,
    isTestModeActive,
    refreshConfiguration: loadTestModeConfig
  };
};
