import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { untypedTables, asUntypedPayload } from '@/integrations/supabase/untyped';
import { useAuth } from '@/hooks/useAuth';

export interface CorrectionChange {
  field: string;
  label: string;
  old_value: string;
  new_value: string;
}

export interface CorrectionRequestRow {
  id: string;
  contribution_id: string;
  parcel_number: string;
  user_id: string;
  changes: CorrectionChange[];
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const TABLE = 'ccc_correction_requests';

/** Demandes de modification ciblées de l'utilisateur connecté. */
export function useCorrectionRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['ccc-correction-requests', user?.id],
    enabled: !!user?.id,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<CorrectionRequestRow[]> => {
      const { data, error } = await untypedTables
        .generic(TABLE)
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CorrectionRequestRow[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: {
      contributionId: string;
      parcelNumber: string;
      changes: CorrectionChange[];
      reason: string;
    }) => {
      const { error } = await untypedTables.generic(TABLE).insert(
        asUntypedPayload({
          contribution_id: input.contributionId,
          parcel_number: input.parcelNumber,
          user_id: user!.id,
          changes: input.changes,
          reason: input.reason.trim(),
        }),
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ccc-correction-requests', user?.id] });
    },
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await untypedTables
        .generic(TABLE)
        .update(asUntypedPayload({ status: 'cancelled' }))
        .eq('id', id)
        .eq('user_id', user!.id)
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ccc-correction-requests', user?.id] });
    },
  });

  return {
    requests: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    createRequest: create.mutateAsync,
    creating: create.isPending,
    cancelRequest: cancel.mutateAsync,
    cancelling: cancel.isPending,
  };
}

/** Côté administration : file des demandes et traitement atomique. */
export function useAdminCorrectionRequests(status: string = 'pending') {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin-ccc-correction-requests', status],
    staleTime: 15 * 1000,
    queryFn: async (): Promise<CorrectionRequestRow[]> => {
      let q = untypedTables.generic(TABLE).select('*').order('created_at', { ascending: false }).limit(200);
      if (status !== 'all') q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CorrectionRequestRow[];
    },
  });

  const decide = useMutation({
    mutationFn: async (input: { id: string; decision: 'approved' | 'rejected'; rejectionReason?: string }) => {
      const { data, error } = await (supabase as any).rpc('apply_ccc_correction_request', {
        p_request_id: input.id,
        p_decision: input.decision,
        p_rejection_reason: input.rejectionReason ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ccc-correction-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-ccc-contributions'] });
    },
  });

  return {
    requests: query.data ?? [],
    loading: query.isLoading,
    refetch: query.refetch,
    decide: decide.mutateAsync,
    deciding: decide.isPending,
  };
}
