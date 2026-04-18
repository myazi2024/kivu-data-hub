import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Anomaly {
  anomaly_type: string;
  ref_id: string;
  related_id: string | null;
  amount: number | null;
  created_at: string;
}

const TYPE_LABEL: Record<string, { label: string; color: string }> = {
  tx_completed_invoice_unpaid: {
    label: 'Tx complétée / facture non payée',
    color: 'bg-red-100 text-red-700 border-red-200',
  },
  discount_without_code: {
    label: 'Remise sans code source',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  expired_active_discount_code: {
    label: 'Code promo expiré encore actif',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
  },
};

const BillingAnomaliesPanel = () => {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    // billing_anomalies is a security_invoker view — admin only via underlying RLS
    const { data, error } = await (supabase as any)
      .from('billing_anomalies')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (!error) setAnomalies((data ?? []) as Anomaly[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = anomalies.reduce<Record<string, Anomaly[]>>((acc, a) => {
    (acc[a.anomaly_type] ??= []).push(a);
    return acc;
  }, {});

  return (
    <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold">Anomalies facturation</h3>
          <Badge variant="outline" className="text-[10px]">
            {anomalies.length}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-7 text-xs">
          <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {Object.keys(grouped).length === 0 && !loading && (
        <p className="text-xs text-muted-foreground py-4 text-center">
          Aucune anomalie détectée. ✅
        </p>
      )}

      {Object.entries(grouped).map(([type, items]) => {
        const meta = TYPE_LABEL[type] ?? { label: type, color: 'bg-muted' };
        return (
          <div key={type} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[10px] ${meta.color}`}>
                {meta.label}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {items.slice(0, 20).map((a) => (
                <div
                  key={a.ref_id}
                  className="text-[11px] p-2 border rounded-md bg-card flex items-center justify-between gap-2"
                >
                  <code className="font-mono truncate">{a.ref_id.slice(0, 8)}…</code>
                  {a.amount !== null && (
                    <span className="text-primary font-medium">${Number(a.amount).toFixed(2)}</span>
                  )}
                  <span className="text-muted-foreground">
                    {format(new Date(a.created_at), 'dd/MM/yy', { locale: fr })}
                  </span>
                </div>
              ))}
              {items.length > 20 && (
                <p className="text-[10px] text-muted-foreground text-center">
                  +{items.length - 20} autres
                </p>
              )}
            </div>
          </div>
        );
      })}
    </Card>
  );
};

export default BillingAnomaliesPanel;
