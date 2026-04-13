import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HRLeaveRequest {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number | null;
  status: 'pending' | 'approved' | 'rejected';
  reason: string | null;
  approved_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HRLeaveBalance {
  id: string;
  employee_id: string;
  leave_type: string;
  year: number;
  days_entitled: number;
  days_used: number;
  days_remaining: number;
}

export function useHRLeaves() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const leavesQuery = useQuery({
    queryKey: ['hr-leaves'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_leave_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as HRLeaveRequest[];
    },
  });

  const balancesQuery = useQuery({
    queryKey: ['hr-leave-balances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_leave_balances')
        .select('*')
        .eq('year', new Date().getFullYear());
      if (error) throw error;
      return data as HRLeaveBalance[];
    },
  });

  const addLeaveMutation = useMutation({
    mutationFn: async (leave: Partial<HRLeaveRequest>) => {
      const { data, error } = await supabase
        .from('hr_leave_requests')
        .insert({
          employee_id: leave.employee_id!,
          leave_type: leave.leave_type || 'annual',
          start_date: leave.start_date!,
          end_date: leave.end_date!,
          reason: leave.reason || null,
          status: 'pending',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-leaves'] });
      toast({ title: 'Demande de congé ajoutée' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from('hr_leave_requests')
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['hr-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['hr-leave-balances'] });
      toast({ title: status === 'approved' ? 'Congé approuvé' : 'Congé refusé' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    },
  });

  return {
    leaves: leavesQuery.data || [],
    balances: balancesQuery.data || [],
    isLoading: leavesQuery.isLoading,
    addLeave: addLeaveMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    isAdding: addLeaveMutation.isPending,
  };
}
