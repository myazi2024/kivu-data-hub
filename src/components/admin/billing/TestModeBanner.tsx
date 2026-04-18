import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

/**
 * Shows a banner in financial dashboards when >50% of billing volume is TEST data.
 * Reads counts from cadastral_invoices (TEST-prefixed parcel) vs total.
 */
const TestModeBanner = () => {
  const [ratio, setRatio] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const [{ count: total }, { count: testCount }] = await Promise.all([
        supabase.from('cadastral_invoices').select('id', { count: 'exact', head: true }),
        supabase
          .from('cadastral_invoices')
          .select('id', { count: 'exact', head: true })
          .ilike('parcel_number', 'TEST-%'),
      ]);
      if ((total ?? 0) > 0) setRatio((testCount ?? 0) / (total ?? 1));
    };
    load();
  }, []);

  if (ratio === null || ratio < 0.5) return null;

  return (
    <Card className="p-3 border-amber-500/50 bg-amber-50 dark:bg-amber-950/30">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-xs">
          <p className="font-semibold text-amber-700 dark:text-amber-300">
            Mode test actif — {Math.round(ratio * 100)}% des factures sont des tests
          </p>
          <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
            Les revenus affichés incluent des transactions de test. Utilisez la purge
            (Factures &rarr; Purger TEST) pour archiver les données fictives avant la mise
            en production.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default TestModeBanner;
