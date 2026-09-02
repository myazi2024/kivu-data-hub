import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MortgageFee } from '@/components/cadastral/mortgage-cancellation/types';
import { DEFAULT_MORTGAGE_CANCELLATION_FEES, normalizeMortgageFees } from '@/lib/mortgageFees';

export type { MortgageFee };

export const useMortgageFees = () => {
  const [fees, setFees] = useState<MortgageFee[]>(DEFAULT_MORTGAGE_CANCELLATION_FEES);
  const [loadingFees, setLoadingFees] = useState(true);

  useEffect(() => {
    const fetchFees = async () => {
      try {
        const { data, error } = await supabase
          .from('cadastral_contribution_config')
          .select('config_value')
          .eq('config_key', 'mortgage_cancellation_fees')
          .eq('is_active', true)
          .maybeSingle();

        if (!error && data?.config_value) setFees(normalizeMortgageFees(data.config_value));
      } catch (e) {
        console.warn('Failed to load mortgage fees config, using defaults:', e);
      } finally {
        setLoadingFees(false);
      }
    };

    fetchFees();
  }, []);

  return { fees, loadingFees };
};
