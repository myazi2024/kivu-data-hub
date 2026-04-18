import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RequestHealthRow {
  service: string;
  service_label: string;
  total: number;
  pending: number;
  in_review: number;
  approved: number;
  rejected: number;
  stale_30d: number;
  escalated_count: number;
}

export interface MissingCertificateRow {
  request_table: string;
  request_id: string;
  reference_number: string;
  user_id: string;
  approved_at: string;
}

export interface EscalationResult {
  service: string;
  escalated_count: number;
}

export const useRequestsHealth = (enabled: boolean = true) => {
  const [rows, setRows] = useState<RequestHealthRow[]>([]);
  const [missing, setMissing] = useState<MissingCertificateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const [{ data: healthData, error: hErr }, { data: missData, error: mErr }] = await Promise.all([
        // @ts-expect-error view not in generated types yet
        supabase.from('requests_health_overview').select('*'),
        supabase.rpc('regenerate_missing_certificates' as any),
      ]);
      if (hErr) throw hErr;
      if (mErr) throw mErr;
      setRows((healthData as RequestHealthRow[]) || []);
      setMissing((missData as MissingCertificateRow[]) || []);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const escalateStale = useCallback(async (days: number = 30): Promise<EscalationResult[]> => {
    const { data, error: e } = await supabase.rpc('escalate_stale_requests' as any, { p_days: days });
    if (e) throw e;
    await fetchAll();
    return (data as EscalationResult[]) || [];
  }, [fetchAll]);

  return { rows, missing, loading, error, refresh: fetchAll, escalateStale };
};
