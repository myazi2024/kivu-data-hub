import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AdminNote {
  id: string;
  user_id: string;
  admin_id: string;
  admin_name: string | null;
  note_content: string;
  is_important: boolean;
  created_at: string;
  updated_at: string;
}

export const useAdminNotes = (userId: string | null) => {
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_user_notes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching admin notes:', error);
      toast.error('Erreur lors du chargement des notes');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const addNote = useCallback(async (
    content: string,
    isImportant: boolean = false,
    adminName?: string
  ) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('admin_user_notes')
        .insert({
          user_id: userId,
          admin_id: (await supabase.auth.getUser()).data.user?.id,
          admin_name: adminName,
          note_content: content,
          is_important: isImportant
        });

      if (error) throw error;
      
      toast.success('Note ajoutée avec succès');
      await fetchNotes();
      return true;
    } catch (error: any) {
      console.error('Error adding note:', error);
      toast.error(error.message || 'Erreur lors de l\'ajout de la note');
      return false;
    }
  }, [userId, fetchNotes]);

  const updateNote = useCallback(async (
    noteId: string,
    content: string,
    isImportant: boolean
  ) => {
    try {
      const { error } = await supabase
        .from('admin_user_notes')
        .update({
          note_content: content,
          is_important: isImportant
        })
        .eq('id', noteId);

      if (error) throw error;
      
      toast.success('Note mise à jour');
      await fetchNotes();
      return true;
    } catch (error: any) {
      console.error('Error updating note:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour');
      return false;
    }
  }, [fetchNotes]);

  const deleteNote = useCallback(async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('admin_user_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      
      toast.success('Note supprimée');
      await fetchNotes();
      return true;
    } catch (error: any) {
      console.error('Error deleting note:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
      return false;
    }
  }, [fetchNotes]);

  return {
    notes,
    loading,
    fetchNotes,
    addNote,
    updateNote,
    deleteNote
  };
};
