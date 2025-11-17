import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ExportData {
  statistics: any;
  periodRange: {
    startDate: Date;
    endDate: Date;
  };
}

export const exportToCSV = (data: ExportData, filename: string = 'admin-dashboard') => {
  const { statistics, periodRange } = data;
  
  const csvRows = [
    ['Rapport Dashboard Admin'],
    ['Période', `${format(periodRange.startDate, 'dd/MM/yyyy', { locale: fr })} - ${format(periodRange.endDate, 'dd/MM/yyyy', { locale: fr })}`],
    [''],
    ['Statistiques Générales'],
    ['Métrique', 'Valeur'],
    ['Total Utilisateurs', statistics.total_users || 0],
    ['Total Revenus', `$${(statistics.total_revenue || 0).toFixed(2)}`],
    ['Contributions Approuvées', statistics.approved_contributions || 0],
    ['Contributions Totales', statistics.total_contributions || 0],
    ['Paiements en attente', statistics.pending_payments || 0],
    ['Codes CCC générés', statistics.total_ccc_codes || 0],
    ['Revendeurs actifs', statistics.total_resellers || 0],
  ];

  const csvContent = csvRows.map(row => row.join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToJSON = (data: ExportData, filename: string = 'admin-dashboard') => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${format(new Date(), 'yyyy-MM-dd')}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
