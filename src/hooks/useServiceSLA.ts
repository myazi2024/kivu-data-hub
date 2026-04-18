import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ServiceSLA {
  id: string;
  service_key: string;
  service_label: string;
  target_days: number;
  warning_days: number;
  critical_days: number;
  is_active: boolean;
}

export const useServiceSLA = () => {
  const [items, setItems] = useState<ServiceSLA[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: e } = await (supabase as any).from('service_sla_config').select('*').order('service_label');
      if (e) throw e;
      setItems((data as ServiceSLA[]) || []);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement SLA');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const update = useCallback(async (id: string, patch: Partial<ServiceSLA>) => {
    const { error: e } = await (supabase as any).from('service_sla_config').update(patch).eq('id', id);
    if (e) throw e;
    await fetchAll();
  }, [fetchAll]);

  return { items, loading, error, refresh: fetchAll, update };
};
