import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type { CertificateTemplate, CertificateGenerationData } from '@/types/certificate';

interface GenerateOptions {
  template: CertificateTemplate;
  data: CertificateGenerationData;
  extraSections?: { label: string; value: string }[];
}

// Helper to parse hex/hsl color to RGB
function parseColor(color: string): [number, number, number] {
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    return [
      parseInt(hex.substring(0, 2), 16),
      parseInt(hex.substring(2, 4), 16),
      parseInt(hex.substring(4, 6), 16),
    ];
  }
  // Default green
  return [0, 100, 50];
}

export async function generateCertificatePDF(options: GenerateOptions): Promise<Blob> {
  const { template, data, extraSections } = options;
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const [pr, pg, pb] = parseColor(template.primary_color || '#006432');
  const [sr, ssg, sb] = parseColor(template.secondary_color || '#004020');

  // Border
  if (template.show_border) {
    doc.setLineWidth(2);
    doc.setDrawColor(pr, pg, pb);
    doc.rect(8, 8, pw - 16, ph - 16);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, pw - 20, ph - 20);
  }

  let y = 20;

  // Logo
  if (template.logo_url) {
    try {
      doc.addImage(template.logo_url, 'PNG', pw / 2 - 12, y, 24, 24);
      y += 28;
    } catch {
      // Skip logo if loading fails
    }
  }

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(pr, pg, pb);
  doc.text(template.header_title || 'RÉPUBLIQUE DÉMOCRATIQUE DU CONGO', pw / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(11);
  doc.text(template.header_organization || 'BUREAU D\'INFORMATION CADASTRALE (BIC)', pw / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(template.header_subtitle || 'Service Agréé', pw / 2, y, { align: 'center' });
  y += 6;

  // Separator
  doc.setDrawColor(pr, pg, pb);
  doc.setLineWidth(1);
  doc.line(20, y, pw - 20, y);
  y += 10;

  // Certificate title from body_text first line or type
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(sr, ssg, sb);
  const title = template.body_text?.split('\n')[0] || 'CERTIFICAT';
  doc.text(title.toUpperCase(), pw / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`N° ${data.referenceNumber}`, pw / 2, y, { align: 'center' });
  y += 12;

  // Info rows
  const addRow = (label: string, value: string) => {
    if (y > ph - 80) {
      doc.addPage();
      y = 25;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(label, 22, y);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(value, pw - 90);
    doc.text(lines, 72, y);
    y += lines.length * 5 + 3;
  };

  // Section header
  const addSection = (title: string) => {
    if (y > ph - 80) {
      doc.addPage();
      y = 25;
    }
    y += 3;
    doc.setFillColor(230, 245, 235);
    doc.rect(18, y - 5, pw - 36, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(pr, pg, pb);
    doc.text(title, 22, y);
    doc.setTextColor(0, 0, 0);
    y += 8;
  };

  // Standard info
  addSection('IDENTIFICATION');
  addRow('Bénéficiaire:', data.recipientName);
  addRow('N° Parcelle:', data.parcelNumber);
  if (data.recipientEmail) addRow('Email:', data.recipientEmail);
  addRow('Date émission:', new Date(data.issueDate).toLocaleDateString('fr-FR'));
  if (data.expiryDate) {
    addRow('Date expiration:', new Date(data.expiryDate).toLocaleDateString('fr-FR'));
  }

  // Extra sections from service-specific data
  if (extraSections && extraSections.length > 0) {
    addSection('DÉTAILS');
    extraSections.forEach(s => addRow(s.label, s.value));
  }

  // Body text (remaining lines after title)
  const bodyLines = (template.body_text || '').split('\n').slice(1).filter(l => l.trim());
  if (bodyLines.length > 0) {
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    bodyLines.forEach(line => {
      const replaced = line
        .replace('{reference}', data.referenceNumber)
        .replace('{beneficiaire}', data.recipientName)
        .replace('{parcelle}', data.parcelNumber)
        .replace('{date_emission}', new Date(data.issueDate).toLocaleDateString('fr-FR'))
        .replace('{approuve_par}', data.approvedBy);
      const wrapped = doc.splitTextToSize(replaced, pw - 50);
      if (y + wrapped.length * 5 > ph - 80) {
        doc.addPage();
        y = 25;
      }
      doc.text(wrapped, 25, y);
      y += wrapped.length * 5 + 2;
    });
  }

  // Legal text
  if (template.legal_text) {
    y += 5;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    const legalLines = doc.splitTextToSize(template.legal_text, pw - 50);
    if (y + legalLines.length * 4 > ph - 60) {
      doc.addPage();
      y = 25;
    }
    doc.text(legalLines, 25, y);
    y += legalLines.length * 4 + 8;
  }

  // QR Code
  if (template.show_qr_code) {
    const qrUrl = `https://bic-rdc.com/verify/${data.referenceNumber}`;
    try {
      const qrImg = await QRCode.toDataURL(qrUrl, { width: 200 });
      doc.addImage(qrImg, 'PNG', pw - 52, ph - 65, 32, 32);
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      doc.text('Scannez pour vérifier', pw - 52, ph - 30);
    } catch { /* skip */ }
  }

  // Signature
  const sigY = ph - 65;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`Fait à Goma, le ${new Date(data.issueDate).toLocaleDateString('fr-FR')}`, 22, sigY);

  if (template.signature_image_url) {
    try {
      doc.addImage(template.signature_image_url, 'PNG', 22, sigY + 3, 40, 15);
    } catch { /* skip */ }
  }

  doc.setFont('helvetica', 'bold');
  doc.text(template.signature_title || 'Le Responsable', 22, sigY + 20);
  doc.setFont('helvetica', 'italic');
  doc.text(template.signature_name || data.approvedBy, 22, sigY + 26);

  // Stamp
  if (template.show_stamp) {
    doc.setDrawColor(pr, pg, pb);
    doc.setLineWidth(1.5);
    doc.circle(80, sigY + 15, 12);
    doc.setFontSize(6);
    doc.setTextColor(pr, pg, pb);
    doc.setFont('helvetica', 'bold');
    const stampLines = (template.stamp_text || 'CERTIFIÉ\nCONFORME').split('\n');
    stampLines.forEach((line, i) => {
      doc.text(line, 80, sigY + 13 + i * 4, { align: 'center' });
    });
  }

  // Footer
  if (template.footer_text) {
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'italic');
    doc.text(template.footer_text, pw / 2, ph - 14, { align: 'center' });
  }

  return doc.output('blob');
}
