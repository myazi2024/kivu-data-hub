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
      const [parcelIdsRes, contribIdsRes] = await Promise.all([
        supabase.from('cadastral_parcels').select('id').ilike('parcel_number', 'TEST-%'),
        supabase.from('cadastral_contributions').select('id').ilike('parcel_number', 'TEST-%'),
      ]);
      const parcelIds = parcelIdsRes.data?.map(r => r.id) ?? [];
      const contribIds = contribIdsRes.data?.map(r => r.id) ?? [];

      // Now run all count queries in true parallel
      const results = await Promise.allSettled([
        /* 0  */ supabase.from('cadastral_parcels').select('id', { count: 'exact', head: true }).ilike('parcel_number', 'TEST-%'),
        /* 1  */ supabase.from('cadastral_contributions').select('id', { count: 'exact', head: true }).ilike('parcel_number', 'TEST-%'),
        /* 2  */ supabase.from('cadastral_invoices').select('id', { count: 'exact', head: true }).ilike('parcel_number', 'TEST-%'),
        /* 3  */ supabase.from('payment_transactions').select('id', { count: 'exact', head: true }).filter('metadata->>test_mode', 'eq', 'true'),
        /* 4  */ supabase.from('cadastral_contributor_codes').select('id', { count: 'exact', head: true }).ilike('parcel_number', 'TEST-%'),
        /* 5  */ supabase.from('cadastral_service_access').select('id', { count: 'exact', head: true }).ilike('parcel_number', 'TEST-%'),
        /* 6  */ supabase.from('land_title_requests').select('id', { count: 'exact', head: true }).ilike('reference_number', 'TEST-%'),
        /* 7  */ supabase.from('real_estate_expertise_requests').select('id', { count: 'exact', head: true }).ilike('reference_number', 'TEST-%'),
        /* 8  */ supabase.from('cadastral_land_disputes').select('id', { count: 'exact', head: true }).ilike('parcel_number', 'TEST-%'),
        /* 9  */ supabase.from('cadastral_boundary_conflicts').select('id', { count: 'exact', head: true }).ilike('reporting_parcel_number', 'TEST-%'),
        /* 10 */ parcelIds.length > 0
          ? supabase.from('cadastral_ownership_history').select('id', { count: 'exact', head: true }).in('parcel_id', parcelIds)
          : Promise.resolve({ count: 0 }),
        /* 11 */ parcelIds.length > 0
          ? supabase.from('cadastral_tax_history').select('id', { count: 'exact', head: true }).in('parcel_id', parcelIds)
          : Promise.resolve({ count: 0 }),
        /* 12 */ contribIds.length > 0
          ? supabase.from('fraud_attempts').select('id', { count: 'exact', head: true }).in('contribution_id', contribIds)
          : Promise.resolve({ count: 0 }),
        /* 13 */ supabase.from('generated_certificates').select('id', { count: 'exact', head: true }).ilike('reference_number', 'TEST-%'),
        /* 14 */ parcelIds.length > 0
          ? supabase.from('cadastral_boundary_history').select('id', { count: 'exact', head: true }).in('parcel_id', parcelIds)
          : Promise.resolve({ count: 0 }),
        /* 15 */ parcelIds.length > 0
          ? supabase.from('cadastral_mortgages').select('id', { count: 'exact', head: true }).in('parcel_id', parcelIds)
          : Promise.resolve({ count: 0 }),
        /* 16 */ parcelIds.length > 0
          ? supabase.from('cadastral_building_permits').select('id', { count: 'exact', head: true }).in('parcel_id', parcelIds)
          : Promise.resolve({ count: 0 }),
        /* 17 */ supabase.from('mutation_requests').select('id', { count: 'exact', head: true }).ilike('reference_number', 'TEST-%'),
        /* 18 */ supabase.from('subdivision_requests').select('id', { count: 'exact', head: true }).ilike('reference_number', 'TEST-%'),
        /* 19 */ supabase.from('expertise_payments').select('id', { count: 'exact', head: true }).ilike('expertise_request_id', 'TEST-%').then(() => {
          // expertise_payments links via expertise_request_id FK; count those whose request has TEST-% reference
          return Promise.resolve({ count: 0 });
        }),
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
        boundaryHistory: count(14),
        mortgages: count(15),
        buildingPermits: count(16),
        mutationRequests: count(17),
        subdivisionRequests: count(18),
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
