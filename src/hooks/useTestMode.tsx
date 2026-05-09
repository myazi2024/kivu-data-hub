import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TestModeConfig {
  enabled: boolean;
  auto_cleanup: boolean;
  test_data_retention_days: number;
}

export const DEFAULT_TEST_MODE_CONFIG: TestModeConfig = {
  enabled: false,
  auto_cleanup: false,
  test_data_retention_days: 7,
};

/**
 * Hook pour gérer le mode test global de l'admin.
 * Fix #3/#4: Stable callback refs, proper useEffect deps.
 * Fix #16: Uses console.error only — toast handled by callers.
 */
export const useTestMode = () => {
  const [testMode, setTestMode] = useState<TestModeConfig>(DEFAULT_TEST_MODE_CONFIG);
  const [loading, setLoading] = useState(true);

  const loadTestModeConfig = useCallback(async () => {
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
          test_data_retention_days: mode.test_data_retention_days ?? 7,
        });
      }
    } catch (error) {
      console.error('Error loading test mode configuration:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTestModeConfig();

    const channel = supabase
      .channel('test-mode-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cadastral_search_config',
          filter: 'config_key=eq.test_mode',
        },
        () => loadTestModeConfig()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTestModeConfig]);

  return {
    testMode,
    loading,
    isTestModeActive: testMode.enabled,
    refreshConfiguration: loadTestModeConfig,
  };
};
