import { toast } from 'sonner';

interface ParcelExportData {
  parcel_number: string;
  current_owner_name: string;
  area_sqm: number;
  province: string;
  ville: string;
  commune: string;
  quartier: string;
  parcel_type: string;
  property_title_type: string;
  latitude: number;
  longitude: number;
}

export const exportToCSV = (parcels: ParcelExportData[], filename: string = 'parcelles-cadastrales.csv') => {
  try {
    const headers = [
      'Numéro parcelle',
      'Propriétaire',
      'Superficie (m²)',
      'Province',
      'Ville',
      'Commune',
      'Quartier',
      'Type parcelle',
      'Type titre',
      'Latitude',
      'Longitude'
    ];

    const rows = parcels.map(p => [
      p.parcel_number,
      p.current_owner_name,
      p.area_sqm,
      p.province || '',
      p.ville || '',
      p.commune || '',
      p.quartier || '',
      p.parcel_type,
      p.property_title_type,
      p.latitude,
      p.longitude
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    
    toast.success('Export CSV réussi');
  } catch (error) {
    console.error('Erreur export CSV:', error);
    toast.error('Erreur lors de l\'export CSV');
  }
};

export const generateShareableLink = (filters: any): string => {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?${params.toString()}`;
};

export const copyShareableLink = (filters: any) => {
  const link = generateShareableLink(filters);
  navigator.clipboard.writeText(link).then(
    () => toast.success('Lien copié dans le presse-papiers'),
    () => toast.error('Erreur lors de la copie du lien')
  );
};

export const exportToPDF = async (parcels: ParcelExportData[], mapImageData?: string) => {
  try {
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Titre
    doc.setFontSize(18);
    doc.text('Rapport Cadastral', 15, 20);
    
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 15, 28);
    doc.text(`Nombre de parcelles: ${parcels.length}`, 15, 34);

    // Image de la carte si disponible
    if (mapImageData) {
      doc.addImage(mapImageData, 'PNG', 15, 40, 180, 100);
    }

    // Tableau des données
    const tableData = parcels.map(p => [
      p.parcel_number,
      p.current_owner_name,
      p.area_sqm.toFixed(2),
      p.province || '-',
      p.ville || '-',
      p.commune || '-'
    ]);

    (doc as any).autoTable({
      head: [['N° Parcelle', 'Propriétaire', 'Superficie (m²)', 'Province', 'Ville', 'Commune']],
      body: tableData,
      startY: mapImageData ? 150 : 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [239, 68, 68] }
    });

    doc.save('rapport-cadastral.pdf');
    toast.success('Export PDF réussi');
  } catch (error) {
    console.error('Erreur export PDF:', error);
    toast.error('Erreur lors de l\'export PDF');
  }
};
