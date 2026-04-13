import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HRCandidate {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  position_id: string | null;
  pipeline_stage: string;
  score: number | null;
  notes: string | null;
  cv_url: string | null;
  applied_at: string;
  created_at: string;
  updated_at: string;
}

export function useHRCandidates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['hr-candidates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_candidates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as HRCandidate[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (c: Partial<HRCandidate>) => {
      const { data, error } = await supabase
        .from('hr_candidates')
        .insert({
          first_name: c.first_name!,
          last_name: c.last_name!,
          email: c.email || null,
          phone: c.phone || null,
          position_id: c.position_id || null,
          pipeline_stage: c.pipeline_stage || 'applied',
          score: c.score || null,
          notes: c.notes || null,
          cv_url: c.cv_url || null,
          applied_at: c.applied_at || new Date().toISOString().split('T')[0],
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-candidates'] });
      toast({ title: 'Candidat ajouté' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (c: Partial<HRCandidate> & { id: string }) => {
      const { id, ...rest } = c;
      const { error } = await supabase.from('hr_candidates').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-candidates'] });
      toast({ title: 'Candidat mis à jour' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hr_candidates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-candidates'] });
      toast({ title: 'Candidat supprimé' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    },
  });

  return {
    candidates: query.data || [],
    isLoading: query.isLoading,
    addCandidate: addMutation.mutateAsync,
    updateCandidate: updateMutation.mutateAsync,
    deleteCandidate: deleteMutation.mutateAsync,
    isAdding: addMutation.isPending,
  };
}
