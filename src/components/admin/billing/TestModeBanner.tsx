import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

/**
 * Shows a banner in financial dashboards when the share of TEST invoices
 * exceeds a configurable threshold. Thresholds live in `system_settings`:
 *  - `test_mode_billing_alert_pct` (number, default 0.5)
 *  - `test_mode_billing_min_volume` (number, default 20)
 */
const DEFAULT_PCT = 0.5;
const DEFAULT_MIN_VOLUME = 20;

const readNumber = (raw: unknown, fallback: number): number => {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
};

const TestModeBanner = () => {
  const [ratio, setRatio] = useState<number | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [thresholds, setThresholds] = useState({ pct: DEFAULT_PCT, minVolume: DEFAULT_MIN_VOLUME });

  useEffect(() => {
    const load = async () => {
      const [{ count: totalCount }, { count: testCount }, settingsRes] = await Promise.all([
        supabase.from('cadastral_invoices').select('id', { count: 'exact', head: true }),
        supabase
          .from('cadastral_invoices')
          .select('id', { count: 'exact', head: true })
          .ilike('parcel_number', 'TEST-%'),
        (supabase as any)
          .from('system_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['test_mode_billing_alert_pct', 'test_mode_billing_min_volume']),
      ]);
      const t = totalCount ?? 0;
      setTotal(t);
      if (t > 0) setRatio((testCount ?? 0) / t);

      const rows = (settingsRes as any)?.data as Array<{ setting_key: string; setting_value: unknown }> | null;
      if (rows) {
        const map = Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
        setThresholds({
          pct: readNumber(map['test_mode_billing_alert_pct'], DEFAULT_PCT),
          minVolume: readNumber(map['test_mode_billing_min_volume'], DEFAULT_MIN_VOLUME),
        });
      }
    };
    load();
  }, []);

  if (ratio === null || total < thresholds.minVolume || ratio < thresholds.pct) return null;

  return (
    <Card className="w-full p-3 border-amber-500/50 bg-amber-50 dark:bg-amber-950/30">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-xs min-w-0 flex-1">
          <p className="font-semibold text-amber-700 dark:text-amber-300">
            Mode test actif — {Math.round(ratio * 100)}% des factures sont des tests
          </p>
          <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
            Les revenus affichés incluent des transactions de test. Utilisez la purge
            (Mode Test &rarr; Nettoyer tout) pour supprimer les données fictives avant la
            mise en production. Seuils configurables dans Paramètres système.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default TestModeBanner;
