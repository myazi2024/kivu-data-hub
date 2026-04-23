import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { exportToCSV } from '@/utils/csvExport';

interface JournalEntry {
  id: string;
  entry_date: string;
  journal_code: string;
  piece_ref: string;
  account_code: string;
  account_label: string;
  debit_usd: number;
  credit_usd: number;
  description: string | null;
  source_table: string;
  currency_code: string;
}

const AdminAccountingJournal = () => {
  const today = new Date();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [journalFilter, setJournalFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const fetchEntries = async () => {
    setLoading(true);
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0); // last day of month
    const end = format(endDate, 'yyyy-MM-dd');
    let query = supabase
      .from('accounting_journal_entries')
      .select('*')
      .gte('entry_date', start)
      .lte('entry_date', end)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500);
    if (journalFilter !== 'all') query = query.eq('journal_code', journalFilter);
    const { data, error } = await query;
    if (error) toast.error(error.message);
    else setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, [year, month, journalFilter]);

  const filtered = entries.filter(e =>
    !search ||
    e.piece_ref.toLowerCase().includes(search.toLowerCase()) ||
    e.account_code.includes(search) ||
    (e.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalDebit = filtered.reduce((a, e) => a + Number(e.debit_usd), 0);
  const totalCredit = filtered.reduce((a, e) => a + Number(e.credit_usd), 0);

  const handleExport = () => {
    if (filtered.length === 0) { toast.warning('Aucune écriture'); return; }
    exportToCSV({
      filename: `journal_${year}-${String(month).padStart(2, '0')}.csv`,
      headers: ['Date', 'Journal', 'Pièce', 'Compte', 'Libellé', 'Débit', 'Crédit', 'Description'],
      data: filtered.map(e => [
        e.entry_date, e.journal_code, e.piece_ref, e.account_code, e.account_label,
        Number(e.debit_usd).toFixed(2), Number(e.credit_usd).toFixed(2), e.description || '',
      ]),
    });
    toast.success('Journal exporté');
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Journal comptable</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={fetchEntries} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Écritures comptables persistantes générées automatiquement à partir des factures payées et avoirs.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <Label>Année</Label>
          <Input type="number" value={year} onChange={e => setYear(+e.target.value)} />
        </div>
        <div>
          <Label>Mois</Label>
          <Input type="number" min={1} max={12} value={month} onChange={e => setMonth(+e.target.value)} />
        </div>
        <div>
          <Label>Journal</Label>
          <Select value={journalFilter} onValueChange={setJournalFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="VTE">VTE — Ventes</SelectItem>
              <SelectItem value="AVO">AVO — Avoirs</SelectItem>
              <SelectItem value="RBT">RBT — Remboursements</SelectItem>
              <SelectItem value="OD">OD — Opérations diverses</SelectItem>
              <SelectItem value="BNQ">BNQ — Banque</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Recherche</Label>
          <Input placeholder="Pièce / compte / libellé" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="flex justify-between items-center text-xs">
        <div className="text-muted-foreground">
          {filtered.length} écritures · Débit ${totalDebit.toFixed(2)} · Crédit ${totalCredit.toFixed(2)}
          {Math.abs(totalDebit - totalCredit) > 0.01 && (
            <Badge variant="destructive" className="ml-2">Déséquilibre ${Math.abs(totalDebit - totalCredit).toFixed(2)}</Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={handleExport}>
          <Download className="h-3 w-3 mr-1" />CSV
        </Button>
      </div>

      <div className="border rounded overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Jrnl</th>
              <th className="p-2 text-left">Pièce</th>
              <th className="p-2 text-left">Compte</th>
              <th className="p-2 text-left">Libellé</th>
              <th className="p-2 text-right">Débit</th>
              <th className="p-2 text-right">Crédit</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} className="border-t hover:bg-muted/50">
                <td className="p-2 whitespace-nowrap">{e.entry_date}</td>
                <td className="p-2"><Badge variant="outline" className="text-[10px]">{e.journal_code}</Badge></td>
                <td className="p-2 font-mono text-[11px]">{e.piece_ref}</td>
                <td className="p-2 font-mono">{e.account_code}</td>
                <td className="p-2">{e.account_label}<div className="text-muted-foreground text-[10px]">{e.description}</div></td>
                <td className="p-2 text-right font-mono">{Number(e.debit_usd) > 0 ? Number(e.debit_usd).toFixed(2) : ''}</td>
                <td className="p-2 text-right font-mono">{Number(e.credit_usd) > 0 ? Number(e.credit_usd).toFixed(2) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default AdminAccountingJournal;
