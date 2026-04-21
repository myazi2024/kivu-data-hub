import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CheckCircle2, AlertTriangle, FileSearch, RefreshCw, Send, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { PassthroughInvoiceDetailDialog } from './PassthroughInvoiceDetailDialog';

type Invoice = {
  id: string;
  scope_type: string;
  scope_id: string | null;
  scope_label: string | null;
  period_start: string;
  period_end: string;
  total_provider_fees_usd: number;
  markup_amount_usd: number;
  total_billed_usd: number;
  transaction_count: number;
  consistency_check_passed: boolean;
  status: string;
  invoice_number: string | null;
  created_at: string;
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline', validated: 'default', sent: 'secondary', paid: 'default', disputed: 'destructive', cancelled: 'destructive',
};

export const PassthroughInvoicesTab = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('passthrough_invoices' as never).select('*').order('period_start', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    else setInvoices((data ?? []) as Invoice[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const generate = async () => {
    if (!periodStart || !periodEnd) { toast.error('Sélectionne une période'); return; }
    setGenerating(true);
    const { data, error } = await supabase.rpc('generate_passthrough_invoices' as never, {
      p_period_start: periodStart, p_period_end: periodEnd,
    } as never);
    setGenerating(false);
    if (error) { toast.error(error.message); return; }
    const created = (data as Array<{ status: string }> | null)?.filter(r => r.status === 'created').length ?? 0;
    toast.success(`${created} facture(s) générée(s)`);
    load();
  };

  const validate = async (id: string) => {
    const { error } = await supabase.rpc('validate_passthrough_invoice' as never, { p_invoice_id: id } as never);
    if (error) toast.error(error.message);
    else { toast.success('Facture validée'); load(); }
  };

  const updateStatus = async (id: string, status: string, extra: Record<string, unknown> = {}) => {
    const { error } = await supabase.from('passthrough_invoices' as never)
      .update({ status, ...extra } as never).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Statut mis à jour'); load(); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Génération manuelle</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="text-xs text-muted-foreground">Début période</label>
              <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Fin période</label>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
            <Button onClick={generate} disabled={generating}>
              <RefreshCw className={`h-4 w-4 mr-1 ${generating ? 'animate-spin' : ''}`} />
              Générer brouillons
            </Button>
            <p className="text-xs text-muted-foreground ml-auto">Cron mensuel auto : 1er à 02:00 UTC</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Factures pass-through</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="draft">Brouillons</SelectItem>
              <SelectItem value="validated">Validées</SelectItem>
              <SelectItem value="sent">Envoyées</SelectItem>
              <SelectItem value="paid">Payées</SelectItem>
              <SelectItem value="disputed">Contestées</SelectItem>
              <SelectItem value="cancelled">Annulées</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Chargement…</p> : invoices.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune facture.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead className="text-right">Frais</TableHead>
                  <TableHead className="text-right">Markup</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Txns</TableHead>
                  <TableHead>Cohérence</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">{inv.invoice_number ?? '—'}</TableCell>
                    <TableCell><Badge variant="outline">{inv.scope_type}</Badge> {inv.scope_label}</TableCell>
                    <TableCell className="text-xs">{inv.period_start} → {inv.period_end}</TableCell>
                    <TableCell className="text-right">${Number(inv.total_provider_fees_usd).toFixed(2)}</TableCell>
                    <TableCell className="text-right">${Number(inv.markup_amount_usd).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">${Number(inv.total_billed_usd).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{inv.transaction_count}</TableCell>
                    <TableCell>{inv.consistency_check_passed
                      ? <CheckCircle2 className="h-4 w-4 text-primary" />
                      : <AlertTriangle className="h-4 w-4 text-destructive" />}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANTS[inv.status]}>{inv.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelected(inv.id)}><FileSearch className="h-4 w-4" /></Button>
                        {inv.status === 'draft' && (
                          <Button variant="ghost" size="icon" onClick={() => validate(inv.id)} title="Valider"><CheckCircle2 className="h-4 w-4 text-primary" /></Button>
                        )}
                        {inv.status === 'validated' && (
                          <Button variant="ghost" size="icon" onClick={() => updateStatus(inv.id, 'sent', { sent_at: new Date().toISOString() })} title="Marquer envoyée"><Send className="h-4 w-4" /></Button>
                        )}
                        {inv.status === 'sent' && (
                          <Button variant="ghost" size="icon" onClick={() => updateStatus(inv.id, 'paid', { paid_at: new Date().toISOString() })} title="Marquer payée"><CheckCircle2 className="h-4 w-4 text-primary" /></Button>
                        )}
                        {!['paid', 'cancelled'].includes(inv.status) && (
                          <Button variant="ghost" size="icon" onClick={() => updateStatus(inv.id, 'cancelled', { cancelled_at: new Date().toISOString() })} title="Annuler"><Ban className="h-4 w-4 text-destructive" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selected && <PassthroughInvoiceDetailDialog invoiceId={selected} open={!!selected} onClose={() => setSelected(null)} />}
    </div>
  );
};
