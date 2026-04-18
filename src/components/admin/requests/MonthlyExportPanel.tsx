import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { exportApprovedRequestsCSV, downloadCSV } from '@/utils/exportRequestsCSV';

export const MonthlyExportPanel = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      const csv = await exportApprovedRequestsCSV(year, month);
      downloadCSV(csv, `demandes-approuvees-${year}-${String(month).padStart(2, '0')}.csv`);
      toast.success('Export généré');
    } catch (e: any) {
      toast.error(e.message || 'Erreur d\'export');
    } finally { setBusy(false); }
  };

  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Export comptable mensuel</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-xs text-muted-foreground">Mois</label>
          <Select value={String(month)} onValueChange={v => setMonth(+v)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Année</label>
          <Select value={String(year)} onValueChange={v => setYear(+v)}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button onClick={handleExport} disabled={busy}>
          <Download className="h-4 w-4 mr-1" /> Exporter CSV
        </Button>
      </CardContent>
    </Card>
  );
};
