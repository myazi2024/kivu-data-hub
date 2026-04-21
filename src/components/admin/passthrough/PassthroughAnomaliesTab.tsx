import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type Inv = {
  id: string;
  invoice_number: string | null;
  scope_type: string;
  scope_label: string | null;
  period_start: string;
  period_end: string;
  total_billed_usd: number;
  consistency_check_passed: boolean;
  consistency_notes: string | null;
  status: string;
};

type Summary = {
  month: string;
  invoice_count: number;
  inconsistent_count: number;
  total_fees_usd: number;
  total_markup_usd: number;
  total_billed_usd: number;
};

export const PassthroughAnomaliesTab = () => {
  const [bad, setBad] = useState<Inv[]>([]);
  const [disputed, setDisputed] = useState<Inv[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [r1, r2, r3] = await Promise.all([
        supabase.from('passthrough_invoices' as never).select('*').eq('consistency_check_passed', false),
        supabase.from('passthrough_invoices' as never).select('*').eq('status', 'disputed'),
        supabase.from('passthrough_billing_summary' as never).select('*').limit(12),
      ]);
      if (r1.error) toast.error(r1.error.message);
      if (r2.error) toast.error(r2.error.message);
      if (r3.error) toast.error(r3.error.message);
      setBad((r1.data ?? []) as Inv[]);
      setDisputed((r2.data ?? []) as Inv[]);
      setSummary((r3.data ?? []) as Summary[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-muted-foreground">Chargement…</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />Incohérences ({bad.length})</CardTitle></CardHeader>
        <CardContent>
          {bad.length === 0 ? <p className="text-sm text-muted-foreground">Aucune incohérence détectée. ✓</p> : (
            <ul className="space-y-2 text-sm">
              {bad.map(i => (
                <li key={i.id} className="border rounded p-2">
                  <div className="font-mono text-xs">{i.invoice_number ?? i.id.slice(0, 8)}</div>
                  <div>{i.scope_type} · {i.scope_label} · {i.period_start} → {i.period_end}</div>
                  <div className="text-destructive text-xs mt-1">{i.consistency_notes ?? 'Écart détecté'}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Factures contestées ({disputed.length})</CardTitle></CardHeader>
        <CardContent>
          {disputed.length === 0 ? <p className="text-sm text-muted-foreground">Aucune contestation.</p> : (
            <ul className="space-y-2 text-sm">
              {disputed.map(i => (
                <li key={i.id} className="border rounded p-2">
                  <div className="font-mono text-xs">{i.invoice_number ?? i.id.slice(0, 8)}</div>
                  <div>{i.scope_label} · ${Number(i.total_billed_usd).toFixed(2)}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Synthèse 12 derniers mois</CardTitle></CardHeader>
        <CardContent>
          {summary.length === 0 ? <p className="text-sm text-muted-foreground">Pas encore de données.</p> : (
            <ul className="space-y-1 text-sm">
              {summary.map(s => (
                <li key={s.month} className="flex justify-between border-b py-1">
                  <span>{new Date(s.month).toLocaleDateString('fr', { month: 'long', year: 'numeric' })}</span>
                  <span className="text-muted-foreground">{s.invoice_count} fact.</span>
                  <span>${Number(s.total_billed_usd).toFixed(2)}</span>
                  {s.inconsistent_count > 0 && <Badge variant="destructive" className="ml-2">{s.inconsistent_count} ⚠</Badge>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
