import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TestDataStats } from './types';

const EMPTY_STATS: TestDataStats = {
  contributions: 0,
  invoices: 0,
  payments: 0,
  cccCodes: 0,
  serviceAccess: 0,
};

export const useTestDataStats = () => {
  const [stats, setStats] = useState<TestDataStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        supabase
          .from('cadastral_contributions')
          .select('id', { count: 'exact', head: true })
          .ilike('parcel_number', 'TEST-%'),
        supabase
          .from('cadastral_invoices')
          .select('id', { count: 'exact', head: true })
          .ilike('parcel_number', 'TEST-%'),
        supabase
          .from('payment_transactions')
          .select('id', { count: 'exact', head: true })
          .filter('metadata->>test_mode', 'eq', 'true'),
        supabase
          .from('cadastral_contributor_codes')
          .select('id', { count: 'exact', head: true })
          .ilike('parcel_number', 'TEST-%'),
        supabase
          .from('cadastral_service_access')
          .select('id', { count: 'exact', head: true })
          .ilike('parcel_number', 'TEST-%'),
      ]);

      setStats({
        contributions:
          results[0].status === 'fulfilled' ? results[0].value.count || 0 : 0,
        invoices:
          results[1].status === 'fulfilled' ? results[1].value.count || 0 : 0,
        payments:
          results[2].status === 'fulfilled' ? results[2].value.count || 0 : 0,
        cccCodes:
          results[3].status === 'fulfilled' ? results[3].value.count || 0 : 0,
        serviceAccess:
          results[4].status === 'fulfilled' ? results[4].value.count || 0 : 0,
      });
    } catch (error) {
      console.error('Error loading test data stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const total =
    stats.contributions + stats.invoices + stats.payments + stats.cccCodes + stats.serviceAccess;

  return { stats, total, loading, refresh };
};
