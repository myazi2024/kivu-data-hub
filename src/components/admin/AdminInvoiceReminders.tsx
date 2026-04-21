import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Mail, RefreshCw, Send, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UnpaidInvoice {
  id: string;
  invoice_number: string;
  client_email: string;
  client_name: string | null;
  total_amount_usd: number;
  created_at: string;
  parcel_number: string;
}

interface Reminder {
  id: string;
  invoice_id: string;
  reminder_number: number;
  channel: string;
  recipient: string;
  status: string;
  sent_by: string;
  created_at: string;
}

const AdminInvoiceReminders = () => {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: unpaid = [], isLoading: loadingUnpaid, refetch: refetchUnpaid } = useQuery({
    queryKey: ['admin', 'unpaid-invoices'],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('cadastral_invoices')
        .select('id, invoice_number, client_email, client_name, total_amount_usd, created_at, parcel_number')
        .eq('status', 'pending')
        .lt('created_at', cutoff)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data || []) as UnpaidInvoice[];
    },
  });

  const { data: reminders = [], refetch: refetchReminders } = useQuery({
    queryKey: ['admin', 'invoice-reminders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_reminders' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as unknown as Reminder[];
    },
  });

  const reminderCount = (invoiceId: string) =>
    reminders.filter(r => r.invoice_id === invoiceId).length;

  const sendReminder = useMutation({
    mutationFn: async (invoice: UnpaidInvoice) => {
      setBusyId(invoice.id);
      const { data: { user } } = await supabase.auth.getUser();
      const reminderNum = reminderCount(invoice.id) + 1;

      // Try edge function (graceful fallback)
      let status: 'sent' | 'failed' = 'sent';
      let errorMsg: string | null = null;
      try {
        const { error: fnErr } = await supabase.functions.invoke('send-invoice-reminder', {
          body: { invoice_id: invoice.id, reminder_number: reminderNum },
        });
        if (fnErr) throw fnErr;
      } catch (e: any) {
        status = 'failed';
        errorMsg = e?.message || 'Edge function unavailable';
      }

      const { error } = await supabase
        .from('invoice_reminders' as any)
        .insert({
          invoice_id: invoice.id,
          reminder_number: reminderNum,
          channel: 'email',
          recipient: invoice.client_email,
          subject: `Relance facture ${invoice.invoice_number}`,
          status,
          error_message: errorMsg,
          sent_by: 'admin',
          sent_by_user: user?.id,
        });
      if (error) throw error;
      return { status, errorMsg };
    },
    onSuccess: ({ status, errorMsg }) => {
      if (status === 'sent') toast.success('Relance envoyée');
      else toast.warning(`Relance enregistrée (envoi indisponible: ${errorMsg})`);
      qc.invalidateQueries({ queryKey: ['admin', 'invoice-reminders'] });
      setBusyId(null);
    },
    onError: (e: any) => {
      toast.error(e.message || 'Erreur');
      setBusyId(null);
    },
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Relances factures impayées</h2>
            <Badge variant="outline">{unpaid.length} en attente &gt; 48h</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={() => { refetchUnpaid(); refetchReminders(); }} disabled={loadingUnpaid}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loadingUnpaid ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Facture</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Âge</TableHead>
              <TableHead>Relances</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unpaid.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Aucune facture impayée &gt; 48h</TableCell></TableRow>
            )}
            {unpaid.map(inv => (
              <TableRow key={inv.id}>
                <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                <TableCell className="text-xs">
                  <div>{inv.client_name || '—'}</div>
                  <div className="text-muted-foreground">{inv.client_email}</div>
                </TableCell>
                <TableCell className="font-semibold">${Number(inv.total_amount_usd).toFixed(2)}</TableCell>
                <TableCell className="text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(inv.created_at), { locale: fr, addSuffix: false })}
                </TableCell>
                <TableCell>
                  <Badge variant={reminderCount(inv.id) > 0 ? 'secondary' : 'outline'}>
                    {reminderCount(inv.id)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendReminder.mutate(inv)}
                    disabled={busyId === inv.id}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Relancer
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-2">Historique relances ({reminders.length})</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {reminders.slice(0, 50).map(r => (
            <div key={r.id} className="text-xs flex items-center justify-between p-2 border rounded-md">
              <span className="font-mono">{r.recipient}</span>
              <Badge variant="outline">#{r.reminder_number}</Badge>
              <Badge variant={r.status === 'sent' ? 'default' : 'destructive'}>{r.status}</Badge>
              <span className="text-muted-foreground">{format(new Date(r.created_at), 'dd/MM HH:mm', { locale: fr })}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default AdminInvoiceReminders;
