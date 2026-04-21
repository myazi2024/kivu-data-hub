import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { exportToCSV } from '@/utils/csvExport';

const FEC_HEADERS = [
  'JournalCode','JournalLib','EcritureNum','EcritureDate','CompteNum','CompteLib',
  'CompAuxNum','CompAuxLib','PieceRef','PieceDate','EcritureLib','Debit','Credit',
  'EcritureLet','DateLet','ValidDate','Montantdevise','Idevise',
];

const AdminFECExport = () => {
  const today = new Date();
  const lastMonth = subMonths(today, 1);
  const [startDate, setStartDate] = useState(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  const fetchEntries = async () => {
    const { data, error } = await supabase.rpc('export_fec_period' as any, {
      _start_date: startDate, _end_date: endDate,
    });
    if (error) throw error;
    return (data as any[]) || [];
  };

  const handlePreview = async () => {
    try {
      setLoading(true);
      const entries = await fetchEntries();
      setPreview(entries);
      toast.success(`${entries.length} écritures trouvées`);
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const entries = preview.length > 0 ? preview : await fetchEntries();
      if (entries.length === 0) {
        toast.warning('Aucune écriture sur la période');
        return;
      }
      exportToCSV({
        filename: `FEC_${startDate}_${endDate}.csv`,
        headers: FEC_HEADERS,
        data: entries.map((e: any) => [
          e.journal_code, e.journal_lib, e.ecriture_num, e.ecriture_date,
          e.compte_num, e.compte_lib, e.comp_aux_num || '', e.comp_aux_lib || '',
          e.piece_ref, e.piece_date, e.ecriture_lib,
          Number(e.debit).toFixed(2).replace('.', ','),
          Number(e.credit).toFixed(2).replace('.', ','),
          e.ecriture_let || '', e.date_let || '', e.valid_date,
          Number(e.montant_devise).toFixed(2).replace('.', ','), e.idevise,
        ]),
      });
      toast.success('Export FEC généré');
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold">Export comptable FEC</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Génère le Fichier des Écritures Comptables conforme au format normalisé (factures payées + avoirs).
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Date début</Label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <Label>Date fin</Label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handlePreview} disabled={loading}>
          Prévisualiser
        </Button>
        <Button size="sm" onClick={handleExport} disabled={loading}>
          <Download className="h-4 w-4 mr-1" />
          Télécharger CSV
        </Button>
      </div>
      {preview.length > 0 && (
        <div className="text-xs text-muted-foreground border-t pt-2">
          {preview.length} écritures — total débit ${preview.reduce((a, e) => a + Number(e.debit), 0).toFixed(2)} / total crédit ${preview.reduce((a, e) => a + Number(e.credit), 0).toFixed(2)}
        </div>
      )}
    </Card>
  );
};

export default AdminFECExport;
