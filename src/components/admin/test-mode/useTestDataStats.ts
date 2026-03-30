import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TestDataStats } from './types';
import { EMPTY_STATS } from './types';

/**
 * Hook to load test data statistics.
 * Fix #5: Pre-fetch shared parent IDs before Promise.allSettled to avoid
 * nested awaits that break parallelism.
 */
export const useTestDataStats = () => {
  const [stats, setStats] = useState<TestDataStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Pre-fetch shared parent IDs once (avoids duplicate sub-queries inside Promise.allSettled)
      const [parcelIdsRes, contribIdsRes, expertiseReqIdsRes] = await Promise.all([
        supabase.from('cadastral_parcels').select('id').ilike('parcel_number', 'TEST-%'),
        supabase.from('cadastral_contributions').select('id').ilike('parcel_number', 'TEST-%'),
        supabase.from('real_estate_expertise_requests').select('id').ilike('reference_number', 'TEST-%'),
      ]);
      const parcelIds = parcelIdsRes.data?.map(r => r.id) ?? [];
      const contribIds = contribIdsRes.data?.map(r => r.id) ?? [];
      const expertiseReqIds = expertiseReqIdsRes.data?.map(r => r.id) ?? [];

      // Use pre-fetched counts for parcels/contributions instead of redundant queries
      const parcelsCount = parcelIds.length;
      const contributionsCount = contribIds.length;
      const expertiseReqCount = expertiseReqIdsRes.data?.length ?? 0;

      // Now run all count queries in true parallel
      const results = await Promise.allSettled([
        /* 0  */ supabase.from('cadastral_invoices').select('id', { count: 'exact', head: true }).ilike('parcel_number', 'TEST-%'),
        /* 1  */ supabase.from('payment_transactions').select('id', { count: 'exact', head: true }).filter('metadata->>test_mode', 'eq', 'true'),
        /* 2  */ supabase.from('cadastral_contributor_codes').select('id', { count: 'exact', head: true }).ilike('parcel_number', 'TEST-%'),
        /* 3  */ supabase.from('cadastral_service_access').select('id', { count: 'exact', head: true }).ilike('parcel_number', 'TEST-%'),
        /* 4  */ supabase.from('land_title_requests').select('id', { count: 'exact', head: true }).ilike('reference_number', 'TEST-%'),
        /* 5  */ supabase.from('cadastral_land_disputes').select('id', { count: 'exact', head: true }).ilike('parcel_number', 'TEST-%'),
        /* 6  */ supabase.from('cadastral_boundary_conflicts').select('id', { count: 'exact', head: true }).ilike('reporting_parcel_number', 'TEST-%'),
        /* 7  */ parcelIds.length > 0
          ? supabase.from('cadastral_ownership_history').select('id', { count: 'exact', head: true }).in('parcel_id', parcelIds)
          : Promise.resolve({ count: 0 }),
        /* 8  */ parcelIds.length > 0
          ? supabase.from('cadastral_tax_history').select('id', { count: 'exact', head: true }).in('parcel_id', parcelIds)
          : Promise.resolve({ count: 0 }),
        /* 9  */ contribIds.length > 0
          ? supabase.from('fraud_attempts').select('id', { count: 'exact', head: true }).in('contribution_id', contribIds)
          : Promise.resolve({ count: 0 }),
        /* 10 */ supabase.from('generated_certificates').select('id', { count: 'exact', head: true }).ilike('reference_number', 'TEST-%'),
        /* 11 */ parcelIds.length > 0
          ? supabase.from('cadastral_boundary_history').select('id', { count: 'exact', head: true }).in('parcel_id', parcelIds)
          : Promise.resolve({ count: 0 }),
        /* 12 */ parcelIds.length > 0
          ? supabase.from('cadastral_mortgages').select('id', { count: 'exact', head: true }).in('parcel_id', parcelIds)
          : Promise.resolve({ count: 0 }),
        /* 13 */ parcelIds.length > 0
          ? supabase.from('cadastral_building_permits').select('id', { count: 'exact', head: true }).in('parcel_id', parcelIds)
          : Promise.resolve({ count: 0 }),
        /* 14 */ supabase.from('mutation_requests').select('id', { count: 'exact', head: true }).ilike('reference_number', 'TEST-%'),
        /* 15 */ supabase.from('subdivision_requests').select('id', { count: 'exact', head: true }).ilike('reference_number', 'TEST-%'),
        /* 16 */ expertiseReqIds.length > 0
          ? supabase.from('expertise_payments').select('id', { count: 'exact', head: true }).in('expertise_request_id', expertiseReqIds)
          : Promise.resolve({ count: 0 }),
      ]);

      const count = (i: number) =>
        results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<any>).value.count || 0 : 0;

      setStats({
        parcels: parcelsCount,
        contributions: contributionsCount,
        invoices: count(0),
        payments: count(1),
        cccCodes: count(2),
        serviceAccess: count(3),
        titleRequests: count(4),
        expertiseRequests: expertiseReqCount,
        expertisePayments: count(16),
        disputes: count(5),
        boundaryConflicts: count(6),
        ownershipHistory: count(7),
        taxHistory: count(8),
        fraudAttempts: count(9),
        certificates: count(10),
        boundaryHistory: count(11),
        mortgages: count(12),
        buildingPermits: count(13),
        mutationRequests: count(14),
        subdivisionRequests: count(15),
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
