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
