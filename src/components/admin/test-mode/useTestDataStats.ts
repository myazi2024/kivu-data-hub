import { useState, useCallback, useMemo } from 'react';
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
        supabase.from('cadastral_parcels').select('id', { count: 'exact', head: true }).ilike('parcel_number', 'TEST-%'),
        supabase.from('cadastral_contributions').select('id', { count: 'exact', head: true }).ilike('parcel_number', 'TEST-%'),
        supabase.from('cadastral_invoices').select('id', { count: 'exact', head: true }).ilike('parcel_number', 'TEST-%'),
        supabase.from('payment_transactions').select('id', { count: 'exact', head: true }).filter('metadata->>test_mode', 'eq', 'true'),
        supabase.from('cadastral_contributor_codes').select('id', { count: 'exact', head: true }).ilike('parcel_number', 'TEST-%'),
        supabase.from('cadastral_service_access').select('id', { count: 'exact', head: true }).ilike('parcel_number', 'TEST-%'),
        supabase.from('land_title_requests').select('id', { count: 'exact', head: true }).ilike('reference_number', 'TEST-%'),
        supabase.from('real_estate_expertise_requests').select('id', { count: 'exact', head: true }).ilike('parcel_number', 'TEST-%'),
        supabase.from('cadastral_land_disputes').select('id', { count: 'exact', head: true }).ilike('parcel_number', 'TEST-%'),
        supabase.from('cadastral_boundary_conflicts').select('id', { count: 'exact', head: true }).ilike('reporting_parcel_number', 'TEST-%'),
        supabase.from('cadastral_ownership_history').select('id', { count: 'exact', head: true })
          .in('parcel_id', (await supabase.from('cadastral_parcels').select('id').ilike('parcel_number', 'TEST-%')).data?.map(r => r.id) ?? []),
        supabase.from('cadastral_tax_history').select('id', { count: 'exact', head: true })
          .in('parcel_id', (await supabase.from('cadastral_parcels').select('id').ilike('parcel_number', 'TEST-%')).data?.map(r => r.id) ?? []),
        supabase.from('fraud_attempts').select('id', { count: 'exact', head: true })
          .in('contribution_id', (await supabase.from('cadastral_contributions').select('id').ilike('parcel_number', 'TEST-%')).data?.map(r => r.id) ?? []),
        supabase.from('generated_certificates').select('id', { count: 'exact', head: true }).ilike('reference_number', 'TEST-%'),
      ]);

      const count = (i: number) =>
        results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<any>).value.count || 0 : 0;

      setStats({
        parcels: count(0),
        contributions: count(1),
        invoices: count(2),
        payments: count(3),
        cccCodes: count(4),
        serviceAccess: count(5),
        titleRequests: count(6),
        expertiseRequests: count(7),
        disputes: count(8),
        boundaryConflicts: count(9),
        ownershipHistory: count(10),
        taxHistory: count(11),
        fraudAttempts: count(12),
        certificates: count(13),
      });
    } catch (error) {
      console.error('Error loading test data stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const total = useMemo(() => Object.values(stats).reduce((sum, v) => sum + v, 0), [stats]);

  return { stats, total, loading, refresh };
};
