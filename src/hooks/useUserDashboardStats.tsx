import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UserDashboardStats {
  contributions_total: number;
  contributions_pending: number;
  contributions_approved: number;
  contributions_rejected: number;
  titles_total: number;
  titles_pending: number;
  invoices_total: number;
  invoices_pending: number;
  disputes_total: number;
  disputes_active: number;
  permits_total: number;
  permits_pending: number;
}

const EMPTY_STATS: UserDashboardStats = {
  contributions_total: 0, contributions_pending: 0, contributions_approved: 0, contributions_rejected: 0,
  titles_total: 0, titles_pending: 0,
  invoices_total: 0, invoices_pending: 0,
  disputes_total: 0, disputes_active: 0,
  permits_total: 0, permits_pending: 0,
};

/**
 * Single RPC call replacing the 4+ parallel `count` queries scattered across
 * the user dashboard. Cached for 2 minutes via react-query.
 */
export function useUserDashboardStats() {
  const { user } = useAuth();
  return useQuery<UserDashboardStats>({
    queryKey: ['user-dashboard-stats', user?.id],
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!user?.id) return EMPTY_STATS;
      const { data, error } = await supabase.rpc('get_user_dashboard_stats', {
        target_user_id: user.id,
      });
      if (error) {
        console.warn('get_user_dashboard_stats failed:', error.message);
        return EMPTY_STATS;
      }
      return { ...EMPTY_STATS, ...(data as Partial<UserDashboardStats>) };
    },
  });
}
