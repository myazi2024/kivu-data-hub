import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RequestAuditEntry {
  id: string;
  request_table: string;
  request_id: string;
  action: string;
  old_status: string | null;
  new_status: string | null;
  rejection_reason: string | null;
  admin_id: string | null;
  admin_name: string | null;
  created_at: string;
}

export const useRequestAudit = (table?: string, requestId?: string) => {
  const [entries, setEntries] = useState<RequestAuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAudit = useCallback(async () => {
    if (!table || !requestId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).from('request_admin_audit')
        .select('*').eq('request_table', table).eq('request_id', requestId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEntries((data as RequestAuditEntry[]) || []);
    } finally { setLoading(false); }
  }, [table, requestId]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  return { entries, loading, refresh: fetchAudit };
};
