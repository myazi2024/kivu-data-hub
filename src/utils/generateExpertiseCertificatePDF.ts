import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export interface ExpertiseCertificateData {
  referenceNumber: string;
  parcelNumber: string;
  requesterName: string;
  requesterEmail?: string;
  propertyDescription?: string;
  constructionYear?: number;
  constructionQuality?: string;
  numberOfFloors?: number;
  totalBuiltAreaSqm?: number;
  propertyCondition?: string;
  hasWaterSupply: boolean;
  hasElectricity: boolean;
  hasSewageSystem: boolean;
  hasInternet: boolean;
  hasSecuritySystem: boolean;
  hasParking: boolean;
  parkingSpaces?: number;
  hasGarden: boolean;
  gardenAreaSqm?: number;
  roadAccessType?: string;
  distanceToMainRoadM?: number;
  distanceToHospitalKm?: number;
  distanceToSchoolKm?: number;
  distanceToMarketKm?: number;
  floodRiskZone: boolean;
  erosionRiskZone: boolean;
  marketValueUsd: number;
  expertiseDateStr: string;
  issueDate: string;
  expiryDate: string;
  approvedBy: string;
  expertName?: string;
  expertTitle?: string;
  stampImageUrl?: string;
}

import { QUALITY_LABELS, CONDITION_LABELS, ROAD_LABELS } from '@/constants/expertiseLabels';

function drawTextStamp(doc: jsPDF, sigY: number) {
  doc.setDrawColor(0, 120, 60);
  doc.setLineWidth(1.5);
  doc.circle(55, sigY + 10, 12);
  doc.setFontSize(6);
  doc.setTextColor(0, 120, 60);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFIÉ', 55, sigY + 8, { align: 'center' });
  doc.text('CONFORME', 55, sigY + 12, { align: 'center' });
}

export async function generateExpertiseCertificatePDF(data: ExpertiseCertificateData): Promise<Blob> {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // Border
  doc.setLineWidth(2);
  doc.setDrawColor(0, 100, 50);
  doc.rect(8, 8, pw - 16, ph - 16);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, pw - 20, ph - 20);

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 60, 30);
  doc.text('RÉPUBLIQUE DÉMOCRATIQUE DU CONGO', pw / 2, 24, { align: 'center' });

  doc.setFontSize(12);
  doc.text('BUREAU D\'INFORMATION CADASTRALE (BIC)', pw / 2, 31, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Service d\'Expertise Immobilière Agréé', pw / 2, 37, { align: 'center' });

  // Separator
  doc.setDrawColor(0, 100, 50);
  doc.setLineWidth(1);
  doc.line(20, 42, pw - 20, 42);

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 80, 40);
  doc.text('CERTIFICAT D\'EXPERTISE IMMOBILIÈRE', pw / 2, 52, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`N° ${data.referenceNumber}`, pw / 2, 60, { align: 'center' });

  // Info rows helper
  let y = 72;
  const addRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(label, 22, y);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(value, pw - 90);
    doc.text(lines, 72, y);
    y += lines.length * 5 + 3;
  };

  // Section: Identification
  doc.setFillColor(230, 245, 235);
  doc.rect(18, y - 5, pw - 36, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 80, 40);
  doc.text('I. IDENTIFICATION', 22, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  addRow('Demandeur:', data.requesterName);
  addRow('Parcelle N°:', data.parcelNumber);
  if (data.requesterEmail) addRow('Email:', data.requesterEmail);

  // Section: Caractéristiques
  y += 3;
  doc.setFillColor(230, 245, 235);
  doc.rect(18, y - 5, pw - 36, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 80, 40);
  doc.text('II. CARACTÉRISTIQUES DU BIEN', 22, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  if (data.propertyDescription) addRow('Description:', data.propertyDescription);
  if (data.constructionYear) addRow('Année construction:', data.constructionYear.toString());
  if (data.constructionQuality) addRow('Qualité:', QUALITY_LABELS[data.constructionQuality] || data.constructionQuality);
  if (data.numberOfFloors) addRow('Nombre d\'étages:', data.numberOfFloors.toString());
  if (data.totalBuiltAreaSqm) addRow('Surface bâtie:', `${data.totalBuiltAreaSqm} m²`);
  if (data.propertyCondition) addRow('État:', CONDITION_LABELS[data.propertyCondition] || data.propertyCondition);
  if (data.roadAccessType) addRow('Accès routier:', ROAD_LABELS[data.roadAccessType] || data.roadAccessType);

  // Equipments
  const equipments: string[] = [];
  if (data.hasWaterSupply) equipments.push('Eau');
  if (data.hasElectricity) equipments.push('Électricité');
  if (data.hasSewageSystem) equipments.push('Assainissement');
  if (data.hasInternet) equipments.push('Internet');
  if (data.hasSecuritySystem) equipments.push('Sécurité');
  if (data.hasParking) equipments.push(`Parking (${data.parkingSpaces || 1} places)`);
  if (data.hasGarden) equipments.push(`Jardin (${data.gardenAreaSqm || '?'} m²)`);
  if (equipments.length > 0) addRow('Équipements:', equipments.join(', '));

  // Risks
  const risks: string[] = [];
  if (data.floodRiskZone) risks.push('Zone inondable');
  if (data.erosionRiskZone) risks.push('Zone d\'érosion');
  if (risks.length > 0) {
    addRow('Risques:', risks.join(', '));
  } else {
    addRow('Risques:', 'Aucun risque identifié');
  }

  // Proximities
  const proximities: string[] = [];
  if (data.distanceToMainRoadM) proximities.push(`Route: ${data.distanceToMainRoadM}m`);
  if (data.distanceToHospitalKm) proximities.push(`Hôpital: ${data.distanceToHospitalKm}km`);
  if (data.distanceToSchoolKm) proximities.push(`École: ${data.distanceToSchoolKm}km`);
  if (data.distanceToMarketKm) proximities.push(`Marché: ${data.distanceToMarketKm}km`);
  if (proximities.length > 0) addRow('Proximités:', proximities.join(' | '));

  // Check if need new page
  if (y > ph - 100) {
    doc.addPage();
    y = 25;
  }

  // Section: Valuation
  y += 5;
  doc.setFillColor(220, 240, 225);
  doc.rect(18, y - 5, pw - 36, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 80, 40);
  doc.text('III. RÉSULTAT DE L\'ÉVALUATION', 22, y);
  doc.setTextColor(0, 0, 0);
  y += 10;

  // Value box
  doc.setFillColor(245, 255, 248);
  doc.setDrawColor(0, 120, 60);
  doc.setLineWidth(1.5);
  doc.roundedRect(30, y - 3, pw - 60, 20, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 100, 50);
  doc.text('VALEUR VÉNALE ESTIMÉE', pw / 2, y + 4, { align: 'center' });
  doc.setFontSize(18);
  doc.text(`$ ${data.marketValueUsd.toLocaleString('fr-FR')} USD`, pw / 2, y + 14, { align: 'center' });
  y += 28;

  doc.setTextColor(0, 0, 0);
  addRow('Date d\'expertise:', new Date(data.expertiseDateStr).toLocaleDateString('fr-FR'));
  addRow('Date d\'émission:', new Date(data.issueDate).toLocaleDateString('fr-FR'));
  addRow('Date d\'expiration:', new Date(data.expiryDate).toLocaleDateString('fr-FR'));

  // Legal text
  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80, 80, 80);
  const legal = 'Ce certificat atteste de la valeur vénale estimée du bien immobilier ci-dessus décrit à la date de l\'expertise. Cette estimation est réalisée selon les méthodes d\'évaluation immobilière reconnues et les conditions du marché local. Ce certificat est valide pour une durée de six (6) mois à compter de sa date d\'émission.';
  const legalLines = doc.splitTextToSize(legal, pw - 50);
  doc.text(legalLines, 25, y);
  y += legalLines.length * 4 + 8;

  // QR Code
  const qrUrl = `https://bic-rdc.com/verify-expertise/${data.referenceNumber}`;
  const qrImg = await QRCode.toDataURL(qrUrl, { width: 200 });
  doc.addImage(qrImg, 'PNG', pw - 52, ph - 65, 32, 32);
  doc.setFontSize(7);
  doc.text('Scannez pour vérifier', pw - 52, ph - 30);

  // Signature
  const sigY = ph - 65;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`Fait à Goma, le ${new Date(data.issueDate).toLocaleDateString('fr-FR')}`, 22, sigY);
  doc.setFont('helvetica', 'bold');
  doc.text(data.expertTitle || 'L\'Expert Évaluateur Agréé', 22, sigY + 12);
  doc.setFont('helvetica', 'italic');
  doc.text(data.expertName || data.approvedBy, 22, sigY + 20);

  // Stamp - use uploaded image if available, otherwise draw text stamp
  if (data.stampImageUrl) {
    try {
      doc.addImage(data.stampImageUrl, 'PNG', 45, sigY - 2, 28, 28);
    } catch {
      // Fallback to text stamp if image fails
      drawTextStamp(doc, sigY);
    }
  } else {
    drawTextStamp(doc, sigY);
  }

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'italic');
  doc.text('Document officiel - Toute falsification est passible de poursuites. Vérifiez l\'authenticité via le QR code.', pw / 2, ph - 14, { align: 'center' });

  return doc.output('blob');
}
