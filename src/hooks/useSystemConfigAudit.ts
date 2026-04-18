import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ConfigAuditEntry {
  id: string;
  table_name: string;
  record_id: string | null;
  config_key: string | null;
  action: string;
  old_values: any;
  new_values: any;
  admin_id: string | null;
  admin_name: string | null;
  created_at: string;
}

/**
 * Hook pour récupérer les entrées d'audit générique des configurations système.
 * Optionnellement filtré par table_name.
 */
export const useSystemConfigAudit = (tableName?: string, limit = 50) => {
  const [entries, setEntries] = useState<ConfigAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAudit = async () => {
    setLoading(true);
    let query = (supabase as any)
      .from('system_config_audit')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (tableName) query = query.eq('table_name', tableName);
    const { data, error } = await query;
    if (!error) setEntries((data || []) as ConfigAuditEntry[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAudit();
  }, [tableName, limit]);

  return { entries, loading, refetch: fetchAudit };
};
