import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CadastralInvoice, CadastralService } from '@/hooks/useCadastralBilling';

/**
 * Génère un PDF A4 d'une facture de services cadastraux
 * - Format: A4 portrait
 * - Contenu: en-tête, méta facture, tableau des services, total, pied de page
 */
export function generateInvoicePDF(
  invoice: CadastralInvoice,
  servicesCatalog: CadastralService[],
  filename?: string
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let cursorY = margin;

  // En-tête
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text("Facture de Services Cadastraux", margin, cursorY, { baseline: 'top' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  cursorY += 6;
  doc.text("Bureau de l'Immobilier du Congo (BIC)", margin, cursorY);
  cursorY += 10;

  // Métadonnées facture
  doc.setFontSize(11);
  const rightX = pageWidth - margin;
  const dateStr = new Date(invoice.search_date).toLocaleDateString('fr-FR');
  doc.text(`Facture: ${invoice.invoice_number}`, margin, cursorY, { baseline: 'top' });
  doc.text(`Date: ${dateStr}`, rightX, cursorY, { align: 'right', baseline: 'top' });
  cursorY += 6;
  doc.text(`Parcelle: ${invoice.parcel_number}`, margin, cursorY);
  if (invoice.client_email) {
    doc.text(`Email: ${invoice.client_email}`, rightX, cursorY, { align: 'right' });
  }
  cursorY += 10;

  // Services sélectionnés
  const selectedIds: string[] = Array.isArray(invoice.selected_services)
    ? invoice.selected_services as string[]
    : (typeof invoice.selected_services === 'string' ? JSON.parse(invoice.selected_services || '[]') : []);
  const selectedServices = servicesCatalog.filter(s => selectedIds.includes(s.id));

  const tableBody = selectedServices.map(s => [
    s.name,
    s.description || '',
    `$${Number(s.price).toFixed(2)} USD`
  ]);

  autoTable(doc, {
    head: [["Service", "Description", "Prix"]],
    body: tableBody.length ? tableBody : [["-", "-", "-"]],
    startY: cursorY,
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [25, 113, 194], halign: 'left' },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 100 },
      2: { cellWidth: 25, halign: 'right' }
    },
    theme: 'grid',
    margin: { left: margin, right: margin }
  });

  const afterTableY = (doc as any).lastAutoTable?.finalY || cursorY + 10;

  // Total
  const total = Number(invoice.total_amount_usd || 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total', rightX - 40, afterTableY + 10);
  doc.text(`$${total.toFixed(2)} USD`, rightX, afterTableY + 10, { align: 'right' });

  // Pied de page
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const footerY = 297 - 10; // A4 height ~297mm
  doc.text(
    "Sources officielles du Ministère des Affaires Foncières. Document généré automatiquement.",
    margin,
    footerY
  );

  // Sauvegarde (fallback iOS / Safari)
  const fn = filename || `facture_${invoice.invoice_number || invoice.parcel_number}.pdf`;
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

/**
 * Génère un PDF A4 d'un rapport cadastral complet
 * - Format: A4 portrait
 * - Contenu: informations détaillées de la parcelle et services
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
