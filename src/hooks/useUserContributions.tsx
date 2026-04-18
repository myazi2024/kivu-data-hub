import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTestEnvironment, applyTestFilter } from '@/hooks/useTestEnvironment';
import { useEffect } from 'react';

export interface ContributionRowFull {
  id: string;
  parcel_number: string;
  status: string;
  contribution_type: string;
  is_suspicious: boolean;
  fraud_score: number;
  fraud_reason: string | null;
  rejection_reason: string | null;
  rejection_reasons: any;
  rejection_date: string | null;
  appeal_submitted: boolean | null;
  appeal_status: string | null;
  appeal_submission_date: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  property_title_type: string | null;
  current_owner_name: string | null;
  area_sqm: number | null;
  province: string | null;
  ville: string | null;
  changed_fields: any;
  mortgage_history: any;
  building_permits: any;
  tax_history: any;
  boundary_history: any;
  permit_request_data: any;
  source_form_type?: string | null;
  ccc_code?: string | null;
  [key: string]: any;
}

const PAGE_SIZE = 25;

/**
 * Server-paginated fetch of user contributions with embedded CCC code (single
 * query instead of N+1). Powered by react-query for caching + invalidation.
 */
export function useUserContributions(page: number = 1) {
  const { user } = useAuth();
  const { isTestRoute } = useTestEnvironment();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['user-contributions', user?.id, page, isTestRoute],
    enabled: !!user?.id,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!user?.id) return { rows: [], total: 0 };
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let q = supabase
        .from('cadastral_contributions')
        .select('*, cadastral_contributor_codes(code)', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);
      q = applyTestFilter(q as any, 'parcel_number', isTestRoute) as any;

      const { data, count, error } = await q;
      if (error) throw error;

      const rows: ContributionRowFull[] = (data || []).map((r: any) => ({
        ...r,
        ccc_code: r.cadastral_contributor_codes?.[0]?.code ?? null,
      }));
      return { rows, total: count ?? 0 };
    },
  });

  // Realtime: refresh on status changes (admin approval, etc.)
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`user-contribs-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cadastral_contributions', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-contributions', user.id] });
          queryClient.invalidateQueries({ queryKey: ['user-dashboard-stats', user.id] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cadastral_contributions')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id)
        .in('status', ['pending', 'returned']);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-contributions', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-dashboard-stats', user?.id] });
    },
  });

  return {
    rows: query.data?.rows ?? [],
    total: query.data?.total ?? 0,
    pageSize: PAGE_SIZE,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    deleteContribution: deleteMutation.mutateAsync,
    deleting: deleteMutation.isPending,
  };
}
