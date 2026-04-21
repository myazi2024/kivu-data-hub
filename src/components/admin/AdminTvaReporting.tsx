import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Receipt, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { exportToCSV } from '@/utils/csvExport';

interface TvaDeclaration {
  year: number;
  month: number;
  period_status: string;
  total_ttc_usd: number;
  total_ht_usd: number;
  tva_collected_usd: number;
  tva_deductible_usd: number;
  tva_to_pay_usd: number;
  invoice_count: number;
  credit_note_total_usd: number;
  tva_rate: number;
}

interface PeriodRow {
  year: number;
  month: number;
  currency_code: string;
  invoice_count: number;
  total_ttc_usd: number;
  total_ht_usd: number;
  tva_collected_usd: number;
}

const AdminTvaReporting = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [declaration, setDeclaration] = useState<TvaDeclaration | null>(null);
  const [history, setHistory] = useState<PeriodRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [declRes, histRes] = await Promise.all([
      supabase.rpc('get_tva_declaration' as any, { p_year: year, p_month: month }),
      supabase.from('tva_collected_by_period' as any).select('*').limit(24),
    ]);
    if (declRes.error) toast.error(declRes.error.message);
    else setDeclaration(declRes.data as any);
    if (histRes.error) toast.error(histRes.error.message);
    else setHistory((histRes.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [year, month]);

  const handleExport = () => {
    if (history.length === 0) return;
    exportToCSV({
      filename: `tva_history.csv`,
      headers: ['Année', 'Mois', 'Devise', 'Factures', 'Total TTC', 'Total HT', 'TVA collectée'],
      data: history.map(h => [
        h.year, h.month, h.currency_code, h.invoice_count,
        Number(h.total_ttc_usd).toFixed(2), Number(h.total_ht_usd).toFixed(2),
        Number(h.tva_collected_usd).toFixed(2),
      ]),
    });
    toast.success('Historique exporté');
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">Reporting TVA — Déclaration mensuelle DGI</h3>
          </div>
          <Button size="sm" variant="ghost" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Année</Label>
            <Input type="number" value={year} onChange={e => setYear(+e.target.value)} />
          </div>
          <div>
            <Label>Mois</Label>
            <Input type="number" min={1} max={12} value={month} onChange={e => setMonth(+e.target.value)} />
          </div>
        </div>

        {declaration && (
          <div className="border rounded p-4 bg-muted/30 space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold">
                Déclaration {declaration.year}-{String(declaration.month).padStart(2, '0')}
              </h4>
              <Badge variant={declaration.period_status === 'closed' ? 'secondary' : 'outline'}>
                {declaration.period_status === 'closed' ? 'Période clôturée' : 'Période ouverte'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <Stat label="Factures" value={String(declaration.invoice_count)} />
              <Stat label="Total TTC" value={`$${declaration.total_ttc_usd.toFixed(2)}`} />
              <Stat label="Base HT" value={`$${declaration.total_ht_usd.toFixed(2)}`} />
              <Stat label="TVA collectée (16%)" value={`$${declaration.tva_collected_usd.toFixed(2)}`} highlight />
              <Stat label="TVA déductible" value={`$${declaration.tva_deductible_usd.toFixed(2)}`} />
              <Stat label="TVA à reverser" value={`$${declaration.tva_to_pay_usd.toFixed(2)}`} highlight />
            </div>
            {declaration.credit_note_total_usd > 0 && (
              <div className="text-xs text-amber-600 border-t pt-2">
                Avoirs émis sur la période : ${declaration.credit_note_total_usd.toFixed(2)} (à déduire de la base imposable)
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-semibold">Historique TVA collectée</h4>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="h-3 w-3 mr-1" />CSV
          </Button>
        </div>
        <div className="border rounded overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">Période</th>
                <th className="p-2 text-left">Devise</th>
                <th className="p-2 text-right">Factures</th>
                <th className="p-2 text-right">TTC</th>
                <th className="p-2 text-right">HT</th>
                <th className="p-2 text-right">TVA</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i} className="border-t hover:bg-muted/50">
                  <td className="p-2">{h.year}-{String(h.month).padStart(2, '0')}</td>
                  <td className="p-2">{h.currency_code}</td>
                  <td className="p-2 text-right">{h.invoice_count}</td>
                  <td className="p-2 text-right font-mono">${Number(h.total_ttc_usd).toFixed(2)}</td>
                  <td className="p-2 text-right font-mono">${Number(h.total_ht_usd).toFixed(2)}</td>
                  <td className="p-2 text-right font-mono font-semibold">${Number(h.tva_collected_usd).toFixed(2)}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Aucune donnée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const Stat = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className={`p-2 rounded ${highlight ? 'bg-primary/10 border border-primary/20' : 'bg-background'}`}>
    <div className="text-muted-foreground text-[10px] uppercase">{label}</div>
    <div className={`font-mono font-semibold ${highlight ? 'text-primary' : ''}`}>{value}</div>
  </div>
);

export default AdminTvaReporting;
