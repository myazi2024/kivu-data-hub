import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HealthSnapshot {
  id: string;
  captured_at: string;
  db_latency_ms: number | null;
  auth_latency_ms: number | null;
  storage_latency_ms: number | null;
  edge_fn_latency_ms: number | null;
  edge_fn_status: string | null;
  total_records: number | null;
  total_tables: number | null;
}

export const useSystemHealthSnapshots = (hours = 24) => {
  const [snapshots, setSnapshots] = useState<HealthSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - hours * 3600_000).toISOString();
    const { data } = await (supabase as any)
      .from('system_health_snapshots')
      .select('*')
      .gte('captured_at', since)
      .order('captured_at', { ascending: true })
      .limit(500);
    setSnapshots((data as HealthSnapshot[]) || []);
    setLoading(false);
  }, [hours]);

  useEffect(() => { fetch(); }, [fetch]);

  const insertSnapshot = useCallback(async (s: Partial<HealthSnapshot>) => {
    await (supabase as any).from('system_health_snapshots').insert(s);
  }, []);

  return { snapshots, loading, refetch: fetch, insertSnapshot };
};

export default useSystemHealthSnapshots;
