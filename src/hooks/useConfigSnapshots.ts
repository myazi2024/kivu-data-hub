import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ConfigSnapshot {
  id: string;
  table_name: string;
  snapshot_name: string;
  description: string | null;
  snapshot_data: any;
  row_count: number;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

/**
 * Hook de gestion des snapshots / rollback de configuration.
 * Permet de capturer l'état complet d'une table de config et de la restaurer.
 */
export const useConfigSnapshots = (tableName: string) => {
  const [snapshots, setSnapshots] = useState<ConfigSnapshot[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSnapshots = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('config_snapshots')
      .select('*')
      .eq('table_name', tableName)
      .order('created_at', { ascending: false });
    if (!error) setSnapshots((data || []) as ConfigSnapshot[]);
    setLoading(false);
  }, [tableName]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  const createSnapshot = async (name: string, description?: string) => {
    try {
      // Read current rows from the target table
      const { data: rows, error: readErr } = await (supabase as any).from(tableName).select('*');
      if (readErr) throw readErr;

      const { data: userData } = await supabase.auth.getUser();
      const adminName =
        (userData.user?.user_metadata?.full_name as string) || userData.user?.email || null;

      const { error } = await (supabase as any).from('config_snapshots').insert({
        table_name: tableName,
        snapshot_name: name,
        description: description || null,
        snapshot_data: rows || [],
        row_count: (rows || []).length,
        created_by: userData.user?.id ?? null,
        created_by_name: adminName,
      });
      if (error) throw error;
      toast.success(`Snapshot "${name}" créé (${(rows || []).length} lignes)`);
      await fetchSnapshots();
      return true;
    } catch (e: any) {
      toast.error(`Échec snapshot: ${e.message}`);
      return false;
    }
  };

  const deleteSnapshot = async (id: string) => {
    const { error } = await (supabase as any).from('config_snapshots').delete().eq('id', id);
    if (error) {
      toast.error(`Suppression échouée: ${error.message}`);
      return false;
    }
    toast.success('Snapshot supprimé');
    await fetchSnapshots();
    return true;
  };

  return { snapshots, loading, createSnapshot, deleteSnapshot, refetch: fetchSnapshots };
};
