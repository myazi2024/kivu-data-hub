import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const KEY = 'dashboard_exclude_test_default';
const LS_KEY = 'admin_dashboard_exclude_test';

export const useDashboardSettings = () => {
  const [excludeTest, setExcludeTest] = useState<boolean>(() => {
    const stored = localStorage.getItem(LS_KEY);
    return stored === null ? true : stored === 'true';
  });
  const [thresholds, setThresholds] = useState<{
    overdue_days: number;
    inactive_days: number;
    fraud_pct: number;
    validation_hours: number;
  }>({
    overdue_days: 7,
    inactive_days: 30,
    fraud_pct: 5,
    validation_hours: 48,
  });

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          KEY,
          'alert_overdue_days',
          'alert_inactive_reseller_days',
          'alert_fraud_rate_pct',
          'alert_validation_hours',
        ]);
      if (!data) return;
      const map: Record<string, any> = {};
      data.forEach((r: any) => { map[r.setting_key] = r.setting_value; });
      // Only use server default if no localStorage override
      if (localStorage.getItem(LS_KEY) === null && typeof map[KEY] === 'boolean') {
        setExcludeTest(map[KEY]);
      }
      setThresholds({
        overdue_days: Number(map.alert_overdue_days ?? 7),
        inactive_days: Number(map.alert_inactive_reseller_days ?? 30),
        fraud_pct: Number(map.alert_fraud_rate_pct ?? 5),
        validation_hours: Number(map.alert_validation_hours ?? 48),
      });
    })();
  }, []);

  const toggleExcludeTest = (v: boolean) => {
    setExcludeTest(v);
    localStorage.setItem(LS_KEY, String(v));
  };

  return { excludeTest, toggleExcludeTest, thresholds };
};
