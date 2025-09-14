import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CadastralInvoice, CadastralService } from '@/hooks/useCadastralBilling';

// Informations légales de BIC
const BIC_COMPANY_INFO = {
  name: "Bureau de l'Immobilier du Congo",
  abbreviation: "BIC",
  address: "Avenue Patrice Lumumba, Goma, Nord-Kivu, RDC",
  rccm: "RCCM/GOMA/2024/B/001234",
  idNat: "01-234-N12345C",
  numImpot: "A1234567890",
  email: "contact@bic-congo.cd",
  phone: "+243 997 123 456"
};

export type InvoiceFormat = 'mini' | 'a4';

/**
 * Génère un PDF de justificatif de paiement avec format sélectionnable
 */
export function generateInvoicePDF(
  invoice: CadastralInvoice,
  servicesCatalog: CadastralService[],
  format: InvoiceFormat = 'a4',
  filename?: string
) {
  if (format === 'mini') {
    return generateMiniInvoicePDF(invoice, servicesCatalog, filename);
  } else {
    return generateA4InvoicePDF(invoice, servicesCatalog, filename);
  }
}

/**
 * Génère un mini-justificatif compact
 */
function generateMiniInvoicePDF(
  invoice: CadastralInvoice,
  servicesCatalog: CadastralService[],
  filename?: string
) {
  const doc = new jsPDF({ unit: 'mm', format: [80, 120], orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 5;
  let cursorY = margin;

  // En-tête compact
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(BIC_COMPANY_INFO.abbreviation, pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 5;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text("JUSTIFICATIF DE PAIEMENT", pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 8;

  // Informations facture
  doc.setFontSize(7);
  doc.text(`N°: ${invoice.invoice_number}`, margin, cursorY);
  cursorY += 4;
  doc.text(`Date: ${new Date(invoice.search_date).toLocaleDateString('fr-FR')}`, margin, cursorY);
  cursorY += 4;
  doc.text(`Parcelle: ${invoice.parcel_number}`, margin, cursorY);
  cursorY += 4;
  
  // Statut
  const statusText = invoice.status === 'paid' ? 'Payée' : 
                    invoice.status === 'pending' ? 'En attente' : 'Échec';
  doc.text(`Statut: ${statusText}`, margin, cursorY);
  cursorY += 6;

  // Services
  const selectedIds = getSelectedServiceIds(invoice);
  const selectedServices = servicesCatalog.filter(s => selectedIds.includes(s.id));
  
  doc.setFont('helvetica', 'bold');
  doc.text("Prestations:", margin, cursorY);
  cursorY += 4;
  
  doc.setFont('helvetica', 'normal');
  let subtotal = 0;
  selectedServices.forEach(service => {
    const price = Number(service.price);
    subtotal += price;
    doc.text(`${service.name}: $${price.toFixed(2)}`, margin, cursorY);
    cursorY += 3;
  });

  // TVA et Total
  const discountAmount = Number(invoice.discount_amount_usd || 0);
  const netAmount = subtotal - discountAmount;
  const tvaAmount = netAmount * 0.16; // 16% TVA
  const total = netAmount + tvaAmount;

  cursorY += 2;
  if (discountAmount > 0) {
    doc.text(`Remise: -$${discountAmount.toFixed(2)}`, margin, cursorY);
    cursorY += 3;
  }
  doc.text(`TVA 16%: $${tvaAmount.toFixed(2)}`, margin, cursorY);
  cursorY += 4;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`TOTAL: $${total.toFixed(2)} USD`, pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 8;

  // Contact
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text(BIC_COMPANY_INFO.phone, pageWidth / 2, cursorY, { align: 'center' });

  saveDocument(doc, filename || `mini_justificatif_BIC_${formatDateForFilename()}_${invoice.invoice_number.replace(/[^0-9A-Za-z]/g, '_')}.pdf`);
}

/**
 * Génère un justificatif de paiement A4 complet
 */
function generateA4InvoicePDF(
  invoice: CadastralInvoice,
  servicesCatalog: CadastralService[],
  filename?: string
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let cursorY = margin;

  // En-tête ultra compact
  doc.setTextColor(44, 62, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.text("BIC", margin, cursorY);
  
  doc.setFontSize(8);
  doc.setTextColor(127, 140, 141);
  doc.text("Bureau de l'Immobilier du Congo", margin + 20, cursorY);
  
  // Date et numéro à droite
  doc.text(`${new Date(invoice.search_date).toLocaleDateString('fr-FR')}`, pageWidth - margin, cursorY, { align: 'right' });
  doc.text(`N° ${invoice.invoice_number}`, pageWidth - margin, cursorY + 4, { align: 'right' });

  cursorY += 20;
  // Informations en ligne compacte
  const selectedIds = getSelectedServiceIds(invoice);
  const selectedServices = servicesCatalog.filter(s => selectedIds.includes(s.id));
  
  doc.setTextColor(44, 62, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Parcelle et statut en une ligne
  doc.text(`Parcelle ${invoice.parcel_number}`, margin, cursorY);
  const statusText = invoice.status === 'paid' ? 'Payé' : 'En attente';
  doc.setTextColor(statusText === 'Payé' ? 39 : 231, statusText === 'Payé' ? 174 : 76, statusText === 'Payé' ? 96 : 60);
  doc.text(statusText, pageWidth - margin, cursorY, { align: 'right' });
  
  cursorY += 8;
  doc.setTextColor(44, 62, 80);

  // Services en tableau ultra compact
  if (selectedServices.length > 0) {
    const tableData = selectedServices.map(service => [
      service.name,
      `${Number(service.price).toFixed(2)} $`
    ]);

    autoTable(doc, {
      head: [["Service", "Prix"]],
      body: tableData,
      startY: cursorY,
      styles: { 
        fontSize: 9, 
        cellPadding: 1.5,
        lineColor: [230, 230, 230],
        lineWidth: 0.2,
        textColor: [44, 62, 80]
      },
      headStyles: { 
        fillColor: [250, 250, 250], 
        textColor: [44, 62, 80],
        fontStyle: 'normal',
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: (pageWidth - 2 * margin) * 0.7 },
        1: { cellWidth: (pageWidth - 2 * margin) * 0.3, halign: 'right' }
      },
      theme: 'plain',
      margin: { left: margin, right: margin }
    });

    cursorY = (doc as any).lastAutoTable?.finalY + 5;
  }

  // Calculs compacts
  const subtotal = selectedServices.reduce((sum, service) => sum + Number(service.price), 0);
  const discountAmount = Number(invoice.discount_amount_usd || 0);
  const netAmount = subtotal - discountAmount;
  const tvaAmount = netAmount * 0.16;
  const total = netAmount + tvaAmount;

  // Totaux alignés à droite
  const rightAlign = pageWidth - margin;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  if (discountAmount > 0) {
    doc.text(`Remise: -${discountAmount.toFixed(2)} $`, rightAlign, cursorY, { align: 'right' });
    cursorY += 4;
  }
  
  doc.text(`TVA 16%: ${tvaAmount.toFixed(2)} $`, rightAlign, cursorY, { align: 'right' });
  cursorY += 6;

  // Total avec emphase
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Total: ${total.toFixed(2)} $`, rightAlign, cursorY, { align: 'right' });
  
  cursorY += 15;

  // Pied de page minimaliste
  doc.setTextColor(127, 140, 141);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text("BIC - Bureau de l'Immobilier du Congo", pageWidth / 2, 280, { align: 'center' });

  saveDocument(doc, filename || `justificatif_BIC_${formatDateForFilename()}_${invoice.invoice_number.replace(/[^0-9A-Za-z]/g, '_')}.pdf`);
}

// Fonctions utilitaires
function getSelectedServiceIds(invoice: CadastralInvoice): string[] {
  return Array.isArray(invoice.selected_services)
    ? invoice.selected_services as string[]
    : (typeof invoice.selected_services === 'string' ? JSON.parse(invoice.selected_services || '[]') : []);
}

function formatDateForFilename(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function saveDocument(doc: jsPDF, filename: string) {
  try {
    doc.save(filename);
  } catch (e) {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }
}

/**
 * Génère un rapport cadastral ultra compact et adaptatif
 */
export function generateCadastralReport(
  cadastralResult: any,
  paidServices: string[],
  servicesCatalog: CadastralService[],
  filename?: string
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let currentY = margin;

  const { parcel, ownership_history, tax_history, mortgage_history, boundary_history } = cadastralResult;

  // En-tête ultra compact
  doc.setTextColor(44, 62, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(18);
  doc.text("BIC", margin, currentY);
  
  doc.setFontSize(8);
  doc.setTextColor(127, 140, 141);
  doc.text("Bureau de l'Immobilier du Congo", margin + 25, currentY);
  
  // Date à droite
  doc.text(new Date().toLocaleDateString('fr-FR'), pageWidth - margin, currentY, { align: 'right' });
  currentY += 15;

  // Titre compact
  doc.setTextColor(44, 62, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.text(`Rapport Cadastral - Parcelle ${parcel.parcel_number}`, margin, currentY);
  currentY += 10;

  // Services acquis en une ligne compacte
  const serviceNames = paidServices.map(serviceId => {
    const service = servicesCatalog.find(s => s.id === serviceId);
    return service ? service.name.split(' ')[0] : serviceId; // Premier mot seulement
  }).join(' • ');
  
  doc.setTextColor(127, 140, 141);
  doc.setFontSize(8);
  doc.text(`Services: ${serviceNames}`, margin, currentY);
  currentY += 12;

  // Fonction pour créer des sections compactes
  const addCompactSection = (title: string, data: Array<[string, string]>) => {
    if (currentY + (data.length * 4) + 15 > 270) {
      doc.addPage();
      currentY = margin;
    }

    doc.setTextColor(44, 62, 80);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(title, margin, currentY);
    currentY += 6;

    autoTable(doc, {
      startY: currentY,
      head: [['', '']],
      body: data,
      showHead: false,
      styles: { 
        fontSize: 8,
        cellPadding: 1,
        lineColor: [240, 240, 240],
        lineWidth: 0.1,
        textColor: [44, 62, 80]
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: pageWidth - 2 * margin - 50 }
      },
      theme: 'plain',
      margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable?.finalY + 8;
  };

  // Informations générales - si payé
  if (paidServices.includes('information')) {
    const formatArea = (area: number): string => {
      if (area >= 10000) return `${(area / 10000).toFixed(2)} ha`;
      return `${area.toLocaleString()} m²`;
    };

    addCompactSection('Informations générales', [
      ['Parcelle', parcel.parcel_number || 'N/A'],
      ['Type', parcel.parcel_type === 'SU' ? 'Urbaine' : 'Rurale'],
      ['Superficie', parcel.official_area ? formatArea(parcel.official_area) : 'N/A'],
      ['Statut', parcel.legal_status || 'N/A'],
      ['Enregistrement', parcel.registration_date ? new Date(parcel.registration_date).toLocaleDateString('fr-FR') : 'N/A']
    ]);
  }

  // Localisation - si payé
  if (paidServices.includes('location_history')) {
    const locationData = [];
    if (parcel.province) locationData.push(['Province', parcel.province]);
    if (parcel.ville) locationData.push(['Ville', parcel.ville]);
    if (parcel.commune) locationData.push(['Commune', parcel.commune]);
    if (parcel.quartier) locationData.push(['Quartier', parcel.quartier]);
    if (parcel.avenue) locationData.push(['Avenue', parcel.avenue]);
    if (parcel.location) locationData.push(['Adresse complète', parcel.location]);

    if (locationData.length > 0) {
      addCompactSection('Localisation', locationData);
    }
  }

  // Historique de propriété - si payé
  if (paidServices.includes('ownership_history') && ownership_history?.length > 0) {
    const ownershipData = ownership_history.slice(0, 5).map((owner: any, index: number) => [
      `Propriétaire ${index + 1}`,
      `${owner.owner_name || 'N/A'} (${owner.ownership_start_date ? new Date(owner.ownership_start_date).getFullYear() : 'N/A'})`
    ]);
    
    addCompactSection('Historique de propriété', ownershipData);
  }

  // Historique fiscal - si payé
  if (paidServices.includes('tax_history') && tax_history?.length > 0) {
    const taxData = tax_history.slice(0, 5).map((tax: any) => [
      new Date(tax.tax_year).getFullYear().toString(),
      `${tax.amount_due || 'N/A'} USD - ${tax.payment_status === 'paid' ? 'Payé' : 'En attente'}`
    ]);
    
    addCompactSection('Historique fiscal', taxData);
  }

  // Hypothèques - si payé
  if (paidServices.includes('mortgage_history') && mortgage_history?.length > 0) {
    const mortgageData = mortgage_history.slice(0, 3).map((mortgage: any) => [
      'Hypothèque',
      `${mortgage.lender_name || 'N/A'} - ${mortgage.mortgage_amount || 'N/A'} USD`
    ]);
    
    addCompactSection('Hypothèques', mortgageData);
  }

  // Coordonnées GPS compactes - si payé
  if (paidServices.includes('location_history') && parcel.gps_coordinates?.length > 0) {
    const gpsData = parcel.gps_coordinates.slice(0, 8).map((coord: any, index: number) => [
      `Point ${index + 1}`,
      `${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)}`
    ]);
    
    addCompactSection('Coordonnées GPS', gpsData);
  }

  // Pied de page compact
  const footerY = 285;
  doc.setTextColor(127, 140, 141);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text("Bureau de l'Immobilier du Congo - Rapport généré automatiquement", pageWidth / 2, footerY, { align: 'center' });

  // Sauvegarde
  const fn = filename || `rapport_cadastral_${parcel.parcel_number}_${Date.now()}.pdf`;
  saveDocument(doc, fn);
}