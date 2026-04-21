import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

type Line = {
  id: string;
  payment_transaction_id: string;
  provider: string;
  payment_method: string | null;
  provider_fee_usd: number;
  markup_pct: number;
  markup_usd: number;
  billed_usd: number;
  transaction_date: string;
};

interface Props {
  invoiceId: string;
  open: boolean;
  onClose: () => void;
}

export const PassthroughInvoiceDetailDialog = ({ invoiceId, open, onClose }: Props) => {
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase.from('passthrough_invoice_lines' as never)
      .select('*').eq('passthrough_invoice_id', invoiceId)
      .order('transaction_date', { ascending: true })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setLines((data ?? []) as Line[]);
        setLoading(false);
      });
  }, [invoiceId, open]);

  const exportCsv = () => {
    const header = 'transaction_id,date,provider,method,fee_usd,markup_pct,markup_usd,billed_usd';
    const rows = lines.map(l => [l.payment_transaction_id, l.transaction_date, l.provider, l.payment_method ?? '', l.provider_fee_usd, l.markup_pct, l.markup_usd, l.billed_usd].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `passthrough-${invoiceId}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Détail des transactions refacturées
            <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />CSV</Button>
          </DialogTitle>
        </DialogHeader>
        {loading ? <p className="text-muted-foreground">Chargement…</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead className="text-right">Frais</TableHead>
                <TableHead className="text-right">Markup</TableHead>
                <TableHead className="text-right">Refacturé</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{new Date(l.transaction_date).toLocaleString()}</TableCell>
                  <TableCell>{l.provider}</TableCell>
                  <TableCell>{l.payment_method}</TableCell>
                  <TableCell className="text-right">${Number(l.provider_fee_usd).toFixed(4)}</TableCell>
                  <TableCell className="text-right">${Number(l.markup_usd).toFixed(4)}</TableCell>
                  <TableCell className="text-right font-semibold">${Number(l.billed_usd).toFixed(4)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};
