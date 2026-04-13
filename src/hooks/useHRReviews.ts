import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HRReview {
  id: string;
  employee_id: string;
  review_period: string;
  review_date: string;
  score: number | null;
  strengths: string | null;
  improvements: string | null;
  objectives: any[];
  reviewer_name: string | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
}

export function useHRReviews() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['hr-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_reviews')
        .select('*')
        .order('review_date', { ascending: false });
      if (error) throw error;
      return data as HRReview[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (review: Partial<HRReview>) => {
      const { data, error } = await supabase
        .from('hr_reviews')
        .insert({
          employee_id: review.employee_id!,
          review_period: review.review_period!,
          review_date: review.review_date || new Date().toISOString().split('T')[0],
          score: review.score || null,
          strengths: review.strengths || null,
          improvements: review.improvements || null,
          objectives: review.objectives || [],
          reviewer_name: review.reviewer_name || null,
          comments: review.comments || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-reviews'] });
      toast({ title: 'Évaluation ajoutée' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hr_reviews').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-reviews'] });
      toast({ title: 'Évaluation supprimée' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    },
  });

  return {
    reviews: query.data || [],
    isLoading: query.isLoading,
    addReview: addMutation.mutateAsync,
    deleteReview: deleteMutation.mutateAsync,
    isAdding: addMutation.isPending,
  };
}
