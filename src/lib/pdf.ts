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
 * Génère un PDF de facture avec format sélectionnable
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
 * Génère une mini-facture compacte
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
  doc.text("FACTURE", pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 8;

  // Informations facture
  doc.setFontSize(7);
  doc.text(`N°: ${invoice.invoice_number}`, margin, cursorY);
  cursorY += 4;
  doc.text(`Date: ${new Date(invoice.search_date).toLocaleDateString('fr-FR')}`, margin, cursorY);
  cursorY += 4;
  doc.text(`Parcelle: ${invoice.parcel_number}`, margin, cursorY);
  cursorY += 6;

  // Services
  const selectedIds = getSelectedServiceIds(invoice);
  const selectedServices = servicesCatalog.filter(s => selectedIds.includes(s.id));
  
  doc.setFont('helvetica', 'bold');
  doc.text("Services:", margin, cursorY);
  cursorY += 4;
  
  doc.setFont('helvetica', 'normal');
  let subtotal = 0;
  selectedServices.forEach(service => {
    const price = Number(service.price);
    subtotal += price;
    doc.text(`${service.name}: $${price.toFixed(2)}`, margin, cursorY);
    cursorY += 3;
  });

  // Total
  cursorY += 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`TOTAL: $${subtotal.toFixed(2)} USD`, pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 8;

  // Contact
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text(BIC_COMPANY_INFO.phone, pageWidth / 2, cursorY, { align: 'center' });

  saveDocument(doc, filename || `mini_facture_BIC_${formatDateForFilename()}_${invoice.invoice_number}.pdf`);
}

/**
 * Génère une facture A4 complète
 */
function generateA4InvoicePDF(
  invoice: CadastralInvoice,
  servicesCatalog: CadastralService[],
  filename?: string
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let cursorY = margin;

  // En-tête professionnel
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(BIC_COMPANY_INFO.name, margin, cursorY);
  cursorY += 7;

  doc.setFontSize(12);
  doc.text("FACTURE DE SERVICES CADASTRAUX", margin, cursorY);
  cursorY += 15;

  // Informations de l'entreprise
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const companyInfoY = margin + 5;
  doc.text(BIC_COMPANY_INFO.address, pageWidth - margin, companyInfoY, { align: 'right' });
  doc.text(`RCCM: ${BIC_COMPANY_INFO.rccm}`, pageWidth - margin, companyInfoY + 4, { align: 'right' });
  doc.text(`ID NAT: ${BIC_COMPANY_INFO.idNat}`, pageWidth - margin, companyInfoY + 8, { align: 'right' });
  doc.text(`N° IMPÔT: ${BIC_COMPANY_INFO.numImpot}`, pageWidth - margin, companyInfoY + 12, { align: 'right' });
  doc.text(`Email: ${BIC_COMPANY_INFO.email}`, pageWidth - margin, companyInfoY + 16, { align: 'right' });
  doc.text(`Tél: ${BIC_COMPANY_INFO.phone}`, pageWidth - margin, companyInfoY + 20, { align: 'right' });

  // Informations facture et client
  cursorY += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  
  const leftCol = margin;
  const rightCol = pageWidth / 2 + 10;
  
  // Colonne gauche - Info facture
  doc.text("FACTURE", leftCol, cursorY);
  cursorY += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Numéro: ${invoice.invoice_number}`, leftCol, cursorY);
  cursorY += 5;
  doc.text(`Date: ${new Date(invoice.search_date).toLocaleDateString('fr-FR')}`, leftCol, cursorY);
  cursorY += 5;
  doc.text(`Parcelle: ${invoice.parcel_number}`, leftCol, cursorY);

  // Colonne droite - Info client
  const clientY = cursorY - 16;
  doc.setFont('helvetica', 'bold');
  doc.text("FACTURER À", rightCol, clientY);
  doc.setFont('helvetica', 'normal');
  if (invoice.client_name) {
    doc.text(invoice.client_name, rightCol, clientY + 6);
  }
  if (invoice.client_email) {
    doc.text(invoice.client_email, rightCol, clientY + 11);
  }
  if (invoice.client_organization) {
    doc.text(invoice.client_organization, rightCol, clientY + 16);
  }

  cursorY += 15;

  // Services sélectionnés - Tableau professionnel
  const selectedIds = getSelectedServiceIds(invoice);
  const selectedServices = servicesCatalog.filter(s => selectedIds.includes(s.id));

  const tableData = selectedServices.map(service => [
    service.name,
    service.description || 'Service cadastral professionnel',
    '1',
    `$${Number(service.price).toFixed(2)}`,
    `$${Number(service.price).toFixed(2)}`
  ]);

  autoTable(doc, {
    head: [["Service", "Description", "Qté", "Prix unitaire", "Total"]],
    body: tableData.length ? tableData : [["-", "-", "-", "-", "-"]],
    startY: cursorY,
    styles: { 
      fontSize: 10, 
      cellPadding: 4,
      lineColor: [200, 200, 200],
      lineWidth: 0.1
    },
    headStyles: { 
      fillColor: [41, 128, 185], 
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 80 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' }
    },
    theme: 'striped',
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: margin, right: margin }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || cursorY + 20;

  // Section totaux
  const totalsY = finalY + 10;
  const totalsX = pageWidth - margin - 60;
  
  const subtotal = selectedServices.reduce((sum, service) => sum + Number(service.price), 0);
  const discountAmount = Number(invoice.discount_amount_usd || 0);
  const total = subtotal - discountAmount;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text("Sous-total:", totalsX, totalsY);
  doc.text(`$${subtotal.toFixed(2)} USD`, pageWidth - margin, totalsY, { align: 'right' });

  if (discountAmount > 0) {
    doc.text("Remise:", totalsX, totalsY + 5);
    doc.text(`-$${discountAmount.toFixed(2)} USD`, pageWidth - margin, totalsY + 5, { align: 'right' });
  }

  // Ligne de séparation
  doc.line(totalsX, totalsY + (discountAmount > 0 ? 8 : 3), pageWidth - margin, totalsY + (discountAmount > 0 ? 8 : 3));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text("TOTAL:", totalsX, totalsY + (discountAmount > 0 ? 13 : 8));
  doc.text(`$${total.toFixed(2)} USD`, pageWidth - margin, totalsY + (discountAmount > 0 ? 13 : 8), { align: 'right' });

  // Mentions légales
  const footerY = 270;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    "Ce document constitue une facture officielle. Toutes les informations proviennent des sources officielles du Ministère des Affaires Foncières.",
    margin,
    footerY
  );
  doc.text(
    `Document généré automatiquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
    margin,
    footerY + 4
  );

  saveDocument(doc, filename || `facture_BIC_${formatDateForFilename()}_${invoice.invoice_number}.pdf`);
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
 * Génère un PDF A4 d'un rapport cadastral complet
 */
export function generateCadastralReport(
  parcelData: any,
  paidServices: string[],
  servicesCatalog: CadastralService[],
  filename?: string
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let cursorY = margin;

  // En-tête du rapport
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text("RAPPORT CADASTRAL", pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 8;
  
  doc.setFontSize(12);
  doc.text("Bureau de l'Immobilier du Congo (BIC)", pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 15;

  // Informations de la parcelle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("INFORMATIONS DE LA PARCELLE", margin, cursorY);
  cursorY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  
  const parcelInfo = [
    [`Numéro de parcelle:`, parcelData.parcel_number || 'N/A'],
    [`Commune:`, parcelData.commune || 'N/A'],
    [`Quartier:`, parcelData.quartier || 'N/A'],
    [`Avenue:`, parcelData.avenue || 'N/A'],
    [`Superficie:`, parcelData.superficie ? `${parcelData.superficie} m²` : 'N/A'],
    [`Statut:`, parcelData.statut || 'N/A'],
    [`Date de génération:`, new Date().toLocaleDateString('fr-FR')]
  ];

  parcelInfo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, cursorY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 50, cursorY);
    cursorY += 6;
  });

  cursorY += 10;

  // Services inclus
  const selectedServices = servicesCatalog.filter(s => paidServices.includes(s.id));
  
  if (selectedServices.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("SERVICES INCLUS", margin, cursorY);
    cursorY += 8;

    const servicesTableData = selectedServices.map(service => [
      service.name,
      service.description || 'Service cadastral professionnel'
    ]);

    autoTable(doc, {
      head: [["Service", "Description"]],
      body: servicesTableData,
      startY: cursorY,
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [25, 113, 194], halign: 'left' },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 115 }
      },
      theme: 'grid',
      margin: { left: margin, right: margin }
    });

    cursorY = (doc as any).lastAutoTable?.finalY + 15 || cursorY + 20;
  }

  // Notes importantes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text("NOTES IMPORTANTES", margin, cursorY);
  cursorY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const notes = [
    "• Ce rapport est basé sur les données officielles du Ministère des Affaires Foncières.",
    "• Les informations sont valides à la date de génération du rapport.",
    "• Pour toute question, veuillez contacter le Bureau de l'Immobilier du Congo.",
    "• Ce document est généré automatiquement et certifié par BIC."
  ];

  notes.forEach(note => {
    doc.text(note, margin, cursorY);
    cursorY += 5;
  });

  // Pied de page
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  const footerY = 297 - 10; // A4 height ~297mm
  doc.text(
    "Document généré automatiquement par BIC - Sources officielles du Ministère des Affaires Foncières",
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  // Sauvegarde
  const fn = filename || `rapport_cadastral_${parcelData.parcel_number}_${Date.now()}.pdf`;
  try {
    doc.save(fn);
  } catch (e) {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fn;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }
}
