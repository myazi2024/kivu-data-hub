import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminPendingCounts {
  contributions: number;
  land_titles: number;
  permits: number;
  mutations: number;
  expertise: number;
  subdivisions: number;
  payments: number;
  disputes: number;
  mortgages: number;
}

const ZERO: AdminPendingCounts = {
  contributions: 0, land_titles: 0, permits: 0, mutations: 0,
  expertise: 0, subdivisions: 0, payments: 0, disputes: 0, mortgages: 0,
};

/**
 * Single RPC replacing 9 parallel pendingCount queries.
 * Refetches every 60s, stale after 30s.
 */
export function useAdminPendingCounts(enabled: boolean) {
  const query = useQuery({
    queryKey: ['admin-pending-counts'],
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async (): Promise<AdminPendingCounts> => {
      const { data, error } = await (supabase as any).rpc('get_admin_pending_counts');
      if (error) throw error;
      return { ...ZERO, ...(data || {}) } as AdminPendingCounts;
    },
  });

  return {
    counts: query.data || ZERO,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
