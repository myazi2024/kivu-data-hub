import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import type { CadastralInvoice, CadastralService } from '@/hooks/useCadastralBilling';

// Informations légales complètes de BIC
const BIC_COMPANY_INFO = {
  name: "Bureau de l'Immobilier du Congo",
  abbreviation: "BIC",
  fullLegalName: "Bureau de l'Immobilier du Congo S.A.R.L.",
  address: "Avenue Patrice Lumumba, Quartier Himbi II",
  city: "Goma, Province du Nord-Kivu",
  country: "République Démocratique du Congo",
  rccm: "RCCM/GOMA/2024/B/001234",
  idNat: "01-234-N12345C",
  numImpot: "A1234567890",
  numTva: "TVA001234567",
  email: "contact@bic-congo.cd",
  phone: "+243 997 123 456",
  fax: "+243 281 123 457",
  website: "www.bic-congo.cd",
  authorizedCapital: "100.000 USD",
  legalForm: "Société à Responsabilité Limitée (S.A.R.L.)",
  tradeLicense: "LIC/2024/GOMA/001",
  establishedYear: "2024"
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

// Générateur d'ID unique pour les rapports
function generateReportId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `BIC-${timestamp}-${random}`.toUpperCase();
}

// Fonction pour formater une date pour le nom de fichier
function formatDateTimeForFilename(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
}

/**
 * Génère un rapport cadastral complet structuré selon les onglets du résultat cadastral
 */
export async function generateCadastralReport(
  cadastralResult: any,
  paidServices: string[],
  servicesCatalog: CadastralService[],
  filename?: string
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let currentY = margin;
  let pageNumber = 1;

  const { parcel, ownership_history, tax_history, mortgage_history, boundary_history, building_permits } = cadastralResult;
  
  // Générer un ID unique pour ce rapport et QR code
  const reportId = generateReportId();
  const reportDate = new Date();
  const reportDateTime = reportDate.toLocaleDateString('fr-FR') + ' à ' + reportDate.toLocaleTimeString('fr-FR');
  
  // Générer QR code pour vérification
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(`https://bic.cd/verify-report/${reportId}`);
  } catch (error) {
    console.error('Failed to generate QR code:', error);
  }

  // Fonction pour ajouter un en-tête de page
  const addPageHeader = () => {
    // Logo et en-tête BIC
    doc.setTextColor(0, 51, 102);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("BIC", margin, 15);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${BIC_COMPANY_INFO.address}, ${BIC_COMPANY_INFO.city}`, pageWidth - margin, 10, { align: 'right' });
    doc.text(`${BIC_COMPANY_INFO.email} | ${BIC_COMPANY_INFO.phone}`, pageWidth - margin, 14, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text("Bureau de l'Immobilier du Congo", margin, 19);
    
    // Titre du rapport
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 51, 102);
    doc.text("RAPPORT CADASTRAL COMPLET", pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Parcelle ${parcel.parcel_number}`, pageWidth / 2, 32, { align: 'center' });
    
    // Info rapport à droite
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Rapport N° ${reportId}`, pageWidth - margin, 18, { align: 'right' });
    doc.text(`Généré le ${reportDate.toLocaleDateString('fr-FR')}`, pageWidth - margin, 22, { align: 'right' });
    
    currentY = 45;
  };

  // Fonction pour ajouter un pied de page avec authentification
  const addPageFooter = () => {
    const footerY = pageHeight - 25;
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY, pageWidth - margin, footerY);
    
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text("Ce document a été généré par la plateforme BIC. Toute reproduction non vérifiée est considérée comme non conforme.", margin, footerY + 4);
    doc.text("Vérifiez ce rapport sur bic.cd/verify", margin, footerY + 8);
    
    // QR Code pour vérification
    if (qrCodeDataUrl) {
      try {
        doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - 35, footerY - 10, 12, 12);
      } catch (error) {
        console.error('Failed to add QR code to PDF:', error);
      }
    }
    
    doc.text(`Page ${pageNumber}`, pageWidth - margin, footerY + 8, { align: 'right' });
    doc.text(`${BIC_COMPANY_INFO.email} | ${BIC_COMPANY_INFO.phone}`, pageWidth - margin, footerY + 12, { align: 'right' });
  };

  // Fonction pour créer une nouvelle page
  const addNewPage = () => {
    addPageFooter();
    doc.addPage();
    pageNumber++;
    addPageHeader();
  };

  // Fonction de formatage des données
  const formatArea = (sqm: number): string => {
    if (!sqm || sqm === 0) return 'N/A';
    if (sqm >= 10000) {
      return `${(sqm / 10000).toFixed(4)} ha`;
    }
    return `${sqm.toLocaleString('fr-FR')} m²`;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // ===== PAGE 1: EN-TÊTE ET INFORMATIONS GÉNÉRALES =====
  addPageHeader();

  // Titre principal
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text("RAPPORT CADASTRAL COMPLET", pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;

  doc.setFontSize(14);
  doc.text(`Parcelle N° ${parcel.parcel_number}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Généré le ${reportDateTime}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;

  // 1. INFORMATIONS GÉNÉRALES
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("1. INFORMATIONS GÉNÉRALES", margin, currentY);
  currentY += 8;

  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const generalInfo = [
    ['Numéro de parcelle:', parcel.parcel_number || 'N/A'],
    ['Type de parcelle:', parcel.parcel_type === 'SU' ? 'Section Urbaine' : 'Section Rurale'],
    ['Type de titre foncier:', parcel.property_title_type || 'Non spécifié'],
    ['Superficie officielle:', `${formatArea(parcel.area_sqm)} (${parcel.area_hectares ? (parcel.area_hectares).toFixed(4) + ' ha' : 'N/A'})`],
    ['Superficie calculée (GPS):', parcel.gps_coordinates && parcel.gps_coordinates.length > 0 ? formatArea(calculateSurfaceFromBounds(parcel.gps_coordinates)) : 'N/A'],
    ['Nombre de bornes GPS:', parcel.gps_coordinates ? parcel.gps_coordinates.length.toString() : '0'],
    ['Propriétaire actuel:', parcel.current_owner_name || 'Non renseigné'],
    ['Statut juridique:', parcel.current_owner_legal_status || 'Non défini'],
    ['Propriétaire depuis:', formatDate(parcel.current_owner_since)]
  ];

  generalInfo.forEach(([label, value]) => {
    const labelWidth = 50;
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin, currentY);
    doc.text(value, margin + labelWidth, currentY);
    currentY += 6;
  });

  currentY += 10;

  // 2. LOCALISATION
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("2. LOCALISATION", margin, currentY);
  currentY += 8;

  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const locationInfo = [
    ['Circonscription foncière:', parcel.circonscription_fonciere || 'Circonscription Foncière de Goma'],
    ['Province:', parcel.province || 'Nord-Kivu'],
    ...(parcel.parcel_type === 'SU' ? [
      ['Ville:', parcel.ville || 'N/A'],
      ['Commune:', parcel.commune || 'N/A'],
      ['Quartier:', parcel.quartier || 'N/A'],
      ['Avenue:', parcel.avenue || 'N/A']
    ] : [
      ['Territoire:', parcel.territoire || 'N/A'],
      ['Collectivité:', parcel.collectivite || 'N/A'],
      ['Groupement:', parcel.groupement || 'N/A'],
      ['Village:', parcel.village || 'N/A']
    ])
  ];

  locationInfo.forEach(([label, value]) => {
    const labelWidth = 50;
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin, currentY);
    doc.text(value, margin + labelWidth, currentY);
    currentY += 6;
  });

  // ===== PAGE 2: COORDONNÉES GPS ET HISTORIQUE =====
  addNewPage();

  // 3. COORDONNÉES GPS DES BORNES
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("3. COORDONNÉES GPS DES BORNES", margin, currentY);
  currentY += 8;

  if (parcel.gps_coordinates && parcel.gps_coordinates.length > 0) {
    const gpsData = parcel.gps_coordinates.map((coord, index) => [
      `Borne ${index + 1}`,
      coord.lat.toFixed(6),
      coord.lng.toFixed(6)
    ]);

    autoTable(doc, {
      head: [['Borne', 'Latitude', 'Longitude']],
      body: gpsData,
      startY: currentY,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable?.finalY + 10;
  } else {
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text("Aucune coordonnée GPS disponible", margin, currentY);
    currentY += 15;
  }

  addPageFooter();

  // ===== PAGE 4: OBLIGATIONS FINANCIÈRES (correspond à l'onglet "Obligations") =====
  addNewPage();

  // 4. OBLIGATIONS FINANCIÈRES ET FISCALES
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("4. OBLIGATIONS FINANCIÈRES ET FISCALES", margin, currentY);
  currentY += 8;

  // 4.1 Historique des taxes foncières
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 51, 102);
  doc.text("4.1 Historique des taxes foncières", margin, currentY);
  currentY += 6;

  if (tax_history && tax_history.length > 0) {
    const taxData = tax_history.map(tax => [
      tax.tax_year?.toString() || 'N/A',
      `$${Number(tax.amount_usd || 0).toLocaleString()}`,
      tax.payment_status === 'paid' ? 'Payé' : 
      tax.payment_status === 'pending' ? 'En attente' : 'En retard',
      tax.payment_date ? formatDate(tax.payment_date) : 'Non payé',
      tax.payment_status === 'overdue' ? 'RETARD DE PAIEMENT' : 
      tax.payment_status === 'paid' ? 'À jour' : 'En attente'
    ]);

    autoTable(doc, {
      head: [['Année fiscale', 'Montant dû (USD)', 'Statut de paiement', 'Date de paiement', 'Observations']],
      body: taxData,
      startY: currentY,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable?.finalY + 8;

    // Calcul du résumé fiscal
    const totalTaxes = tax_history.reduce((sum, tax) => sum + Number(tax.amount_usd || 0), 0);
    const paidTaxes = tax_history.filter(tax => tax.payment_status === 'paid').reduce((sum, tax) => sum + Number(tax.amount_usd || 0), 0);
    const overdueTaxes = tax_history.filter(tax => tax.payment_status === 'overdue').reduce((sum, tax) => sum + Number(tax.amount_usd || 0), 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 51, 102);
    doc.text("Résumé fiscal:", margin, currentY);
    currentY += 5;

    const taxSummaryData = [
      ['Total des taxes dues', `$${totalTaxes.toLocaleString()}`],
      ['Montant payé', `$${paidTaxes.toLocaleString()}`],
      ['Arriérés en retard', `$${overdueTaxes.toLocaleString()}`],
      ['Statut global', overdueTaxes > 0 ? 'EN RETARD' : 'À JOUR']
    ];

    autoTable(doc, {
      head: [['Élément', 'Montant']],
      body: taxSummaryData,
      startY: currentY,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable?.finalY + 8;

    // Note explicative
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Note: Les taxes foncières sont dues annuellement selon la législation en vigueur en RDC.", margin, currentY);
    currentY += 10;
  } else {
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text("Aucun historique fiscal disponible pour cette parcelle", margin, currentY);
    currentY += 15;
  }

  // 4.2 Hypothèques et charges financières
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 51, 102);
  doc.text("4.2 Hypothèques et charges financières", margin, currentY);
  currentY += 6;

  if (mortgage_history && mortgage_history.length > 0) {
    const mortgageData = mortgage_history.map(mortgage => [
      mortgage.creditor_name || 'N/A',
      mortgage.creditor_type || 'Non spécifié',
      `$${Number(mortgage.mortgage_amount_usd || 0).toLocaleString()}`,
      `${Number(mortgage.duration_months || 0)} mois`,
      formatDate(mortgage.contract_date),
      mortgage.mortgage_status || 'Actif'
    ]);

    autoTable(doc, {
      head: [['Créancier', 'Type', 'Montant (USD)', 'Durée', 'Date contrat', 'Statut']],
      body: mortgageData,
      startY: currentY,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable?.finalY + 8;

    // Calcul du résumé des hypothèques
    const totalMortgages = mortgage_history.reduce((sum, mortgage) => sum + Number(mortgage.mortgage_amount_usd || 0), 0);
    const activeMortgages = mortgage_history.filter(mortgage => (mortgage.mortgage_status || 'active') === 'active');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 51, 102);
    doc.text("Résumé des charges:", margin, currentY);
    currentY += 5;

    const mortgageSummaryData = [
      ['Nombre d\'hypothèques', mortgage_history.length.toString()],
      ['Hypothèques actives', activeMortgages.length.toString()],
      ['Montant total engagé', `$${totalMortgages.toLocaleString()}`],
      ['Statut de la parcelle', activeMortgages.length > 0 ? 'GREVÉE D\'HYPOTHÈQUE' : 'LIBRE DE CHARGES']
    ];

    autoTable(doc, {
      head: [['Élément', 'Valeur']],
      body: mortgageSummaryData,
      startY: currentY,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable?.finalY + 8;

    // Note explicative
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Note: Les hypothèques constituent des sûretés réelles sur l'immeuble.", margin, currentY);
    currentY += 10;
  } else {
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text("Aucune hypothèque ou charge financière enregistrée sur cette parcelle", margin, currentY);
    currentY += 15;
  }

  // ===== PAGE 3: HYPOTHÈQUES ET BORNAGE =====
  addNewPage();

  // 6. HISTORIQUE DES HYPOTHÈQUES
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("6. HISTORIQUE DES HYPOTHÈQUES", margin, currentY);
  currentY += 8;

  if (mortgage_history && mortgage_history.length > 0) {
    const mortgageData = mortgage_history.map(mortgage => [
      mortgage.creditor_name || 'N/A',
      mortgage.creditor_type || 'N/A',
      `${Number(mortgage.mortgage_amount_usd || 0).toFixed(2)} USD`,
      `${mortgage.duration_months || 0} mois`,
      formatDate(mortgage.contract_date),
      mortgage.mortgage_status === 'active' ? 'Active' : 'Inactive'
    ]);

    autoTable(doc, {
      head: [['Créancier', 'Type', 'Montant', 'Durée', 'Date contrat', 'Statut']],
      body: mortgageData,
      startY: currentY,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable?.finalY + 10;
  } else {
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text("Aucun historique d'hypothèques disponible", margin, currentY);
    currentY += 15;
  }

  // 7. HISTORIQUE DE BORNAGE
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("7. HISTORIQUE DE BORNAGE", margin, currentY);
  currentY += 8;

  if (boundary_history && boundary_history.length > 0) {
    const boundaryData = boundary_history.map(boundary => [
      boundary.surveyor_name || 'N/A',
      boundary.pv_reference_number || 'N/A',
      formatDate(boundary.survey_date),
      boundary.boundary_purpose || 'N/A'
    ]);

    autoTable(doc, {
      head: [['Géomètre', 'Référence PV d\'arpentage', 'Date', 'Objet']],
      body: boundaryData,
      startY: currentY,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable?.finalY + 10;
  } else {
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text("Aucun historique de bornage disponible", margin, currentY);
    currentY += 15;
  }

  // 8. HISTORIQUE DE PERMIS DE CONSTRUIRE
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("8. HISTORIQUE DE PERMIS DE CONSTRUIRE", margin, currentY);
  currentY += 8;

  if (building_permits && building_permits.length > 0) {
    const permitData = building_permits.map(permit => {
      const issueDate = new Date(permit.issue_date);
      const validityEndDate = new Date(issueDate.getTime() + permit.validity_period_months * 30 * 24 * 60 * 60 * 1000);
      return [
        permit.permit_number || 'N/A',
        formatDate(permit.issue_date),
        validityEndDate.toLocaleDateString('fr-FR'),
        permit.administrative_status || 'N/A',
        permit.issuing_service || 'N/A',
        permit.is_current ? 'Actuel' : 'Ancien'
      ];
    });

    autoTable(doc, {
      head: [['N° Permis', 'Date émission', 'Date expiration', 'Statut admin', 'Service émetteur', 'Statut']],
      body: permitData,
      startY: currentY,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable?.finalY + 10;
  } else {
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text("Aucun historique de permis de construire disponible", margin, currentY);
    currentY += 15;
  }

  // ===== PAGE 4: SERVICES ET AUTHENTIFICATION =====
  addNewPage();

  // 9. SERVICES INCLUS DANS CE RAPPORT
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("9. SERVICES INCLUS DANS CE RAPPORT", margin, currentY);
  currentY += 8;

  const serviceData = paidServices.map(serviceId => {
    const service = servicesCatalog.find(s => s.id === serviceId);
    return service ? [
      service.name,
      service.description || 'N/A',
      `${Number(service.price).toFixed(2)} USD`
    ] : ['Service inconnu', 'N/A', '0.00 USD'];
  });

  if (serviceData.length > 0) {
    autoTable(doc, {
      head: [['Service', 'Description', 'Prix']],
      body: serviceData,
      startY: currentY,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
      columnStyles: {
        1: { cellWidth: 80 },
      },
      margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable?.finalY + 15;
  }

  // 10. AUTHENTIFICATION DU RAPPORT
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("10. AUTHENTIFICATION DU RAPPORT", margin, currentY);
  currentY += 8;

  // Ajouter un encadré pour les informations d'authentification
  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(0.5);
  doc.rect(margin, currentY - 3, pageWidth - 2 * margin, 35);

  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("IDENTIFIANT UNIQUE DE RAPPORT", margin + 5, currentY + 5);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`ID: ${reportId}`, margin + 5, currentY + 10);
  doc.text(`Date de génération: ${reportDateTime}`, margin + 5, currentY + 15);

  // Générer un QR code pour la vérification
  try {
    const qrCodeDataURL = await QRCode.toDataURL(`https://bic.cd/verify-report/${reportId}`, {
      width: 60,
      margin: 1
    });
    doc.addImage(qrCodeDataURL, 'PNG', pageWidth - margin - 25, currentY - 2, 20, 20);
    
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text("Scanner pour vérifier", pageWidth - margin - 25, currentY + 22, { align: 'center', maxWidth: 20 });
  } catch (error) {
    console.warn('Erreur lors de la génération du QR code:', error);
  }

  currentY += 25;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(200, 0, 0);
  doc.text("MENTIONS DE SÉCURITÉ", margin + 5, currentY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  currentY += 5;
  
  const securityText = [
    "• Ce document a été généré par la plateforme BIC (Bureau de l'Immobilier du Congo).",
    "• Toute reproduction non vérifiée est considérée comme non conforme.",
    "• Vérifiez l'authenticité de ce rapport sur bic.cd/verify-report",
    "• En cas de doute, contactez BIC au +243 997 123 456"
  ];

  securityText.forEach(text => {
    doc.text(text, margin + 5, currentY);
    currentY += 4;
  });

  currentY += 10;

  // Signature officielle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 51, 102);
  doc.text("Rapport certifié conforme par:", margin, currentY);
  currentY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text("________________________________", margin, currentY);
  currentY += 5;
  doc.text("Bureau de l'Immobilier du Congo", margin, currentY);
  doc.text(`Le ${reportDate.toLocaleDateString('fr-FR')}`, pageWidth - margin, currentY, { align: 'right' });

  // Ajouter le pied de page final
  addPageFooter();

  // Sauvegarder le document
  const defaultFilename = `rapport_cadastral_complet_${parcel.parcel_number.replace(/[^0-9A-Za-z]/g, '_')}_${formatDateTimeForFilename()}.pdf`;
  saveDocument(doc, filename || defaultFilename);
}


// Fonction utilitaire pour calculer la superficie depuis les coordonnées GPS (identique à l'écran)
function calculateSurfaceFromBounds(gpsCoordinates: Array<{lat: number, lng: number}>): number | null {
  if (!gpsCoordinates || gpsCoordinates.length < 3) return null;
  
  let area = 0;
  const coords = gpsCoordinates;
  const n = coords.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coords[i].lat * coords[j].lng;
    area -= coords[j].lat * coords[i].lng;
  }
  
  return Math.abs(area) / 2 * 111319.5 * 111319.5; // Conversion approximative en m²
}