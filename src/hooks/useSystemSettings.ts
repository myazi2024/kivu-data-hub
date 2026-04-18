import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SystemSetting {
  setting_key: string;
  setting_value: any;
  description: string | null;
  updated_at: string;
}

const SETTINGS_TABLE = 'system_settings' as any;

export const useSystemSettings = () => {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [rows, setRows] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from(SETTINGS_TABLE).select('*').order('setting_key');
    if (!error && data) {
      setRows(data as SystemSetting[]);
      const m: Record<string, any> = {};
      data.forEach((r: SystemSetting) => { m[r.setting_key] = r.setting_value; });
      setSettings(m);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateSetting = useCallback(async (key: string, value: any) => {
    const { error } = await (supabase as any)
      .from(SETTINGS_TABLE)
      .upsert({ setting_key: key, setting_value: value, updated_at: new Date().toISOString() }, { onConflict: 'setting_key' });
    if (error) {
      toast.error('Erreur sauvegarde');
      return false;
    }
    toast.success('Paramètre mis à jour');
    await fetchAll();
    return true;
  }, [fetchAll]);

  return { settings, rows, loading, updateSetting, refetch: fetchAll };
};

export default useSystemSettings;
