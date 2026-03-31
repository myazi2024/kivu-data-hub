import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { formatCurrency } from '@/utils/formatters';

interface MortgageReceiptData {
  type: 'registration' | 'cancellation';
  requestReference: string;
  mortgageReference?: string;
  parcelNumber: string;
  requesterName: string;
  reason?: string;
  totalAmountPaid: number;
  fees: { name: string; amount: number }[];
  date: string;
  parcelData?: {
    ownerName: string;
    location: string;
  };
  mortgageData?: {
    creditorName: string;
    amount: number;
    contractDate: string;
  };
}

export async function generateMortgageReceiptPDF(data: MortgageReceiptData): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Border
  doc.setLineWidth(1.5);
  doc.setDrawColor(0, 100, 200);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 50, 100);
  doc.text('RÉPUBLIQUE DÉMOCRATIQUE DU CONGO', pageWidth / 2, 25, { align: 'center' });

  doc.setFontSize(12);
  doc.text('BUREAU D\'INFORMATION CADASTRALE', pageWidth / 2, 32, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Service de Gestion des Hypothèques', pageWidth / 2, 38, { align: 'center' });

  // Line separator
  doc.setLineWidth(0.5);
  doc.line(20, 43, pageWidth - 20, 43);

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 120, 60);
  const title = data.type === 'cancellation'
    ? 'REÇU DE DEMANDE DE RADIATION D\'HYPOTHÈQUE'
    : 'REÇU D\'ENREGISTREMENT D\'HYPOTHÈQUE';
  doc.text(title, pageWidth / 2, 53, { align: 'center' });

  // Reference
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`N° ${data.requestReference}`, pageWidth / 2, 62, { align: 'center' });

  let yPos = 75;

  // Section: Request details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 50, 100);
  doc.text('DÉTAILS DE LA DEMANDE', 25, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  const addRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 25, yPos);
    doc.setFont('helvetica', 'normal');
    const textLines = doc.splitTextToSize(value, pageWidth - 90);
    doc.text(textLines, 80, yPos);
    yPos += textLines.length * 5 + 3;
  };

  addRow('Date', new Date(data.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }));
  addRow('Demandeur', data.requesterName);
  addRow('Parcelle', data.parcelNumber);

  if (data.mortgageReference) {
    addRow('Réf. hypothèque', data.mortgageReference);
  }

  if (data.parcelData) {
    addRow('Propriétaire', data.parcelData.ownerName);
    addRow('Localisation', data.parcelData.location);
  }

  if (data.mortgageData) {
    addRow('Créancier', data.mortgageData.creditorName);
    addRow('Montant hypothèque', formatCurrency(data.mortgageData.amount));
    addRow('Date contrat', new Date(data.mortgageData.contractDate).toLocaleDateString('fr-FR'));
  }

  if (data.reason) {
    addRow('Motif', data.reason);
  }

  // Fix #16: Section Fees — show "Gratuit" if no fees
  if (data.fees.length > 0) {
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 50, 100);
    doc.text('FRAIS ACQUITTÉS', 25, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Table header
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(25, yPos - 4, pageWidth - 50, 7, 'F');
    doc.text('Désignation', 27, yPos);
    doc.text('Montant', pageWidth - 27, yPos, { align: 'right' });
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    for (const fee of data.fees) {
      doc.text(fee.name, 27, yPos);
      doc.text(formatCurrency(fee.amount), pageWidth - 27, yPos, { align: 'right' });
      yPos += 6;
    }

    // Total
    doc.setLineWidth(0.3);
    doc.line(25, yPos, pageWidth - 25, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL PAYÉ:', 27, yPos);
    doc.setTextColor(0, 120, 60);
    doc.text(formatCurrency(data.totalAmountPaid), pageWidth - 27, yPos, { align: 'right' });
  } else {
    // Fix #16: Explicitly indicate free service for registration receipts
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 50, 100);
    doc.text('FRAIS', 25, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(0, 120, 60);
    doc.setFont('helvetica', 'bold');
    doc.text('Service gratuit — Aucun frais facturé', 27, yPos);
    doc.setTextColor(0, 0, 0);
  }

  // QR Code
  const qrData = `${typeof window !== 'undefined' ? window.location.origin : 'https://bic.cd'}/verify-mortgage/${data.requestReference}`;
  const qrImage = await QRCode.toDataURL(qrData, { width: 200 });
  doc.addImage(qrImage, 'PNG', pageWidth - 50, pageHeight - 70, 30, 30);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Scannez pour vérifier', pageWidth - 50, pageHeight - 37);

  // Stamp
  yPos = pageHeight - 65;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fait à Goma, le ${new Date().toLocaleDateString('fr-FR')}`, 25, yPos);
  yPos += 12;
  doc.setFont('helvetica', 'bold');
  doc.text("Le Service des Hypothèques", 25, yPos);

  // Official stamp (simulated)
  doc.setDrawColor(200, 0, 0);
  doc.setLineWidth(1.5);
  doc.circle(55, yPos + 10, 12);
  doc.setFontSize(6);
  doc.setTextColor(200, 0, 0);
  doc.text('CACHET', 55, yPos + 8, { align: 'center' });
  doc.text('OFFICIEL', 55, yPos + 12, { align: 'center' });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Ce reçu atteste du dépôt de la demande. Il ne constitue pas une approbation. Document généré électroniquement.',
    pageWidth / 2, pageHeight - 15, { align: 'center' }
  );

  return doc.output('blob');
}
