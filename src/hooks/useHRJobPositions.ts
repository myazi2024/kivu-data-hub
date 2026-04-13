import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HRJobPosition {
  id: string;
  title: string;
  department: string;
  contract_type: string;
  status: 'open' | 'closed' | 'draft';
  description: string | null;
  requirements: string | null;
  salary_range: string | null;
  location: string | null;
  posted_at: string | null;
  closes_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useHRJobPositions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['hr-job-positions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_job_positions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as HRJobPosition[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (job: Partial<HRJobPosition>) => {
      const { data, error } = await supabase
        .from('hr_job_positions')
        .insert({
          title: job.title!,
          department: job.department!,
          contract_type: job.contract_type || 'CDI',
          status: job.status || 'open',
          description: job.description || null,
          requirements: job.requirements || null,
          salary_range: job.salary_range || null,
          location: job.location || 'Goma',
          closes_at: job.closes_at || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-job-positions'] });
      toast({ title: 'Offre créée' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HRJobPosition> & { id: string }) => {
      const { error } = await supabase.from('hr_job_positions').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-job-positions'] });
      toast({ title: 'Offre mise à jour' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hr_job_positions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-job-positions'] });
      toast({ title: 'Offre supprimée' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    },
  });

  return {
    positions: query.data || [],
    isLoading: query.isLoading,
    addPosition: addMutation.mutateAsync,
    updatePosition: updateMutation.mutateAsync,
    deletePosition: deleteMutation.mutateAsync,
    isAdding: addMutation.isPending,
  };
}
