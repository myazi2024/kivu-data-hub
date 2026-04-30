import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Props { requestId: string }

interface PaymentRow {
  id: string;
  total_amount_usd: number | null;
  status: string | null;
  payment_method: string | null;
  paid_at: string | null;
  transaction_id: string | null;
  created_at: string;
}

export const ExpertisePaymentSection: React.FC<Props> = ({ requestId }) => {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('expertise_payments')
        .select('id,total_amount_usd,status,payment_method,paid_at,transaction_id,created_at')
        .eq('expertise_request_id', requestId)
        .order('created_at', { ascending: false });
      if (!cancelled) {
        setRows((data || []) as PaymentRow[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [requestId]);

  if (loading) {
    return <div className="text-xs text-muted-foreground flex items-center"><Loader2 className="h-3 w-3 animate-spin mr-2" />Chargement des paiements…</div>;
  }
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">Aucun paiement enregistré.</p>;
  }

  return (
    <div>
      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <CreditCard className="h-4 w-4" />
        Paiements ({rows.length})
      </h4>
      <div className="space-y-2">
        {rows.map((p) => (
          <div key={p.id} className="text-xs flex items-center justify-between p-2 rounded border bg-muted/30">
            <div className="space-y-0.5">
              <div className="font-mono">{p.transaction_id || p.id.slice(0, 8)}</div>
              <div className="text-muted-foreground">
                {p.payment_method || '—'} · {format(new Date(p.created_at), 'dd/MM/yyyy HH:mm')}
                {p.paid_at && ` · payé le ${format(new Date(p.paid_at), 'dd/MM/yyyy')}`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">${Number(p.total_amount_usd || 0).toFixed(2)}</span>
              <Badge variant={p.status === 'completed' || p.status === 'paid' ? 'default' : p.status === 'failed' ? 'destructive' : 'secondary'}>
                {p.status || 'pending'}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExpertisePaymentSection;
