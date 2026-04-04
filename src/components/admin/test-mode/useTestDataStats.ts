import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TestDataStats } from './types';
import { EMPTY_STATS } from './types';

/**
 * Hook to load test data statistics via server-side RPC.
 * Uses count_test_data_stats() to avoid massive .in() queries from frontend.
 */
export const useTestDataStats = () => {
  const [stats, setStats] = useState<TestDataStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('count_test_data_stats');
      if (error) {
        console.error('Error loading test data stats via RPC:', error);
        return;
      }

      if (data) {
        const d = data as Record<string, number>;
        setStats({
          parcels: d.parcels || 0,
          contributions: d.contributions || 0,
          invoices: d.invoices || 0,
          payments: d.payments || 0,
          cccCodes: d.cccCodes || 0,
          serviceAccess: d.serviceAccess || 0,
          titleRequests: d.titleRequests || 0,
          expertiseRequests: d.expertiseRequests || 0,
          expertisePayments: d.expertisePayments || 0,
          disputes: d.disputes || 0,
          boundaryConflicts: d.boundaryConflicts || 0,
          ownershipHistory: d.ownershipHistory || 0,
          taxHistory: d.taxHistory || 0,
          fraudAttempts: d.fraudAttempts || 0,
          certificates: d.certificates || 0,
          boundaryHistory: d.boundaryHistory || 0,
          mortgages: d.mortgages || 0,
          buildingPermits: d.buildingPermits || 0,
          mutationRequests: d.mutationRequests || 0,
          subdivisionRequests: d.subdivisionRequests || 0,
        });
      }
    } catch (error) {
      console.error('Error loading test data stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const total = useMemo(() => Object.values(stats).reduce((sum, v) => sum + v, 0), [stats]);

  return { stats, total, loading, refresh };
};
