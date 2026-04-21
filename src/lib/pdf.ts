import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import type { CadastralService } from '@/hooks/useCadastralServices';
import { createDocumentVerification } from '@/lib/documentVerification';
import { fetchAppLogo } from '@/utils/pdfLogoHelper';
import { fetchCompanyLegalInfo, TAX_REGIME_LABELS, type CompanyLegalInfo } from '@/hooks/useCompanyLegalInfo';
import { TVA_RATE } from '@/constants/billing';
import { fetchInvoiceTemplateConfig, DEFAULT_INVOICE_TEMPLATE_CONFIG } from '@/hooks/useInvoiceTemplateConfig';

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

/** Mapping centralisé des couleurs de statut — partagé entre PDF (jsPDF) et aperçu HTML pour garantir la parité WYSIWYG. */
export type InvoiceStatusKey = 'paid' | 'pending' | 'failed';
export const INVOICE_STATUS_COLORS: Record<InvoiceStatusKey, { hex: string; rgb: [number, number, number] }> = {
  paid:    { hex: '#27ae60', rgb: [39, 174, 96] },
  pending: { hex: '#e74c3c', rgb: [231, 76, 60] },
  failed:  { hex: '#c0392b', rgb: [192, 57, 43] },
};
export const INVOICE_STATUS_LABELS: Record<InvoiceStatusKey, string> = {
  paid: 'PAYÉE',
  pending: 'EN ATTENTE',
  failed: 'ÉCHEC',
};
export function resolveInvoiceStatus(raw: string | null | undefined): InvoiceStatusKey {
  return raw === 'paid' ? 'paid' : raw === 'pending' ? 'pending' : 'failed';
}

/** Convertit une couleur hex (#rrggbb) en tuple RGB jsPDF. Fallback sur defaultRgb si invalide. */
function hexToRgb(hex: string | undefined | null, defaultRgb: [number, number, number]): [number, number, number] {
  if (!hex) return defaultRgb;
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return defaultRgb;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

/**
 * Génère un PDF de justificatif de paiement avec format sélectionnable
 */
export interface InvoicePdfOptions {
  /** Si true, ouvre le PDF dans un nouvel onglet au lieu de le télécharger (pour la comparaison admin). */
  openInNewTab?: boolean;
}

export async function generateInvoicePDF(
  invoice: CadastralInvoice,
  servicesCatalog: CadastralService[],
  format: InvoiceFormat = 'a4',
  filename?: string,
  options?: InvoicePdfOptions
) {
  if (format === 'mini') {
    return generateMiniInvoicePDF(invoice, servicesCatalog, filename, options);
  } else {
    return generateA4InvoicePDF(invoice, servicesCatalog, filename, options);
  }
}

/**
 * Génère un mini-justificatif compact (ticket de caisse réduit)
 * Mention « FACTURE NORMALISÉE » + décomposition HT/TVA/TTC obligatoire DGI
 */
async function generateMiniInvoicePDF(
  invoice: CadastralInvoice,
  servicesCatalog: CadastralService[],
  filename?: string,
  options?: InvoicePdfOptions
) {
  const doc = new jsPDF({ unit: 'mm', format: [80, 160], orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 5;
  let cursorY = margin;

  const [company, tplCfg] = await Promise.all([fetchCompanyLegalInfo(), fetchInvoiceTemplateConfig()]);
  const tvaRate = tplCfg.tva_rate ?? TVA_RATE;
  const exchangeRate = Number(invoice.exchange_rate_used || 1);

  // En-tête
  const miniLogo = await fetchAppLogo();
  if (miniLogo) {
    try {
      doc.addImage(miniLogo, 'PNG', pageWidth / 2 - 3, cursorY - 2, 6, 6);
      cursorY += 5;
    } catch { /* ignore logo errors */ }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(company.trade_name || company.legal_name, pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 4;

  if (tplCfg.show_dgi_mention) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text("FACTURE NORMALISÉE", pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 3;
  }
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIF: ${company.nif} • RCCM: ${company.rccm}`, pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 6;

  // Infos facture
  doc.setFontSize(7);
  doc.text(`N°: ${invoice.invoice_number}`, margin, cursorY); cursorY += 3.5;
  doc.text(`Date: ${new Date(invoice.search_date).toLocaleDateString('fr-FR')}`, margin, cursorY); cursorY += 3.5;
  doc.text(`Parcelle: ${invoice.parcel_number}`, margin, cursorY); cursorY += 3.5;
  if (invoice.client_name) { doc.text(`Client: ${invoice.client_name.substring(0, 30)}`, margin, cursorY); cursorY += 3.5; }
  if (invoice.client_nif) { doc.text(`NIF Client: ${invoice.client_nif}`, margin, cursorY); cursorY += 3.5; }

  const statusText = invoice.status === 'paid' ? 'Payée' : invoice.status === 'pending' ? 'En attente' : 'Échec';
  doc.text(`Statut: ${statusText}`, margin, cursorY); cursorY += 5;

  // Services
  const selectedIds = getSelectedServiceIds(invoice);
  const selectedServices = servicesCatalog.filter(s => selectedIds.includes(s.id));

  doc.setFont('helvetica', 'bold');
  doc.text("Prestations (TTC)", margin, cursorY); cursorY += 3.5;
  doc.setFont('helvetica', 'normal');

  let subtotalTTC = 0;
  selectedServices.forEach(service => {
    const price = Number(service.price);
    subtotalTTC += price;
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    doc.text(`${service.name.substring(0, 26)}`, margin, cursorY);
    doc.text(`${price.toFixed(2)}$`, pageWidth - margin, cursorY, { align: 'right' });
    cursorY += 3;
    const desc = (service as any).description as string | undefined;
    if (desc && desc.trim()) {
      doc.setFontSize(6);
      doc.setTextColor(120, 120, 120);
      const truncated = desc.length > 50 ? `${desc.substring(0, 50)}…` : desc;
      doc.text(truncated, margin, cursorY);
      cursorY += 2.5;
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
    }
  });

  // Décomposition fiscale conforme DGI
  const discountTTC = Number(invoice.discount_amount_usd || 0);
  const totalTTC = subtotalTTC - discountTTC;
  const totalHT = totalTTC / (1 + tvaRate);
  const tvaAmount = totalTTC - totalHT;

  cursorY += 2;
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 3;

  if (discountTTC > 0) {
    doc.text(`Remise:`, margin, cursorY);
    doc.text(`-${discountTTC.toFixed(2)}$`, pageWidth - margin, cursorY, { align: 'right' });
    cursorY += 3;
  }
  doc.text(`Base HT:`, margin, cursorY);
  doc.text(`${totalHT.toFixed(2)}$`, pageWidth - margin, cursorY, { align: 'right' }); cursorY += 3;
  doc.text(`${tplCfg.tva_label}:`, margin, cursorY);
  doc.text(`${tvaAmount.toFixed(2)}$`, pageWidth - margin, cursorY, { align: 'right' }); cursorY += 3.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`TOTAL TTC:`, margin, cursorY);
  doc.text(`${totalTTC.toFixed(2)}$`, pageWidth - margin, cursorY, { align: 'right' });
  cursorY += 4;

  if (exchangeRate > 1) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`(${formatMoney(toCDF(totalTTC, exchangeRate), 'CDF')} au taux ${exchangeRate})`,
      pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 4;
  }

  cursorY += 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  if (company.phone) { doc.text(company.phone, pageWidth / 2, cursorY, { align: 'center' }); cursorY += 2.5; }
  doc.text(`Régime: ${TAX_REGIME_LABELS[company.tax_regime] || company.tax_regime}`,
    pageWidth / 2, cursorY, { align: 'center' });

  saveDocument(doc, filename || `facture_normalisee_${formatDateForFilename()}_${invoice.invoice_number.replace(/[^0-9A-Za-z]/g, '_')}.pdf`, options);
}

/**
 * Génère une facture normalisée DGI (RDC) format A4
 * Conforme : mention « Facture normalisée », bloc émetteur+client complets,
 * décomposition HT/TVA/TTC, bilingue USD/CDF, QR vérification.
 */
async function generateA4InvoicePDF(
  invoice: CadastralInvoice,
  servicesCatalog: CadastralService[],
  filename?: string,
  options?: InvoicePdfOptions
) {
  let verifyUrl = '';
  let verificationCode = '';
  let company: CompanyLegalInfo;
  let tplCfg = DEFAULT_INVOICE_TEMPLATE_CONFIG;
  try {
    const [verification, companyInfo, cfg] = await Promise.all([
      createDocumentVerification({
        documentType: 'invoice',
        parcelNumber: invoice.parcel_number,
        clientName: invoice.client_name || null,
        clientEmail: invoice.client_email,
        metadata: {
          invoiceNumber: invoice.invoice_number,
          totalAmount: invoice.total_amount_usd,
          status: invoice.status,
        },
      }),
      fetchCompanyLegalInfo(),
      fetchInvoiceTemplateConfig(),
    ]);
    if (verification) {
      verifyUrl = verification.verifyUrl;
      verificationCode = verification.verificationCode;
    }
    company = companyInfo;
    tplCfg = cfg;
  } catch (e) {
    console.error('Failed to init invoice PDF:', e);
    company = await fetchCompanyLegalInfo();
    tplCfg = await fetchInvoiceTemplateConfig();
  }
  const tvaRate = tplCfg.tva_rate ?? TVA_RATE;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  let cursorY = margin;

  const exchangeRate = Number(invoice.exchange_rate_used || 1);
  const headerRgb = hexToRgb(tplCfg.header_color, [0, 51, 102]);
  const secondaryRgb = hexToRgb(tplCfg.secondary_color, [0, 51, 102]);

  // ===== EN-TÊTE OFFICIEL =====
  const a4Logo = await fetchAppLogo();
  if (a4Logo) {
    try { doc.addImage(a4Logo, 'PNG', margin, cursorY, 14, 14); } catch { /* */ }
  }

  doc.setTextColor(33, 37, 41);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(company.legal_name, margin + 18, cursorY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  let emY = cursorY + 9;
  doc.text(`${company.address_line1}${company.address_line2 ? ', ' + company.address_line2 : ''}`, margin + 18, emY); emY += 3;
  doc.text(`${company.city}, ${company.province}, ${company.country}`, margin + 18, emY); emY += 3;
  doc.text(`NIF: ${company.nif}  •  RCCM: ${company.rccm}  •  ID-NAT: ${company.id_nat}`, margin + 18, emY); emY += 3;
  if (company.tva_number) { doc.text(`N° TVA: ${company.tva_number}  •  Régime: ${TAX_REGIME_LABELS[company.tax_regime] || company.tax_regime}`, margin + 18, emY); emY += 3; }
  if (company.phone || company.email) {
    doc.text(`${company.phone || ''}${company.phone && company.email ? '  •  ' : ''}${company.email || ''}`, margin + 18, emY);
  }

  // Bloc titre + numéro (droite)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(headerRgb[0], headerRgb[1], headerRgb[2]);
  const titleLabel = tplCfg.show_dgi_mention ? "FACTURE NORMALISÉE" : "FACTURE";
  doc.text(titleLabel, pageWidth - margin, cursorY + 5, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  if (tplCfg.show_dgi_mention) {
    doc.text("Direction Générale des Impôts (DGI) — RDC", pageWidth - margin, cursorY + 9, { align: 'right' });
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(33, 37, 41);
  doc.text(`N° ${invoice.invoice_number}`, pageWidth - margin, cursorY + 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Date facturation: ${new Date(invoice.search_date).toLocaleDateString('fr-FR')}`, pageWidth - margin, cursorY + 18, { align: 'right' });
  if (invoice.paid_at) {
    doc.text(`Date paiement: ${new Date(invoice.paid_at).toLocaleDateString('fr-FR')}`, pageWidth - margin, cursorY + 22, { align: 'right' });
  }

  cursorY = Math.max(emY, cursorY + 26) + 4;

  doc.setDrawColor(headerRgb[0], headerRgb[1], headerRgb[2]);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 5;

  // ===== BLOC CLIENT =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(headerRgb[0], headerRgb[1], headerRgb[2]);
  doc.text("FACTURÉ À", margin, cursorY);
  cursorY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(33, 37, 41);
  const clientName = invoice.client_name || invoice.client_organization || invoice.client_email || '—';
  doc.text(clientName, margin, cursorY); cursorY += 3.5;

  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  if (invoice.client_address) {
    const lines = doc.splitTextToSize(invoice.client_address, (pageWidth - 2 * margin) / 2);
    lines.forEach((line: string) => { doc.text(line, margin, cursorY); cursorY += 3; });
  }
  if (invoice.client_email) { doc.text(`Email: ${invoice.client_email}`, margin, cursorY); cursorY += 3; }
  if (invoice.client_type === 'company') {
    if (invoice.client_nif) { doc.text(`NIF: ${invoice.client_nif}`, margin, cursorY); cursorY += 3; }
    if (invoice.client_rccm) { doc.text(`RCCM: ${invoice.client_rccm}`, margin, cursorY); cursorY += 3; }
    if (invoice.client_tax_regime) { doc.text(`Régime: ${TAX_REGIME_LABELS[invoice.client_tax_regime] || invoice.client_tax_regime}`, margin, cursorY); cursorY += 3; }
  } else if (invoice.client_id_nat) {
    doc.text(`ID National: ${invoice.client_id_nat}`, margin, cursorY); cursorY += 3;
  }

  // Référence parcelle + statut (droite, à hauteur du bloc client)
  const statusKey = resolveInvoiceStatus(invoice.status);
  const statusText = INVOICE_STATUS_LABELS[statusKey];
  const statusRgb = INVOICE_STATUS_COLORS[statusKey].rgb;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(headerRgb[0], headerRgb[1], headerRgb[2]);
  doc.text("RÉFÉRENCE", pageWidth - margin, cursorY - 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(33, 37, 41);
  doc.text(`Parcelle: ${invoice.parcel_number}`, pageWidth - margin, cursorY - 10, { align: 'right' });
  if (invoice.geographical_zone) {
    doc.text(`Zone: ${invoice.geographical_zone}`, pageWidth - margin, cursorY - 7, { align: 'right' });
  }
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(statusRgb[0], statusRgb[1], statusRgb[2]);
  doc.text(`Statut: ${statusText}`, pageWidth - margin, cursorY - 3, { align: 'right' });

  cursorY += 6;
  doc.setTextColor(33, 37, 41);

  // ===== TABLEAU DES PRESTATIONS =====
  const selectedIds = getSelectedServiceIds(invoice);
  const selectedServices = servicesCatalog.filter(s => selectedIds.includes(s.id));

  if (selectedServices.length > 0) {
    const tableData = selectedServices.map(service => {
      const priceTTC = Number(service.price);
      const priceHT = priceTTC / (1 + tvaRate);
      const desc = (service as any).description as string | undefined;
      const designation = desc && desc.trim() ? `${service.name}\n${desc.trim()}` : service.name;
      return [
        designation,
        '1',
        formatMoney(priceHT, 'USD'),
        formatMoney(priceTTC, 'USD'),
      ];
    });

    autoTable(doc, {
      head: [["Désignation", "Qté", "Prix unitaire HT", "Total TTC"]],
      body: tableData,
      startY: cursorY,
      styles: { fontSize: 8.5, cellPadding: 2, lineColor: [220, 220, 220], lineWidth: 0.2, textColor: [33, 37, 41], valign: 'top' },
      headStyles: { fillColor: secondaryRgb, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      columnStyles: {
        0: { cellWidth: (pageWidth - 2 * margin) * 0.55 },
        1: { cellWidth: (pageWidth - 2 * margin) * 0.10, halign: 'center' },
        2: { cellWidth: (pageWidth - 2 * margin) * 0.175, halign: 'right' },
        3: { cellWidth: (pageWidth - 2 * margin) * 0.175, halign: 'right' },
      },
      theme: 'grid',
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          const raw = String(data.cell.raw ?? '');
          const nlIdx = raw.indexOf('\n');
          if (nlIdx >= 0) {
            // On garde le texte combiné, le styling différencié est appliqué dans didDrawCell
            data.cell.styles.fontSize = 8.5;
          }
        }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          const raw = String(data.cell.raw ?? '');
          const nlIdx = raw.indexOf('\n');
          if (nlIdx < 0) return;
          const name = raw.substring(0, nlIdx);
          const desc = raw.substring(nlIdx + 1);
          // Repeindre la cellule par-dessus pour styliser nom (gras) + description (gris italique)
          const padX = 2;
          const padY = 2;
          const cellX = data.cell.x + padX;
          const cellY = data.cell.y + padY;
          const cellW = data.cell.width - padX * 2;
          // Effacer le texte original
          doc.setFillColor(255, 255, 255);
          doc.rect(data.cell.x + 0.3, data.cell.y + 0.3, data.cell.width - 0.6, data.cell.height - 0.6, 'F');
          // Nom en gras
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(33, 37, 41);
          const nameLines = doc.splitTextToSize(name, cellW);
          doc.text(nameLines, cellX, cellY + 3);
          const nameH = nameLines.length * 3.2;
          // Description en gris italique
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7);
          doc.setTextColor(107, 114, 128);
          const descLines = doc.splitTextToSize(desc, cellW);
          doc.text(descLines, cellX, cellY + 3 + nameH);
          // Reset
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(33, 37, 41);
        }
      },
    });

    cursorY = (doc as any).lastAutoTable?.finalY + 6;
  }

  // ===== DÉCOMPOSITION FISCALE OBLIGATOIRE DGI =====
  const subtotalTTC = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);
  const discountTTC = Number(invoice.discount_amount_usd || 0);
  const totalTTC = subtotalTTC - discountTTC;
  const totalHT = totalTTC / (1 + tvaRate);
  const tvaAmount = totalTTC - totalHT;

  const totalsX = pageWidth - margin - 80;
  const valueX = pageWidth - margin;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(33, 37, 41);

  const writeRow = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(label, totalsX, cursorY);
    doc.text(value, valueX, cursorY, { align: 'right' });
    cursorY += 5;
  };

  if (discountTTC > 0) {
    writeRow('Sous-total (TTC)', formatBilingual(subtotalTTC, exchangeRate));
    writeRow('Remise commerciale', `-${formatBilingual(discountTTC, exchangeRate)}`);
  }
  writeRow('Base HT', formatBilingual(totalHT, exchangeRate));
  writeRow(tplCfg.tva_label, formatBilingual(tvaAmount, exchangeRate));

  doc.setFillColor(headerRgb[0], headerRgb[1], headerRgb[2]);
  doc.rect(totalsX - 3, cursorY - 4, valueX - totalsX + 6, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL TTC', totalsX, cursorY + 1);
  doc.text(formatBilingual(totalTTC, exchangeRate), valueX, cursorY + 1, { align: 'right' });
  cursorY += 12;

  doc.setTextColor(33, 37, 41);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  if (exchangeRate > 1) {
    doc.text(`Taux de change appliqué : 1 USD = ${exchangeRate} CDF (figé à l'émission)`, margin, cursorY);
    cursorY += 4;
  }

  // ===== CONDITIONS DE PAIEMENT + COORDONNÉES BANCAIRES =====
  const hasBank = !!(company.bank_name || company.bank_account || company.bank_swift);
  if (tplCfg.payment_terms || hasBank) {
    cursorY += 2;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 4;

    if (tplCfg.payment_terms) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(headerRgb[0], headerRgb[1], headerRgb[2]);
      doc.text('CONDITIONS DE PAIEMENT', margin, cursorY);
      cursorY += 3.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(80, 80, 80);
      const ptLines = doc.splitTextToSize(tplCfg.payment_terms, (pageWidth - 2 * margin) / 2 - 4);
      ptLines.forEach((line: string) => { doc.text(line, margin, cursorY); cursorY += 3; });
    }

    if (hasBank) {
      const bankX = pageWidth / 2 + 2;
      let bankY = cursorY - (tplCfg.payment_terms ? (doc.splitTextToSize(tplCfg.payment_terms, (pageWidth - 2 * margin) / 2 - 4).length * 3) : 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(headerRgb[0], headerRgb[1], headerRgb[2]);
      doc.text('COORDONNÉES BANCAIRES', bankX, bankY);
      bankY += 3.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(80, 80, 80);
      if (company.bank_name) { doc.text(`Banque : ${company.bank_name}`, bankX, bankY); bankY += 3; }
      if (company.bank_account) { doc.text(`IBAN : ${company.bank_account}`, bankX, bankY); bankY += 3; }
      if (company.bank_swift) { doc.text(`SWIFT : ${company.bank_swift}`, bankX, bankY); bankY += 3; }
      cursorY = Math.max(cursorY, bankY);
    }
    cursorY += 2;
  }

  // ===== MENTIONS LÉGALES & VÉRIFICATION =====
  cursorY = Math.max(cursorY, pageHeight - 50);

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(headerRgb[0], headerRgb[1], headerRgb[2]);
  doc.text("MENTIONS LÉGALES (DGI)", margin, cursorY);
  cursorY += 3.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(80, 80, 80);
  const tvaPctLabel = `${(tvaRate * 100).toFixed(tvaRate * 100 % 1 === 0 ? 0 : 2)}%`;
  const introText = tplCfg.show_dgi_mention
    ? (tplCfg.footer_intro_text || `Facture normalisée émise conformément à la réglementation fiscale en vigueur en République Démocratique du Congo.`)
    : `Facture émise par ${company.legal_name}.`;
  const tvaMentionTpl = tplCfg.footer_tva_mention || 'TVA appliquée au taux de {tva_rate}.';
  const tvaMention = `${tvaMentionTpl.replace(/\{tva_rate\}/g, tvaPctLabel)} ${tplCfg.payment_terms || 'Tout règlement effectué vaut acceptation des conditions générales de vente.'}`.trim();
  const emitterLine = tplCfg.footer_show_emitter_line
    ? `Émetteur : ${company.legal_name} — NIF ${company.nif} — RCCM ${company.rccm} — ID-NAT ${company.id_nat} — ${TAX_REGIME_LABELS[company.tax_regime] || company.tax_regime}.`
    : null;
  const dgiCodeLine = tplCfg.footer_show_dgi_code
    ? (invoice.dgi_validation_code ? `Code de validation DGI : ${invoice.dgi_validation_code}` : `Code de vérification : ${verificationCode || invoice.invoice_number}`)
    : null;
  const mentions = [
    introText,
    emitterLine,
    tvaMention,
    dgiCodeLine,
    tplCfg.footer_text,
  ].filter(Boolean) as string[];
  mentions.forEach(m => {
    const lines = doc.splitTextToSize(m, pageWidth - 2 * margin - 22);
    lines.forEach((line: string) => { doc.text(line, margin, cursorY); cursorY += 2.8; });
  });

  if (verifyUrl && tplCfg.show_verification_qr) {
    try {
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 0, width: 80 });
      doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 18, pageHeight - 32, 16, 16);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6);
      doc.setTextColor(80, 80, 80);
      doc.text("Vérifier l'authenticité", pageWidth - margin - 10, pageHeight - 13, { align: 'center' });
    } catch (e) {
      console.error('QR code generation failed:', e);
    }
  }

  saveDocument(doc, filename || `facture_normalisee_${formatDateForFilename()}_${invoice.invoice_number.replace(/[^0-9A-Za-z]/g, '_')}.pdf`, options);
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

function saveDocument(doc: jsPDF, filename: string, options?: InvoicePdfOptions) {
  if (options?.openInNewTab) {
    try {
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      return;
    } catch (e) {
      console.error('Open PDF in new tab failed, falling back to download:', e);
    }
  }
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