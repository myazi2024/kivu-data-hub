import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ExpertiseAdminStats {
  total: number;
  pending: number;
  assigned: number;
  in_progress: number;
  completed: number;
  rejected: number;
  unpaid: number;
  overdue: number;
  escalated: number;
}

const ZERO: ExpertiseAdminStats = {
  total: 0, pending: 0, assigned: 0, in_progress: 0,
  completed: 0, rejected: 0, unpaid: 0, overdue: 0, escalated: 0,
};

/**
 * One RPC returning all admin expertise KPIs (replaces 4+ count() queries).
 */
export function useExpertiseStats(overdueDays = 14) {
  return useQuery({
    queryKey: ['admin-expertise-stats', overdueDays],
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async (): Promise<ExpertiseAdminStats> => {
      const { data, error } = await (supabase as any).rpc(
        'get_admin_expertise_stats',
        { p_overdue_days: overdueDays }
      );
      if (error) throw error;
      return { ...ZERO, ...((data || {}) as Partial<ExpertiseAdminStats>) };
    },
  });
}
