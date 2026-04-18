import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardKPIs {
  total_users: number;
  new_users_period: number;
  new_users_prev: number;
  total_invoices: number;
  total_invoices_prev: number;
  total_revenue: number;
  total_revenue_prev: number;
  paid_invoices: number;
  pending_payments_count: number;
  pending_payments_sum: number;
  pending_payments_count_prev: number;
  failed_payments: number;
  total_contributions: number;
  approved_contributions: number;
  overdue_contributions: number;
  active_ccc_codes: number;
  used_ccc_codes: number;
  expired_ccc_codes: number;
}

export interface DashboardAlerts {
  overdue_contributions: number;
  failed_payments: number;
  blocked_users: number;
  expired_codes: number;
  inactive_resellers: number;
  pending_disputes: number;
  pending_mortgages: number;
  thresholds: { overdue_days: number; inactive_days: number };
}

export interface TopItem {
  user_id?: string;
  id?: string;
  name?: string;
  name_masked?: string;
  value: number;
}

export interface DashboardFull {
  kpis: DashboardKPIs;
  alerts: DashboardAlerts;
  top_users: TopItem[] | null;
  top_resellers: TopItem[] | null;
  top_zones: TopItem[] | null;
}

const toDateStr = (d: Date) => d.toISOString().split('T')[0];

export const useDashboardKPIs = (
  startDate: Date,
  endDate: Date,
  prevStart: Date,
  prevEnd: Date,
  excludeTest: boolean = true
) => {
  return useQuery({
    queryKey: [
      'dashboard-full',
      toDateStr(startDate),
      toDateStr(endDate),
      toDateStr(prevStart),
      toDateStr(prevEnd),
      excludeTest,
    ],
    queryFn: async (): Promise<DashboardFull> => {
      const { data, error } = await (supabase as any).rpc('get_admin_dashboard_full', {
        start_date: toDateStr(startDate),
        end_date: toDateStr(endDate),
        prev_start: toDateStr(prevStart),
        prev_end: toDateStr(prevEnd),
        _exclude_test: excludeTest,
      });
      if (error) throw error;
      return data as DashboardFull;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
};
