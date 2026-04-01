import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import type { CadastralService } from '@/hooks/useCadastralServices';
import { createDocumentVerification } from '@/lib/documentVerification';

// Type minimal pour les factures dans le PDF
interface CadastralInvoice {
  id: string;
  parcel_number: string;
  search_date: string;
  selected_services: any;
  total_amount_usd: number;
  status: string;
  invoice_number: string;
  client_name?: string | null;
  client_email: string;
  client_organization?: string | null;
  geographical_zone?: string | null;
  payment_method?: string | null;
  created_at: string;
  updated_at: string;
  discount_code_used?: string | null;
  discount_amount_usd?: number;
  original_amount_usd?: number;
}

export type { CadastralInvoice };

// Informations légales complètes de BIC
const BIC_COMPANY_INFO = {
  name: "Bureau d'Informations Cadastrales",
  abbreviation: "BIC",
  fullLegalName: "Bureau d'Informations Cadastrales S.A.R.L.",
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
export async function generateInvoicePDF(
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
async function generateA4InvoicePDF(
  invoice: CadastralInvoice,
  servicesCatalog: CadastralService[],
  filename?: string
) {
  // Persist verification
  let verifyUrl = '';
  try {
    const verification = await createDocumentVerification({
      documentType: 'invoice',
      parcelNumber: invoice.parcel_number,
      clientName: invoice.client_name || null,
      clientEmail: invoice.client_email,
      metadata: {
        invoiceNumber: invoice.invoice_number,
        totalAmount: invoice.total_amount_usd,
        status: invoice.status,
      },
    });
    if (verification) {
      verifyUrl = verification.verifyUrl;
    }
  } catch (e) {
    console.error('Failed to persist invoice verification:', e);
  }

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
  doc.text("Bureau d'Informations Cadastrales", margin + 20, cursorY);
  
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
  doc.text("BIC - Bureau d'Informations Cadastrales", pageWidth / 2, 280, { align: 'center' });

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

// Legacy fallback ID generator (used only if verification persistence fails)
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
 * IMPORTANT: Utilise les données de contribution validées en priorité pour plus d'exactitude
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
  const margin = 15; // Réduire les marges pour plus d'espace
  let currentY = margin;
  let pageNumber = 1;

  // Récupérer les données de contribution validées si disponibles
  let contributionData = null;
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase
      .from('cadastral_contributions')
      .select('*')
      .eq('parcel_number', cadastralResult.parcel.parcel_number)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (data) {
      contributionData = data;
      console.log('Utilisation des données de contribution validées pour le rapport');
    }
  } catch (error) {
    console.log('Aucune contribution validée trouvée, utilisation des données cadastrales standards');
  }

  // Utiliser les données de contribution si disponibles, sinon les données cadastrales
  const parcel = contributionData || cadastralResult.parcel;
  const ownership_history = contributionData?.ownership_history || cadastralResult.ownership_history || [];
  const tax_history = contributionData?.tax_history || cadastralResult.tax_history || [];
  const mortgage_history = contributionData?.mortgage_history || cadastralResult.mortgage_history || [];
  const boundary_history = contributionData?.boundary_history || cadastralResult.boundary_history || [];
  const building_permits = contributionData?.building_permits || cadastralResult.building_permits || [];
  
  
  // Persist verification and generate QR code
  let reportId = generateReportId();
  let verifyUrl = `https://bic.cd/verify-report/${reportId}`;
  
  try {
    const verification = await createDocumentVerification({
      documentType: 'report',
      parcelNumber: parcel.parcel_number,
      clientName: parcel.current_owner_name || null,
      metadata: {
        paidServices,
        serviceNames: paidServices.map(id => servicesCatalog.find(s => s.id === id)?.name).filter(Boolean),
      },
    });
    if (verification) {
      reportId = verification.verificationCode;
      verifyUrl = verification.verifyUrl;
    }
  } catch (e) {
    console.error('Failed to persist verification, using fallback ID:', e);
  }

  const reportDate = new Date();
  const reportDateTime = reportDate.toLocaleDateString('fr-FR') + ' à ' + reportDate.toLocaleTimeString('fr-FR');
  
  // Générer QR code pour vérification
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(verifyUrl);
  } catch (error) {
    console.error('Failed to generate QR code:', error);
  }

  // Fonction pour ajouter un en-tête de page (optimisé)
  const addPageHeader = () => {
    // En-tête compact
    doc.setTextColor(0, 51, 102);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text("BIC - Bureau d'Informations Cadastrales", margin, 10);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(`${BIC_COMPANY_INFO.email} | ${BIC_COMPANY_INFO.phone}`, pageWidth - margin, 10, { align: 'right' });
    
    // Ligne de séparation
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.5);
    doc.line(margin, 13, pageWidth - margin, 13);
    
    currentY = 18;
  };

  // Fonction pour ajouter un pied de page (optimisé)
  const addPageFooter = () => {
    const footerY = pageHeight - 20;
    
    // Ligne de séparation
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY, pageWidth - margin, footerY);
    
    // Texte du pied de page
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Rapport N° ${reportId} - Généré le ${reportDate.toLocaleDateString('fr-FR')}`, margin, footerY + 4);
    doc.text("Scannez le QR code pour vérifier ce document", margin, footerY + 8);
    
    // QR Code compact
    if (qrCodeDataUrl) {
      try {
        doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - 25, footerY - 8, 10, 10);
      } catch (error) {
        console.error('Failed to add QR code to PDF:', error);
      }
    }
    
    doc.text(`Page ${pageNumber}/2`, pageWidth - margin, footerY + 8, { align: 'right' });
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
      return `${(sqm / 10000).toFixed(2)} ha`;
    }
    return `${sqm.toLocaleString('fr-FR')} m²`;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // ===== PAGE 1: INFORMATIONS PRINCIPALES =====
  addPageHeader();

  // Titre du rapport (compact)
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("RAPPORT CADASTRAL", pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  doc.setFontSize(12);
  doc.text(`Parcelle N° ${parcel.parcel_number || 'N/A'}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;

  // 1. INFORMATIONS GÉNÉRALES (condensées)
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("1. INFORMATIONS GÉNÉRALES", margin, currentY);
  currentY += 5;

  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  // Déterminer le type de propriétaire à afficher
  const ownerName = parcel.current_owner_name || 
                   (parcel.current_owners_details && Array.isArray(parcel.current_owners_details) && parcel.current_owners_details.length > 0
                     ? parcel.current_owners_details.map((o: any) => `${o.lastName} ${o.firstName || ''}`.trim()).join(', ')
                     : 'Non renseigné');

  const generalInfo = [
    ['Type:', parcel.parcel_type === 'SU' ? 'Section Urbaine' : (parcel.property_title_type || 'Non spécifié')],
    ['Superficie:', formatArea(parcel.area_sqm)],
    ['Propriétaire:', ownerName],
    ['Depuis:', formatDate(parcel.current_owner_since)],
  ];

  generalInfo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 30, currentY);
    currentY += 4;
  });

  currentY += 4;

  // 2. LOCALISATION (condensée)
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("2. LOCALISATION", margin, currentY);
  currentY += 5;

  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const locationInfo = [
    ['Province:', parcel.province || 'Nord-Kivu'],
    ...(parcel.parcel_type === 'SU' || parcel.ville ? [
      ['Ville:', parcel.ville || 'N/A'],
      ['Commune:', parcel.commune || 'N/A'],
      ['Quartier:', parcel.quartier || 'N/A'],
    ] : [
      ['Territoire:', parcel.territoire || 'N/A'],
      ['Collectivité:', parcel.collectivite || 'N/A'],
    ])
  ];

  locationInfo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 30, currentY);
    currentY += 4;
  });

  currentY += 4;


  // 3. COORDONNÉES GPS (condensées)
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("3. COORDONNÉES GPS", margin, currentY);
  currentY += 5;

  if (parcel.gps_coordinates && parcel.gps_coordinates.length > 0) {
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    const maxGPS = Math.min(parcel.gps_coordinates.length, 4); // Limiter à 4 bornes pour économiser de l'espace
    for (let i = 0; i < maxGPS; i++) {
      const coord = parcel.gps_coordinates[i];
      doc.text(`Borne ${i + 1}: ${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}`, margin, currentY);
      currentY += 4;
    }
    if (parcel.gps_coordinates.length > 4) {
      doc.setFont('helvetica', 'italic');
      doc.text(`... et ${parcel.gps_coordinates.length - 4} autre(s) borne(s)`, margin, currentY);
      currentY += 4;
    }
  } else {
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text("Aucune coordonnée GPS disponible", margin, currentY);
    currentY += 4;
  }

  currentY += 4;

  // 4. HISTORIQUE DE PROPRIÉTÉ (condensé)
  if (ownership_history && ownership_history.length > 0) {
    doc.setTextColor(0, 51, 102);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text("4. HISTORIQUE DE PROPRIÉTÉ", margin, currentY);
    currentY += 5;

    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    const maxHistory = Math.min(ownership_history.length, 3);
    for (let i = 0; i < maxHistory; i++) {
      const owner = ownership_history[i];
      doc.text(`${formatDate(owner.ownership_start_date)} - ${formatDate(owner.ownership_end_date)}: ${owner.owner_name}`, margin, currentY);
      currentY += 4;
    }
    if (ownership_history.length > 3) {
      doc.setFont('helvetica', 'italic');
      doc.text(`... et ${ownership_history.length - 3} ancien(s) propriétaire(s)`, margin, currentY);
      currentY += 4;
    }
    currentY += 4;
  }

  // Passer à la page 2
  addNewPage();


  // 5. OBLIGATIONS FINANCIÈRES (condensées)
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("5. OBLIGATIONS FINANCIÈRES", margin, currentY);
  currentY += 5;

  // 5.1 Taxes foncières
  if (tax_history && tax_history.length > 0) {
    const totalTaxes = tax_history.reduce((sum, tax) => sum + Number(tax.amount_usd || 0), 0);
    const paidTaxes = tax_history.filter(tax => tax.payment_status === 'paid').reduce((sum, tax) => sum + Number(tax.amount_usd || 0), 0);
    const overdueTaxes = tax_history.filter(tax => tax.payment_status === 'overdue').reduce((sum, tax) => sum + Number(tax.amount_usd || 0), 0);
    
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    doc.text(`Taxes: Total $${totalTaxes.toLocaleString()} | Payé $${paidTaxes.toLocaleString()} | Arriérés $${overdueTaxes.toLocaleString()}`, margin, currentY);
    currentY += 4;
    doc.text(`Statut: ${overdueTaxes > 0 ? 'EN RETARD' : 'À JOUR'}`, margin, currentY);
    currentY += 4;
  } else {
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text("Aucun historique fiscal disponible", margin, currentY);
    currentY += 4;
  }

  currentY += 2;

  // 5.2 Hypothèques
  if (mortgage_history && mortgage_history.length > 0) {
    const totalMortgages = mortgage_history.reduce((sum, m) => sum + Number(m.mortgage_amount_usd || 0), 0);
    const activeMortgages = mortgage_history.filter(m => m.mortgage_status === 'active');
    
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    doc.text(`Hypothèques: ${activeMortgages.length} active(s) | Total $${totalMortgages.toLocaleString()}`, margin, currentY);
    currentY += 4;
    
    if (activeMortgages.length > 0) {
      const latest = activeMortgages[0];
      doc.text(`Dernière: ${latest.creditor_name} - $${Number(latest.mortgage_amount_usd).toLocaleString()}`, margin, currentY);
      currentY += 4;
    }
  } else {
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text("Aucune hypothèque enregistrée", margin, currentY);
    currentY += 4;
  }

  currentY += 4;

  // 6. AUTORISATION DE BÂTIR ET BORNAGE (condensés)
  if (building_permits && building_permits.length > 0) {
    doc.setTextColor(0, 51, 102);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text("6. AUTORISATION DE BÂTIR", margin, currentY);
    currentY += 5;

    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    const latest = building_permits[0];
    doc.text(`N° ${latest.permit_number || 'N/A'} | ${latest.issuing_service || 'N/A'}`, margin, currentY);
    currentY += 4;
    doc.text(`Délivré: ${formatDate(latest.issue_date)} | Statut: ${latest.administrative_status || 'En cours'}`, margin, currentY);
    currentY += 4;
  }

  if (boundary_history && boundary_history.length > 0) {
    doc.setTextColor(0, 51, 102);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text("7. BORNAGE", margin, currentY);
    currentY += 5;

    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    const latest = boundary_history[0];
    doc.text(`PV: ${latest.pv_reference_number || 'N/A'} | Date: ${formatDate(latest.survey_date)}`, margin, currentY);
    currentY += 4;
    doc.text(`Géomètre: ${latest.surveyor_name || 'N/A'}`, margin, currentY);
    currentY += 4;
  }

  currentY += 4;

  // 8. SERVICES INCLUS
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("8. SERVICES INCLUS", margin, currentY);
  currentY += 5;

  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  const serviceNames = paidServices.map(serviceId => {
    const service = servicesCatalog.find(s => s.id === serviceId);
    return service ? `${service.name} ($${Number(service.price).toFixed(2)})` : 'Service inconnu';
  });
  
  doc.text(serviceNames.join(', ') || 'Aucun service', margin, currentY, { maxWidth: pageWidth - 2 * margin });
  currentY += 8;

  // 9. AUTHENTIFICATION
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("9. AUTHENTIFICATION", margin, currentY);
  currentY += 5;

  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(0.3);
  doc.rect(margin, currentY - 2, pageWidth - 2 * margin, 25);

  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text("IDENTIFIANT UNIQUE", margin + 3, currentY + 3);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`ID: ${reportId}`, margin + 3, currentY + 8);
  doc.text(`Date: ${reportDateTime}`, margin + 3, currentY + 13);

  // QR code compact
  if (qrCodeDataUrl) {
    try {
      doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - margin - 20, currentY, 17, 17);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6);
      doc.text("Vérifier", pageWidth - margin - 11.5, currentY + 19, { align: 'center' });
    } catch (error) {
      console.error('Failed to add QR code:', error);
    }
  }

  currentY += 28;

  // Mentions de sécurité
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("Ce document a été généré par BIC. Scannez le QR code pour vérifier son authenticité.", margin, currentY, { maxWidth: pageWidth - 2 * margin });
  
  // Note sur les données
  currentY += 6;
  if (contributionData) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(0, 100, 0);
    doc.text("✓ Données issues de contribution cadastrale validée", margin, currentY);
  }

  // Pied de page final
  addPageFooter();

  // Sauvegarder le PDF
  const pdfFilename = filename || `Rapport_Cadastral_${parcel.parcel_number}_${formatDateTimeForFilename()}.pdf`;
  saveDocument(doc, pdfFilename);
}

/**
 * Calcule la surface en mètres carrés à partir des coordonnées GPS
 */
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