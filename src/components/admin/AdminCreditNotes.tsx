import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileMinus, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logBillingAudit } from '@/utils/billingAudit';

interface CreditNote {
  id: string;
  credit_note_number: string;
  original_invoice_id: string;
  amount_usd: number;
  currency_code: string;
  reason: string;
  status: string;
  issued_at: string;
  notes: string | null;
}

const AdminCreditNotes = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const { data: creditNotes = [], isLoading, refetch } = useQuery({
    queryKey: ['admin', 'credit-notes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cadastral_credit_notes')
        .select('*')
        .order('issued_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as CreditNote[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // Find invoice
      const { data: inv, error: invErr } = await supabase
        .from('cadastral_invoices')
        .select('id, total_amount_usd, currency_code, exchange_rate_used, status')
        .eq('invoice_number', invoiceNumber.trim())
        .maybeSingle();
      if (invErr) throw invErr;
      if (!inv) throw new Error('Facture introuvable');
      if (inv.status !== 'paid') throw new Error('La facture doit être payée');

      const amt = parseFloat(amount);
      if (!amt || amt <= 0) throw new Error('Montant invalide');
      if (amt > Number(inv.total_amount_usd)) throw new Error('Montant supérieur à la facture');

      const { data: numData, error: numErr } = await supabase.rpc('generate_credit_note_number');
      if (numErr) throw numErr;

      const { data: { user } } = await supabase.auth.getUser();
      const { data: created, error } = await supabase
        .from('cadastral_credit_notes')
        .insert({
          credit_note_number: numData as string,
          original_invoice_id: inv.id,
          amount_usd: amt,
          currency_code: inv.currency_code,
          exchange_rate_used: inv.exchange_rate_used,
          reason,
          notes: notes || null,
          issued_by: user?.id,
          status: 'issued',
        })
        .select()
        .single();
      if (error) throw error;

      await logBillingAudit({
        action: 'credit_note_issued',
        table_name: 'cadastral_credit_notes',
        record_id: created.id,
        new_values: { credit_note_number: created.credit_note_number, amount_usd: amt, reason },
      });

      return created;
    },
    onSuccess: () => {
      toast.success('Avoir émis');
      setOpen(false);
      setInvoiceNumber(''); setAmount(''); setReason(''); setNotes('');
      qc.invalidateQueries({ queryKey: ['admin', 'credit-notes'] });
    },
    onError: (e: any) => toast.error(e.message || 'Erreur'),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FileMinus className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Avoirs / Notes de crédit</h2>
            <Badge variant="outline">{creditNotes.length}</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Nouvel avoir
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Avoir</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {creditNotes.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Aucun avoir émis</TableCell></TableRow>
            )}
            {creditNotes.map(cn => (
              <TableRow key={cn.id}>
                <TableCell className="font-mono text-xs">{cn.credit_note_number}</TableCell>
                <TableCell className="text-xs">{format(new Date(cn.issued_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                <TableCell className="font-semibold text-primary">${Number(cn.amount_usd).toFixed(2)}</TableCell>
                <TableCell className="max-w-[300px] truncate text-xs">{cn.reason}</TableCell>
                <TableCell><Badge variant={cn.status === 'issued' ? 'default' : 'outline'}>{cn.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Émettre un avoir</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>N° Facture d'origine</Label>
              <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="FACT-2025-0001" />
            </div>
            <div>
              <Label>Montant (USD)</Label>
              <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Motif (obligatoire)</Label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex: Annulation prestation" />
            </div>
            <div>
              <Label>Notes internes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!invoiceNumber || !amount || !reason || createMutation.isPending}
            >
              Émettre l'avoir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCreditNotes;
