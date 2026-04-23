import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { untypedTables } from '@/integrations/supabase/untyped';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Undo2, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logBillingAudit } from '@/utils/billingAudit';

interface Refund {
  id: string;
  invoice_id: string | null;
  amount_usd: number;
  currency_code: string;
  reason: string;
  status: string;
  provider: string | null;
  provider_refund_id: string | null;
  failure_reason: string | null;
  created_at: string;
  processed_at: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-muted text-muted-foreground',
};

const AdminRefunds = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const { data: refunds = [], isLoading, refetch } = useQuery({
    queryKey: ['admin', 'refunds'],
    queryFn: async () => {
      const { data, error } = await untypedTables.payment_refunds()
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as Refund[];
    },
  });

  const initiateMutation = useMutation({
    mutationFn: async () => {
      const { data: inv, error: invErr } = await supabase
        .from('cadastral_invoices')
        .select('id, total_amount_usd, currency_code, payment_id, payment_method, status')
        .eq('invoice_number', invoiceNumber.trim())
        .maybeSingle();
      if (invErr) throw invErr;
      if (!inv) throw new Error('Facture introuvable');
      if (inv.status !== 'paid') throw new Error('La facture doit être payée');

      const amt = parseFloat(amount);
      if (!amt || amt <= 0 || amt > Number(inv.total_amount_usd)) {
        throw new Error('Montant invalide');
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { data: created, error } = await untypedTables.payment_refunds()
        .insert({
          invoice_id: inv.id,
          payment_id: inv.payment_id,
          amount_usd: amt,
          currency_code: inv.currency_code,
          provider: inv.payment_method,
          reason,
          notes: notes || null,
          status: 'pending',
          initiated_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      const createdRow = created as { id: string };
      // Try invoking edge function (graceful if not deployed)
      try {
        await supabase.functions.invoke('process-refund', {
          body: { refund_id: createdRow.id },
        });
      } catch (e) {
        console.warn('process-refund function not invoked:', e);
      }

      await logBillingAudit({
        action: 'refund_initiated',
        tableName: 'payment_refunds',
        recordId: createdRow.id,
        newValues: { amount_usd: amt, reason, invoice_id: inv.id },
      });

      return created;
    },
    onSuccess: () => {
      toast.success('Remboursement initié');
      setOpen(false);
      setInvoiceNumber(''); setAmount(''); setReason(''); setNotes('');
      qc.invalidateQueries({ queryKey: ['admin', 'refunds'] });
    },
    onError: (e: any) => toast.error(e.message || 'Erreur'),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Remboursements</h2>
            <Badge variant="outline">{refunds.length}</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Nouveau remboursement
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Réf. PSP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {refunds.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Aucun remboursement</TableCell></TableRow>
            )}
            {refunds.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{format(new Date(r.created_at), 'dd/MM/yy HH:mm', { locale: fr })}</TableCell>
                <TableCell className="font-semibold text-primary">${Number(r.amount_usd).toFixed(2)}</TableCell>
                <TableCell className="max-w-[250px] truncate text-xs">{r.reason}</TableCell>
                <TableCell className="text-xs">{r.provider || '—'}</TableCell>
                <TableCell><Badge className={STATUS_COLOR[r.status] || ''}>{r.status}</Badge></TableCell>
                <TableCell className="text-xs font-mono truncate max-w-[140px]">{r.provider_refund_id || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initier un remboursement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>N° Facture</Label>
              <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
            </div>
            <div>
              <Label>Montant à rembourser (USD)</Label>
              <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Motif (obligatoire)</Label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Annulation, erreur de facturation..." />
            </div>
            <div>
              <Label>Notes internes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
            <p className="text-xs text-muted-foreground">
              Le remboursement est enregistré en statut "pending". Le débit effectif côté PSP nécessite la fonction `process-refund`.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button
              onClick={() => initiateMutation.mutate()}
              disabled={!invoiceNumber || !amount || !reason || initiateMutation.isPending}
            >
              Initier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRefunds;
