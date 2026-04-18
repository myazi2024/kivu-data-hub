import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AppearanceHistoryEntry {
  id: string;
  config_key: string | null;
  action: string;
  old_values: any;
  new_values: any;
  admin_name: string | null;
  created_at: string;
}

/**
 * Hook pour l'historique des modifications de l'apparence
 * (lecture filtrée de system_config_audit pour app_appearance_config).
 */
export const useAppearanceHistory = (limit = 30) => {
  const [entries, setEntries] = useState<AppearanceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('system_config_audit')
      .select('id, config_key, action, old_values, new_values, admin_name, created_at')
      .eq('table_name', 'app_appearance_config')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (!error) setEntries((data || []) as AppearanceHistoryEntry[]);
    setLoading(false);
  }, [limit]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const restoreEntry = useCallback(async (entry: AppearanceHistoryEntry) => {
    if (!entry.config_key) return false;
    const target = entry.old_values?.config_value ?? entry.new_values?.config_value;
    if (target === undefined || target === null) {
      toast.error('Valeur introuvable dans cet historique');
      return false;
    }
    setRestoring(entry.id);
    const { error } = await supabase
      .from('app_appearance_config')
      .upsert(
        { config_key: entry.config_key, config_value: target as any },
        { onConflict: 'config_key' }
      );
    setRestoring(null);
    if (error) {
      toast.error('Restauration échouée: ' + error.message);
      return false;
    }
    toast.success(`« ${entry.config_key} » restauré`);
    await fetchHistory();
    return true;
  }, [fetchHistory]);

  return { entries, loading, restoring, refetch: fetchHistory, restoreEntry };
};
