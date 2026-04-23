import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Mail, RefreshCw, Send, AlertCircle, Download, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { exportToCSV } from '@/utils/csvExport';

type AgingBucket = 'all' | 'current' | '30_60' | '60_90' | 'over_90';

interface AgingRow {
  invoice_id: string;
  invoice_number: string;
  client_email: string;
  client_name: string | null;
  client_organization: string | null;
  total_amount_usd: number;
  currency_code: string;
  created_at: string;
  due_date: string | null;
  status: string;
  days_overdue: number;
  aging_bucket: 'current' | '30_60' | '60_90' | 'over_90';
  last_reminder_sent_at: string | null;
  reminder_count: number;
}

const BUCKET_LABELS: Record<Exclude<AgingBucket, 'all'>, { label: string; color: string }> = {
  current: { label: '0-30 jours', color: 'text-emerald-500' },
  '30_60': { label: '31-60 jours', color: 'text-amber-500' },
  '60_90': { label: '61-90 jours', color: 'text-orange-500' },
  over_90: { label: '> 90 jours', color: 'text-destructive' },
};

const AdminInvoiceReminders = () => {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [search, setSearch] = useState('');
  const [bucketFilter, setBucketFilter] = useState<AgingBucket>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: aging = [], isLoading, refetch } = useQuery({
    queryKey: ['admin', 'invoices-aging'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices_aging')
        .select('*')
        .order('days_overdue', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as AgingRow[];
    },
  });

  // KPI by bucket
  const kpi = useMemo(() => {
    const acc = {
      current: { count: 0, total: 0 },
      '30_60': { count: 0, total: 0 },
      '60_90': { count: 0, total: 0 },
      over_90: { count: 0, total: 0 },
    };
    aging.forEach((row) => {
      acc[row.aging_bucket].count += 1;
      acc[row.aging_bucket].total += Number(row.total_amount_usd || 0);
    });
    return acc;
  }, [aging]);

  // Filtered list
  const filtered = useMemo(() => {
    return aging.filter((row) => {
      if (bucketFilter !== 'all' && row.aging_bucket !== bucketFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        row.invoice_number?.toLowerCase().includes(q) ||
        row.client_email?.toLowerCase().includes(q) ||
        row.client_name?.toLowerCase().includes(q) ||
        row.client_organization?.toLowerCase().includes(q)
      );
    });
  }, [aging, search, bucketFilter]);

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.invoice_id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const sendOne = async (row: AgingRow): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    const reminderNum = row.reminder_count + 1;
    const template =
      reminderNum === 1 ? 'first_reminder' : reminderNum === 2 ? 'second_reminder' : 'final_notice';

    let status: 'sent' | 'failed' = 'sent';
    let errorMsg: string | null = null;
    try {
      const { error: fnErr } = await supabase.functions.invoke('send-invoice-reminder', {
        body: { invoice_id: row.invoice_id, reminder_number: reminderNum },
      });
      if (fnErr) throw fnErr;
    } catch (e: any) {
      status = 'failed';
      errorMsg = e?.message || 'Edge function unavailable';
    }

    const { error } = await supabase.from('invoice_reminders').insert({
      invoice_id: row.invoice_id,
      reminder_number: reminderNum,
      channel: 'email',
      recipient: row.client_email,
      subject: `Relance facture ${row.invoice_number}`,
      status,
      error_message: errorMsg,
      sent_by: 'admin',
      sent_by_user: user?.id,
      sent_by_name: user?.email,
      template_used: template,
    });
    if (error) throw error;
    return status === 'sent';
  };

  const sendReminderMut = useMutation({
    mutationFn: async (row: AgingRow) => {
      setBusyId(row.invoice_id);
      const ok = await sendOne(row);
      return ok;
    },
    onSuccess: (ok) => {
      if (ok) toast.success('Relance envoyée');
      else toast.warning('Relance enregistrée (envoi indisponible)');
      qc.invalidateQueries({ queryKey: ['admin', 'invoices-aging'] });
      setBusyId(null);
    },
    onError: (e: any) => {
      toast.error(e.message || 'Erreur');
      setBusyId(null);
    },
  });

  const handleBulk = async () => {
    if (selected.size === 0) return;
    setBulkSending(true);
    let okCount = 0;
    let failCount = 0;
    for (const row of filtered.filter((r) => selected.has(r.invoice_id))) {
      try {
        const ok = await sendOne(row);
        if (ok) okCount += 1;
        else failCount += 1;
      } catch {
        failCount += 1;
      }
    }
    setBulkSending(false);
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ['admin', 'invoices-aging'] });
    toast.success(`${okCount} relance(s) envoyée(s)${failCount ? ` — ${failCount} échec(s)` : ''}`);
  };

  const handleExport = () => {
    const headers = [
      'N° facture', 'Client', 'Organisation', 'Email', 'Montant USD',
      'Créée le', 'Échéance', 'Jours retard', 'Bucket', 'Relances', 'Dernière relance',
    ];
    const data = filtered.map((r) => [
      r.invoice_number,
      r.client_name || '',
      r.client_organization || '',
      r.client_email,
      Number(r.total_amount_usd).toFixed(2),
      format(new Date(r.created_at), 'dd/MM/yyyy', { locale: fr }),
      r.due_date ? format(new Date(r.due_date), 'dd/MM/yyyy', { locale: fr }) : '',
      r.days_overdue,
      BUCKET_LABELS[r.aging_bucket].label,
      r.reminder_count,
      r.last_reminder_sent_at ? format(new Date(r.last_reminder_sent_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : '',
    ]);
    exportToCSV({ filename: `balance-agee-${format(new Date(), 'yyyy-MM-dd')}.csv`, headers, data });
  };

  const totalOutstanding = aging.reduce((s, r) => s + Number(r.total_amount_usd || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Balance âgée & relances</h2>
              <p className="text-xs text-muted-foreground">
                {aging.length} facture(s) impayée(s) · ${totalOutstanding.toFixed(2)} en attente
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>
      </Card>

      {/* KPI buckets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(BUCKET_LABELS) as Array<Exclude<AgingBucket, 'all'>>).map((b) => (
          <Card
            key={b}
            className={`p-3 cursor-pointer transition-colors ${
              bucketFilter === b ? 'border-primary ring-1 ring-primary' : ''
            }`}
            onClick={() => setBucketFilter(bucketFilter === b ? 'all' : b)}
          >
            <p className="text-xs text-muted-foreground">{BUCKET_LABELS[b].label}</p>
            <p className={`text-xl font-bold ${BUCKET_LABELS[b].color}`}>
              ${kpi[b].total.toFixed(2)}
            </p>
            <p className="text-[10px] text-muted-foreground">{kpi[b].count} facture(s)</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            placeholder="Rechercher facture, client, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs h-8 text-xs"
          />
          <Select value={bucketFilter} onValueChange={(v) => setBucketFilter(v as AgingBucket)}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les buckets</SelectItem>
              <SelectItem value="current">0-30 jours</SelectItem>
              <SelectItem value="30_60">31-60 jours</SelectItem>
              <SelectItem value="60_90">61-90 jours</SelectItem>
              <SelectItem value="over_90">&gt; 90 jours</SelectItem>
            </SelectContent>
          </Select>
          {selected.size > 0 && (
            <Button size="sm" onClick={handleBulk} disabled={bulkSending} className="ml-auto">
              <CheckCheck className="h-4 w-4 mr-1" />
              Relancer {selected.size} sélection(s)
            </Button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox
                  checked={selected.size > 0 && selected.size === filtered.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Facture</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead>Retard</TableHead>
              <TableHead>Relances</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                  Aucune facture impayée pour ce filtre
                </TableCell>
              </TableRow>
            )}
            {filtered.map((row) => (
              <TableRow key={row.invoice_id}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(row.invoice_id)}
                    onCheckedChange={() => toggleOne(row.invoice_id)}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">{row.invoice_number}</TableCell>
                <TableCell className="text-xs">
                  <div>{row.client_name || row.client_organization || '—'}</div>
                  <div className="text-muted-foreground">{row.client_email}</div>
                </TableCell>
                <TableCell className="font-semibold">
                  ${Number(row.total_amount_usd).toFixed(2)}
                </TableCell>
                <TableCell className="text-xs">
                  {row.due_date ? format(new Date(row.due_date), 'dd/MM/yyyy', { locale: fr }) : '—'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={BUCKET_LABELS[row.aging_bucket].color}
                  >
                    {row.days_overdue > 0 ? `${row.days_overdue}j` : 'À échoir'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Badge variant={row.reminder_count > 0 ? 'secondary' : 'outline'}>
                      {row.reminder_count}
                    </Badge>
                    {row.aging_bucket === 'over_90' && row.reminder_count === 0 && (
                      <AlertCircle className="h-3 w-3 text-destructive" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendReminderMut.mutate(row)}
                    disabled={busyId === row.invoice_id}
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
    </div>
  );
};

export default AdminInvoiceReminders;
