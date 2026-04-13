import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HRDocument {
  id: string;
  employee_id: string;
  document_type: string;
  file_name: string;
  file_url: string | null;
  file_size: number | null;
  expires_at: string | null;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useHRDocuments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['hr-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_documents')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as HRDocument[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (doc: Partial<HRDocument>) => {
      const { data, error } = await supabase
        .from('hr_documents')
        .insert({
          employee_id: doc.employee_id!,
          document_type: doc.document_type!,
          file_name: doc.file_name!,
          file_url: doc.file_url || null,
          expires_at: doc.expires_at || null,
          notes: doc.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-documents'] });
      toast({ title: 'Document ajouté' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hr_documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-documents'] });
      toast({ title: 'Document supprimé' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    },
  });

  return {
    documents: query.data || [],
    isLoading: query.isLoading,
    addDocument: addMutation.mutateAsync,
    deleteDocument: deleteMutation.mutateAsync,
    isAdding: addMutation.isPending,
  };
}
