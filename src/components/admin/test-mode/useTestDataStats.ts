import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TestDataStats } from './types';
import { EMPTY_STATS } from './types';

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
        supabase
          .from('land_title_requests')
          .select('id', { count: 'exact', head: true })
          .ilike('reference_number', 'TEST-%'),
        supabase
          .from('real_estate_expertise_requests')
          .select('id', { count: 'exact', head: true })
          .ilike('parcel_number', 'TEST-%'),
        supabase
          .from('cadastral_land_disputes')
          .select('id', { count: 'exact', head: true })
          .ilike('parcel_number', 'TEST-%'),
      ]);

      const count = (i: number) =>
        results[i].status === 'fulfilled' ? results[i].value.count || 0 : 0;

      setStats({
        contributions: count(0),
        invoices: count(1),
        payments: count(2),
        cccCodes: count(3),
        serviceAccess: count(4),
        titleRequests: count(5),
        expertiseRequests: count(6),
        disputes: count(7),
      });
    } catch (error) {
      console.error('Error loading test data stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const total = Object.values(stats).reduce((sum, v) => sum + v, 0);

  return { stats, total, loading, refresh };
};
