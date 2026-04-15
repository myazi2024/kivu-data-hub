import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { fetchAppLogo } from '@/utils/pdfLogoHelper';

interface PermitData {
  permitNumber: string;
  permitType: 'construction' | 'regularization';
  parcelNumber: string;
  applicantName: string;
  location: string;
  issueDate: string;
  validityMonths: number;
  approvedBy: string;
  conditions?: string[];
}

export async function generatePermitPDF(permitData: PermitData): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Bordure du document
  doc.setLineWidth(2);
  doc.setDrawColor(0, 100, 200);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Logo dynamique en haut à gauche
  const permitLogo = await fetchAppLogo();
  if (permitLogo) {
    try {
      doc.addImage(permitLogo, 'PNG', 15, 14, 12, 12);
    } catch { /* ignore */ }
  }

  // En-tête officiel
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 50, 100);
  doc.text('RÉPUBLIQUE DÉMOCRATIQUE DU CONGO', pageWidth / 2, 25, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text('MINISTÈRE DE L\'URBANISME ET HABITAT', pageWidth / 2, 32, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Service de l\'Urbanisme et de l\'Aménagement du Territoire', pageWidth / 2, 38, { align: 'center' });

  // Ligne de séparation
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 100, 200);
  doc.line(20, 45, pageWidth - 20, 45);

  // Titre du document
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(200, 0, 0);
  const title = permitData.permitType === 'construction' 
    ? 'AUTORISATION DE BÂTIR' 
    : 'AUTORISATION DE RÉGULARISATION';
  doc.text(title, pageWidth / 2, 55, { align: 'center' });

  // Numéro de permis
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(`N° ${permitData.permitNumber}`, pageWidth / 2, 65, { align: 'center' });

  // Contenu principal
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  let yPos = 80;

  // Informations du demandeur
  doc.setFont('helvetica', 'bold');
  doc.text('DEMANDEUR:', 25, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(permitData.applicantName, 70, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('PARCELLE:', 25, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(permitData.parcelNumber, 70, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('LOCALISATION:', 25, yPos);
  doc.setFont('helvetica', 'normal');
  const location = doc.splitTextToSize(permitData.location, pageWidth - 90);
  doc.text(location, 70, yPos);
  yPos += location.length * 7 + 5;

  doc.setFont('helvetica', 'bold');
  doc.text('DATE DE DÉLIVRANCE:', 25, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(permitData.issueDate).toLocaleDateString('fr-FR'), 80, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('VALIDITÉ:', 25, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`${permitData.validityMonths} mois`, 70, yPos);
  yPos += 15;

  // Corps du document
  doc.setFontSize(10);
  const bodyText = permitData.permitType === 'construction'
    ? `Le présent permis autorise ${permitData.applicantName} à construire sur la parcelle ${permitData.parcelNumber} conformément aux plans et documents approuvés. Tous travaux doivent être conformes aux règlements d'urbanisme en vigueur.`
    : `Le présent permis régularise la construction existante sur la parcelle ${permitData.parcelNumber}. Le bénéficiaire doit se conformer à toutes les prescriptions techniques et administratives.`;
  
  const splitBody = doc.splitTextToSize(bodyText, pageWidth - 50);
  doc.text(splitBody, 25, yPos);
  yPos += splitBody.length * 5 + 10;

  // Conditions
  if (permitData.conditions && permitData.conditions.length > 0) {
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('CONDITIONS:', 25, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    permitData.conditions.forEach((condition, index) => {
      const splitCondition = doc.splitTextToSize(`${index + 1}. ${condition}`, pageWidth - 55);
      doc.text(splitCondition, 30, yPos);
      yPos += splitCondition.length * 5 + 3;
    });
  }

  // QR Code de vérification
  const qrCodeData = `https://bic.cd/verify-permit/${permitData.permitNumber}`;
  const qrCodeImage = await QRCode.toDataURL(qrCodeData, { width: 200 });
  doc.addImage(qrCodeImage, 'PNG', pageWidth - 50, pageHeight - 70, 35, 35);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Scannez pour vérifier', pageWidth - 50, pageHeight - 32, { align: 'left' });

  // Signature
  yPos = pageHeight - 70;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Fait à Goma, le ' + new Date(permitData.issueDate).toLocaleDateString('fr-FR'), 25, yPos);
  yPos += 15;
  
  doc.setFont('helvetica', 'bold');
  doc.text('L\'Administrateur Délégué', 25, yPos);
  yPos += 10;
  
  doc.setFont('helvetica', 'italic');
  doc.text(permitData.approvedBy, 25, yPos);

  // Cachet officiel (simulé)
  doc.setDrawColor(200, 0, 0);
  doc.setLineWidth(2);
  doc.circle(60, yPos - 15, 15);
  doc.setFontSize(7);
  doc.setTextColor(200, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('CACHET', 60, yPos - 17, { align: 'center' });
  doc.text('OFFICIEL', 60, yPos - 12, { align: 'center' });

  // Pied de page
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Ce document est un permis officiel. Toute falsification est passible de poursuites judiciaires.',
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  );

  return doc.output('blob');
}