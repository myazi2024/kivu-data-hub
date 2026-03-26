import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AutomatedReportsProps {
  onGenerate?: (reportId: string) => void;
}

interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  fetchAndExport: () => Promise<void>;
}

export function AutomatedReports({ onGenerate }: AutomatedReportsProps) {
  const { toast } = useToast();

  const downloadCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast({ title: 'Aucune donnée', description: 'Pas de données à exporter', variant: 'destructive' });
      return;
    }
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const val = row[h];
        const str = val === null || val === undefined ? '' : String(val);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const reports: ReportDefinition[] = [
    {
      id: 'revenue',
      name: 'Export Revenus (Factures)',
      description: 'Toutes les factures payées avec montants et dates',
      fetchAndExport: async () => {
        const { data, error } = await supabase
          .from('cadastral_invoices')
          .select('invoice_number, parcel_number, client_email, client_name, total_amount_usd, status, payment_method, created_at')
          .eq('status', 'paid')
          .order('created_at', { ascending: false });
        if (error) throw error;
        downloadCSV(data || [], 'revenus_factures');
      },
    },
    {
      id: 'contributions',
      name: 'Export Contributions CCC',
      description: 'Toutes les contributions avec statut et parcelle',
      fetchAndExport: async () => {
        const { data, error } = await supabase
          .from('cadastral_contributions')
          .select('parcel_number, contribution_type, status, province, commune, created_at')
          .order('created_at', { ascending: false });
        if (error) throw error;
        downloadCSV(data || [], 'contributions_ccc');
      },
    },
    {
      id: 'users',
      name: 'Export Utilisateurs',
      description: 'Liste des utilisateurs inscrits',
      fetchAndExport: async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, email, phone, is_blocked, created_at')
          .order('created_at', { ascending: false });
        if (error) throw error;
        downloadCSV(data || [], 'utilisateurs');
      },
    },
  ];

  const handleExport = async (report: ReportDefinition) => {
    try {
      toast({ title: 'Génération en cours', description: `Export de ${report.name}...` });
      await report.fetchAndExport();
      toast({ title: 'Export terminé', description: `${report.name} téléchargé avec succès` });
      onGenerate?.(report.id);
    } catch (error: any) {
      console.error('Export error:', error);
      toast({ title: 'Erreur', description: `Impossible d'exporter: ${error.message}`, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-sm md:text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Rapports & Exports
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="p-3 rounded-lg border bg-card"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs md:text-sm font-semibold truncate">
                    {report.name}
                  </h4>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                    {report.description}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] md:text-xs px-2"
                onClick={() => handleExport(report)}
              >
                <Download className="h-3 w-3 mr-1" />
                Télécharger CSV
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
