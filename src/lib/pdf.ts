import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import type { CadastralService } from '@/hooks/useCadastralServices';
import { createDocumentVerification } from '@/lib/documentVerification';
import { fetchAppLogo } from '@/utils/pdfLogoHelper';
import { fetchCompanyLegalInfo, TAX_REGIME_LABELS, type CompanyLegalInfo } from '@/hooks/useCompanyLegalInfo';
import { TVA_RATE } from '@/constants/billing';

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
  client_type?: string | null;
  client_nif?: string | null;
  client_rccm?: string | null;
  client_id_nat?: string | null;
  client_address?: string | null;
  client_tax_regime?: string | null;
  geographical_zone?: string | null;
  payment_method?: string | null;
  created_at: string;
  updated_at: string;
  discount_code_used?: string | null;
  discount_amount_usd?: number;
  original_amount_usd?: number;
  currency_code?: string | null;
  exchange_rate_used?: number | null;
  paid_at?: string | null;
  invoice_signature?: string | null;
  dgi_validation_code?: string | null;
}

export type { CadastralInvoice };

// Fallback minimal — la vraie source est `company_legal_info` (table BD)
const BIC_COMPANY_INFO_FALLBACK = {
  name: "Bureau d'Informations Cadastrales",
  abbreviation: "BIC",
};

/** Conversion USD → CDF avec arrondi à 2 décimales */
function toCDF(amountUsd: number, rate: number): number {
  return Math.round(amountUsd * rate * 100) / 100;
}

function formatMoney(amount: number, currency: string): string {
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function formatBilingual(amountUsd: number, rate: number): string {
  if (!rate || rate === 1) return formatMoney(amountUsd, 'USD');
  return `${formatMoney(amountUsd, 'USD')}  /  ${formatMoney(toCDF(amountUsd, rate), 'CDF')}`;
}

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
async function generateMiniInvoicePDF(
  invoice: CadastralInvoice,
  servicesCatalog: CadastralService[],
  filename?: string
) {
  const doc = new jsPDF({ unit: 'mm', format: [80, 120], orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 5;
  let cursorY = margin;

  // En-tête compact avec logo
  const miniLogo = await fetchAppLogo();
  if (miniLogo) {
    try {
      doc.addImage(miniLogo, 'PNG', pageWidth / 2 - 3, cursorY - 3, 6, 6);
      cursorY += 4;
    } catch { /* ignore logo errors */ }
  }
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

  // En-tête ultra compact avec logo
  const a4Logo = await fetchAppLogo();
  let logoOffsetX = 0;
  if (a4Logo) {
    try {
      doc.addImage(a4Logo, 'PNG', margin, cursorY - 5, 8, 8);
      logoOffsetX = 10;
    } catch { /* ignore logo errors */ }
  }
  doc.setTextColor(44, 62, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.text("BIC", margin + logoOffsetX, cursorY);
  
  doc.setFontSize(8);
  doc.setTextColor(127, 140, 141);
  doc.text("Bureau d'Informations Cadastrales", margin + logoOffsetX + 20, cursorY);
  
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

  // QR code de vérification
  if (verifyUrl) {
    try {
      const qrDataUrl = await QRCode.toDataURL(verifyUrl);
      doc.addImage(qrDataUrl, 'PNG', margin, 265, 12, 12);
      doc.setTextColor(127, 140, 141);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6);
      doc.text("Scannez pour vérifier", margin + 6, 279, { align: 'center' });
    } catch (e) {
      console.error('QR code generation failed:', e);
    }
  }

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
 * Génère un rapport cadastral complet — PDF professionnel multi-pages
 * Miroir fidèle de CadastralDocumentView (7 sections + authentification)
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
  const margin = 15;
  let currentY = margin;
  let totalPages = 0;

  // --- Load contribution data ---
  let contributionData: any = null;
  let logoBase64: string | null = null;
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const [contribResult, configResult] = await Promise.all([
      supabase
        .from('cadastral_contributions')
        .select('*')
        .eq('parcel_number', cadastralResult.parcel.parcel_number)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('app_appearance_config')
        .select('config_value')
        .eq('config_key', 'logo_url')
        .maybeSingle(),
    ]);
    if (contribResult.data) contributionData = contribResult.data;
    const logoUrl = configResult.data?.config_value as string | null;
    if (logoUrl) {
      try {
        const resp = await fetch(logoUrl);
        const blob = await resp.blob();
        logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch { /* fallback: no logo */ }
    }
  } catch { /* use standard data */ }

  const parcel = contributionData || cadastralResult.parcel;
  const ownership_history = contributionData?.ownership_history || cadastralResult.ownership_history || [];
  const tax_history = contributionData?.tax_history || cadastralResult.tax_history || [];
  const mortgage_history = contributionData?.mortgage_history || cadastralResult.mortgage_history || [];
  const boundary_history = contributionData?.boundary_history || cadastralResult.boundary_history || [];
  const building_permits = contributionData?.building_permits || cadastralResult.building_permits || [];
  const land_disputes = cadastralResult.land_disputes || [];

  // --- Verification & QR ---
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
  } catch { /* fallback ID */ }

  const reportDate = new Date();
  const reportDateTime = reportDate.toLocaleDateString('fr-FR') + ' à ' + reportDate.toLocaleTimeString('fr-FR');
  let qrCodeDataUrl = '';
  try { qrCodeDataUrl = await QRCode.toDataURL(verifyUrl); } catch { /* */ }

  // --- Helpers ---
  const BLUE = [0, 51, 102] as const;
  const GRAY = [60, 60, 60] as const;
  const LIGHT_GRAY = [100, 100, 100] as const;

  const formatDate = (d: string | null): string => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  };
  const formatArea = (sqm: number): string => {
    if (!sqm || sqm === 0) return 'N/A';
    if (sqm >= 10000) return `${(sqm / 10000).toFixed(2)} ha (${sqm.toLocaleString('fr-FR')} m²)`;
    return `${sqm.toLocaleString('fr-FR')} m²`;
  };

  const ownerName = parcel.current_owner_name ||
    (Array.isArray(parcel.current_owners_details) && parcel.current_owners_details.length > 0
      ? parcel.current_owners_details.map((o: any) => `${o.lastName || ''} ${o.firstName || ''}`.trim()).join(', ')
      : 'Non renseigné');

  const addPageHeader = () => {
    if (logoBase64) {
      try { doc.addImage(logoBase64, 'PNG', margin, 4, 8, 8); } catch { /* */ }
    }
    doc.setTextColor(...BLUE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text("RÉPUBLIQUE DÉMOCRATIQUE DU CONGO", pageWidth / 2, 8, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text("Bureau d'Informations Cadastrales (BIC)", pageWidth / 2, 12, { align: 'center' });
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.5);
    doc.line(margin, 14, pageWidth - margin, 14);
    currentY = 18;
  };

  const addPageFooter = () => {
    const fy = pageHeight - 12;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, fy - 2, pageWidth - margin, fy - 2);
    doc.setTextColor(...LIGHT_GRAY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text(`Rapport N° ${reportId} — ${reportDate.toLocaleDateString('fr-FR')}`, margin, fy + 1);
    if (qrCodeDataUrl) {
      try { doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - margin - 8, fy - 10, 8, 8); } catch { /* */ }
    }
  };

  const ensureSpace = (needed: number) => {
    if (currentY + needed > pageHeight - 18) {
      addPageFooter();
      doc.addPage();
      totalPages++;
      addPageHeader();
    }
  };

  const sectionTitle = (num: number, title: string) => {
    ensureSpace(12);
    doc.setTextColor(...BLUE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${num}. ${title}`, margin, currentY);
    currentY += 1;
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, margin + 60, currentY);
    currentY += 4;
  };

  const fieldRow = (label: string, value: string, bold = false) => {
    ensureSpace(5);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(label, margin, currentY);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(value || '—', margin + 45, currentY, { maxWidth: pageWidth - margin - 50 });
    currentY += 4.5;
  };

  const lockedSection = (title: string) => {
    ensureSpace(12);
    doc.setTextColor(...LIGHT_GRAY);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(`[${title} — Section non incluse dans votre achat]`, margin, currentY);
    currentY += 6;
  };

  const isServicePaid = (serviceId: string) => paidServices.includes(serviceId);

  // ===== PAGE 1: COVER =====
  totalPages = 1;
  addPageHeader();

  // Title block
  doc.setTextColor(...BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text("FICHE CADASTRALE", pageWidth / 2, currentY + 4, { align: 'center' });
  currentY += 10;
  doc.setFontSize(14);
  doc.text(`Parcelle N° ${parcel.parcel_number || 'N/A'}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 7;

  // Type badge
  const typeLabel = parcel.parcel_type === 'SU' ? 'Section Urbaine (SU)' : 'Section Rurale (SR)';
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(typeLabel, pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  // Dispute badge
  if (parcel.has_dispute) {
    doc.setTextColor(200, 100, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text("⚠ LITIGE EN COURS", pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
  }

  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Document généré le ${reportDateTime}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 3;
  doc.text(`Code de vérification : ${reportId}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;

  // QR code on cover
  if (qrCodeDataUrl) {
    try {
      doc.addImage(qrCodeDataUrl, 'PNG', pageWidth / 2 - 12, currentY, 24, 24);
      currentY += 26;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.text("Scannez pour vérifier l'authenticité", pageWidth / 2, currentY, { align: 'center' });
      currentY += 8;
    } catch { currentY += 4; }
  }

  // ===== SECTION 1: IDENTIFICATION =====
  sectionTitle(1, "IDENTIFICATION DE LA PARCELLE");
  fieldRow("Type de titre", parcel.property_title_type || 'Non spécifié');
  if (parcel.title_reference_number) fieldRow("Référence du titre", parcel.title_reference_number);
  if (parcel.title_issue_date) fieldRow("Date d'émission", formatDate(parcel.title_issue_date));
  if (parcel.location) fieldRow("Adresse", parcel.location);
  fieldRow("Superficie déclarée", formatArea(parcel.area_sqm), true);
  if (parcel.surface_calculee_bornes != null) {
    const variance = parcel.area_sqm ? ((parcel.surface_calculee_bornes - parcel.area_sqm) / parcel.area_sqm * 100) : null;
    let surfaceText = formatArea(parcel.surface_calculee_bornes);
    if (variance !== null && Math.abs(variance) > 1) {
      surfaceText += ` (${variance > 0 ? '+' : ''}${variance.toFixed(1)}% variance)`;
    }
    fieldRow("Superficie mesurée (GPS)", surfaceText);
  }
  if (parcel.declared_usage) fieldRow("Usage déclaré", parcel.declared_usage);
  if (parcel.lease_type) fieldRow("Type de bail", parcel.lease_type);
  if (parcel.standing) fieldRow("Standing", parcel.standing);
  if (parcel.is_subdivided != null) fieldRow("Parcelle subdivisée", parcel.is_subdivided ? 'Oui — Lotie' : 'Non');
  currentY += 3;

  // ===== SECTION 2: PROPRIÉTAIRE =====
  sectionTitle(2, "PROPRIÉTAIRE ACTUEL");
  fieldRow("Nom complet", ownerName, true);
  if (parcel.current_owner_legal_status) fieldRow("Statut juridique", parcel.current_owner_legal_status);
  fieldRow("Propriétaire depuis", formatDate(parcel.current_owner_since));
  if (parcel.whatsapp_number) fieldRow("WhatsApp", parcel.whatsapp_number);
  currentY += 3;

  // ===== SECTION 3: CONSTRUCTION & AUTORISATIONS =====
  const hasConstruction = parcel.construction_type || parcel.construction_nature || parcel.construction_materials || parcel.construction_year;
  if (hasConstruction || building_permits.length > 0) {
    sectionTitle(3, "CONSTRUCTION & AUTORISATIONS");
    if (hasConstruction) {
      if (parcel.construction_type) fieldRow("Type de construction", parcel.construction_type);
      if (parcel.construction_nature) fieldRow("Nature", parcel.construction_nature);
      if (parcel.construction_materials) fieldRow("Matériaux", parcel.construction_materials);
      if (parcel.construction_year) fieldRow("Année de construction", String(parcel.construction_year));
      currentY += 2;
    }
    if (building_permits.length > 0) {
      ensureSpace(20);
      doc.setTextColor(...GRAY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text("Autorisations de bâtir", margin, currentY);
      currentY += 2;
      autoTable(doc, {
        startY: currentY,
        head: [['N° Permis', 'Émission', 'Validité', 'Statut', 'Service émetteur']],
        body: building_permits.map((p: any) => {
          const issueDate = new Date(p.issue_date);
          const endDate = new Date(issueDate);
          endDate.setMonth(endDate.getMonth() + (p.validity_period_months || 0));
          const isValid = endDate > new Date();
          return [
            p.permit_number || '—',
            formatDate(p.issue_date),
            `${isValid ? 'Valide' : 'Expiré'} — ${endDate.toLocaleDateString('fr-FR')}`,
            p.administrative_status || '—',
            p.issuing_service || '—',
          ];
        }),
        styles: { fontSize: 7, cellPadding: 1.5, textColor: [60, 60, 60] },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontSize: 7 },
        margin: { left: margin, right: margin },
        theme: 'grid',
      });
      currentY = (doc as any).lastAutoTable?.finalY + 5 || currentY + 20;
    }
  }

  // ===== SECTION 4: LOCALISATION =====
  sectionTitle(4, "LOCALISATION");
  fieldRow("Province", parcel.province || '—');
  if (parcel.parcel_type === 'SU') {
    if (parcel.ville) fieldRow("Ville", parcel.ville);
    if (parcel.commune) fieldRow("Commune", parcel.commune);
    if (parcel.quartier) fieldRow("Quartier", parcel.quartier);
    if (parcel.avenue) fieldRow("Avenue", parcel.avenue);
    if (parcel.house_number) fieldRow("N° Maison", parcel.house_number);
  } else {
    if (parcel.territoire) fieldRow("Territoire", parcel.territoire);
    if (parcel.collectivite) fieldRow("Collectivité", parcel.collectivite);
    if (parcel.groupement) fieldRow("Groupement", parcel.groupement);
    if (parcel.village) fieldRow("Village", parcel.village);
  }
  if (parcel.latitude && parcel.longitude) {
    fieldRow("Coordonnées GPS", `${Number(parcel.latitude).toFixed(6)}, ${Number(parcel.longitude).toFixed(6)}`);
  }
  if (parcel.nombre_bornes) fieldRow("Nombre de bornes", String(parcel.nombre_bornes));

  // GPS coordinates (all bounds)
  const gpsCoords = Array.isArray(parcel.gps_coordinates) ? parcel.gps_coordinates : [];
  if (gpsCoords.length > 0) {
    ensureSpace(10 + gpsCoords.length * 4);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text("Bornes GPS", margin, currentY);
    currentY += 2;
    autoTable(doc, {
      startY: currentY,
      head: [['Borne', 'Latitude', 'Longitude']],
      body: gpsCoords.map((c: any, i: number) => [
        c.borne || `B${i + 1}`,
        Number(c.lat).toFixed(6),
        Number(c.lng).toFixed(6),
      ]),
      styles: { fontSize: 7, cellPadding: 1.2, textColor: [60, 60, 60] },
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontSize: 7 },
      margin: { left: margin, right: margin },
      theme: 'grid',
    });
    currentY = (doc as any).lastAutoTable?.finalY + 4 || currentY + 15;
  }

  // Parcel sides
  const parcelSides: any[] = Array.isArray(parcel.parcel_sides)
    ? (parcel.parcel_sides as any[]).filter((s: any) => s && (s.side || s.length))
    : [];
  if (parcelSides.length > 0) {
    ensureSpace(10 + parcelSides.length * 5);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text("Dimensions des côtés", margin, currentY);
    currentY += 2;
    autoTable(doc, {
      startY: currentY,
      head: [['Côté', 'Longueur (m)', 'Orientation']],
      body: parcelSides.map((s: any, i: number) => [
        s.side || `Côté ${i + 1}`,
        s.length != null ? `${s.length} m` : '—',
        s.orientation || '—',
      ]),
      styles: { fontSize: 7, cellPadding: 1.2, textColor: [60, 60, 60] },
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontSize: 7 },
      margin: { left: margin, right: margin },
      theme: 'grid',
    });
    currentY = (doc as any).lastAutoTable?.finalY + 4 || currentY + 15;
  }

  // Boundary history
  if (boundary_history.length > 0) {
    ensureSpace(10 + boundary_history.length * 5);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text("Historique de bornage", margin, currentY);
    currentY += 2;
    autoTable(doc, {
      startY: currentY,
      head: [['Réf. PV', 'Objet', 'Géomètre', 'Date']],
      body: boundary_history.map((b: any) => [
        b.pv_reference_number || '—',
        b.boundary_purpose || '—',
        b.surveyor_name || '—',
        formatDate(b.survey_date),
      ]),
      styles: { fontSize: 7, cellPadding: 1.2, textColor: [60, 60, 60] },
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontSize: 7 },
      margin: { left: margin, right: margin },
      theme: 'grid',
    });
    currentY = (doc as any).lastAutoTable?.finalY + 5 || currentY + 15;
  }

  // ===== SECTION 5: HISTORIQUE DE PROPRIÉTÉ =====
  sectionTitle(5, "HISTORIQUE DE PROPRIÉTÉ");
  if (ownership_history.length > 0) {
    ensureSpace(15);
    const historyRows = [
      [ownerName, parcel.current_owner_legal_status || '—', formatDate(parcel.current_owner_since), 'Actuel', '—'],
      ...ownership_history.map((o: any) => [
        o.owner_name || '—',
        o.legal_status || '—',
        formatDate(o.ownership_start_date),
        formatDate(o.ownership_end_date),
        o.mutation_type || '—',
      ]),
    ];
    autoTable(doc, {
      startY: currentY,
      head: [['Propriétaire', 'Statut juridique', 'Du', 'Au', 'Mutation']],
      body: historyRows,
      styles: { fontSize: 7, cellPadding: 1.5, textColor: [60, 60, 60] },
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontSize: 7 },
      bodyStyles: {},
      margin: { left: margin, right: margin },
      theme: 'grid',
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.row.index === 0) {
          data.cell.styles.fillColor = [230, 240, 255];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    currentY = (doc as any).lastAutoTable?.finalY + 5 || currentY + 20;
  } else {
    doc.setTextColor(...LIGHT_GRAY);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text("Aucun ancien propriétaire enregistré", margin, currentY);
    currentY += 6;
  }

  // ===== SECTION 6: OBLIGATIONS FINANCIÈRES =====
  sectionTitle(6, "OBLIGATIONS FINANCIÈRES");

  // 6.1 Taxes
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text("Taxes foncières", margin, currentY);
  currentY += 2;

  if (tax_history.length > 0) {
    ensureSpace(15);
    autoTable(doc, {
      startY: currentY,
      head: [['Année', 'Montant (USD)', 'Statut', 'Date paiement']],
      body: tax_history.map((t: any) => {
        const status = t.payment_status === 'paid' ? 'Payé' : t.payment_status === 'overdue' ? 'En retard' : t.payment_status;
        return [
          String(t.tax_year),
          `$${Number(t.amount_usd).toLocaleString('fr-FR')}`,
          status,
          t.payment_date ? formatDate(t.payment_date) : '—',
        ];
      }),
      styles: { fontSize: 7, cellPadding: 1.2, textColor: [60, 60, 60] },
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontSize: 7 },
      margin: { left: margin, right: margin },
      theme: 'grid',
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 2) {
          const val = data.cell.raw;
          if (val === 'En retard') data.cell.styles.textColor = [200, 50, 50];
          else if (val === 'Payé') data.cell.styles.textColor = [39, 174, 96];
        }
      },
    });
    currentY = (doc as any).lastAutoTable?.finalY + 5 || currentY + 20;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...LIGHT_GRAY);
    doc.setFontSize(8);
    doc.text("Aucun historique fiscal disponible", margin, currentY);
    currentY += 6;
  }

  // 6.2 Hypothèques
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text("Hypothèques", margin, currentY);
  currentY += 2;

  if (mortgage_history.length > 0) {
    ensureSpace(15);
    autoTable(doc, {
      startY: currentY,
      head: [['Créancier', 'Type', 'Montant (USD)', 'Durée', 'Date contrat', 'Statut']],
      body: mortgage_history.map((m: any) => {
        const statusLabel = m.mortgage_status === 'active' ? 'Active' : m.mortgage_status === 'closed' ? 'Clôturée' : m.mortgage_status;
        return [
          m.creditor_name || '—',
          m.creditor_type || '—',
          `$${Number(m.mortgage_amount_usd).toLocaleString('fr-FR')}`,
          `${m.duration_months || '—'} mois`,
          formatDate(m.contract_date),
          statusLabel,
        ];
      }),
      styles: { fontSize: 7, cellPadding: 1.2, textColor: [60, 60, 60] },
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontSize: 7 },
      margin: { left: margin, right: margin },
      theme: 'grid',
    });
    currentY = (doc as any).lastAutoTable?.finalY + 5 || currentY + 20;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...LIGHT_GRAY);
    doc.setFontSize(8);
    doc.text("Aucune hypothèque enregistrée", margin, currentY);
    currentY += 6;
  }

  // ===== SECTION 7: LITIGES FONCIERS =====
  sectionTitle(7, "LITIGES FONCIERS");
  if (parcel.has_dispute && land_disputes.length > 0) {
    ensureSpace(15);
    autoTable(doc, {
      startY: currentY,
      head: [['Référence', 'Type', 'Nature', 'Statut', 'Date']],
      body: land_disputes.map((d: any) => [
        d.reference_number || '—',
        d.dispute_type || '—',
        d.dispute_nature || '—',
        d.current_status || '—',
        formatDate(d.created_at),
      ]),
      styles: { fontSize: 7, cellPadding: 1.2, textColor: [60, 60, 60] },
      headStyles: { fillColor: [200, 100, 0], textColor: [255, 255, 255], fontSize: 7 },
      margin: { left: margin, right: margin },
      theme: 'grid',
    });
    currentY = (doc as any).lastAutoTable?.finalY + 5 || currentY + 20;
  } else if (parcel.has_dispute) {
    doc.setTextColor(200, 100, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text("⚠ Un litige est signalé sur cette parcelle. Détails non disponibles.", margin, currentY);
    currentY += 6;
  } else {
    doc.setTextColor(39, 174, 96);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text("Aucun litige signalé sur cette parcelle.", margin, currentY);
    currentY += 6;
  }

  // ===== SERVICES INCLUS =====
  ensureSpace(20);
  doc.setTextColor(...BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text("SERVICES INCLUS DANS CET ACHAT", margin, currentY);
  currentY += 5;

  const paidServiceNames = paidServices.map(id => {
    const s = servicesCatalog.find(svc => svc.id === id);
    return s ? `• ${s.name}` : null;
  }).filter(Boolean);

  if (paidServiceNames.length > 0) {
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    paidServiceNames.forEach(name => {
      ensureSpace(5);
      doc.text(name!, margin + 2, currentY);
      currentY += 4;
    });
  } else {
    doc.setTextColor(...LIGHT_GRAY);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text("Aucun service sélectionné", margin, currentY);
    currentY += 5;
  }
  currentY += 4;

  // ===== AUTHENTIFICATION =====
  ensureSpace(35);
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.4);
  doc.rect(margin, currentY, pageWidth - 2 * margin, 28);

  doc.setTextColor(...BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text("AUTHENTIFICATION DU DOCUMENT", margin + 3, currentY + 5);

  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Identifiant unique : ${reportId}`, margin + 3, currentY + 10);
  doc.text(`Date de génération : ${reportDateTime}`, margin + 3, currentY + 15);
  doc.text(`Vérification : ${verifyUrl}`, margin + 3, currentY + 20);

  if (qrCodeDataUrl) {
    try {
      doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - margin - 22, currentY + 2, 20, 20);
    } catch { /* */ }
  }
  currentY += 32;

  // ===== DISCLAIMER =====
  ensureSpace(30);
  doc.setTextColor(...LIGHT_GRAY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text("Avis de non-responsabilité :", margin, currentY);
  currentY += 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const disclaimer = "Les informations contenues dans ce document proviennent de sources officielles (services cadastraux, conservation des titres immobiliers) et de contributions communautaires vérifiées. Le Bureau d'Informations Cadastrales (BIC) ne saurait garantir l'exhaustivité, l'exactitude absolue ou l'actualité permanente de l'ensemble des données. BIC agit de bonne foi dans son travail de compilation et de présentation de ces informations.";
  const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - 2 * margin);
  doc.text(disclaimerLines, margin, currentY);
  currentY += disclaimerLines.length * 3 + 2;

  const disclaimer2 = `En cas de divergence avec la situation réelle, veuillez vous rapprocher du service des Affaires Foncières compétent pour solliciter une mise à jour des informations relatives à la parcelle ${parcel.parcel_number}.`;
  const disclaimer2Lines = doc.splitTextToSize(disclaimer2, pageWidth - 2 * margin);
  doc.text(disclaimer2Lines, margin, currentY);
  currentY += disclaimer2Lines.length * 3 + 2;

  if (contributionData) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(0, 100, 0);
    doc.text("✓ Données issues de contribution cadastrale validée", margin, currentY);
    currentY += 5;
  }

  // Add footer to all pages
  const numPages = doc.getNumberOfPages();
  for (let i = 1; i <= numPages; i++) {
    doc.setPage(i);
    addPageFooter();
    doc.setTextColor(...LIGHT_GRAY);
    doc.setFontSize(6);
    doc.text(`Page ${i}/${numPages}`, pageWidth - margin, pageHeight - 11, { align: 'right' });
  }

  // Save
  const pdfFilename = filename || `Fiche_Cadastrale_${parcel.parcel_number}_${formatDateTimeForFilename()}.pdf`;
  saveDocument(doc, pdfFilename);
}