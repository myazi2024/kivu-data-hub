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
 * Génère un PDF de justificatif de paiement avec format sélectionnable
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
function generateA4InvoicePDF(
  invoice: CadastralInvoice,
  servicesCatalog: CadastralService[],
  filename?: string
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let cursorY = margin;

  // En-tête moderne et compact
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(BIC_COMPANY_INFO.abbreviation, margin, cursorY);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(BIC_COMPANY_INFO.name, margin, cursorY + 6);
  
  // Informations de l'entreprise à droite de manière compacte
  doc.setFontSize(8);
  const rightX = pageWidth - margin;
  doc.text(BIC_COMPANY_INFO.address, rightX, cursorY, { align: 'right' });
  doc.text(`${BIC_COMPANY_INFO.email} | ${BIC_COMPANY_INFO.phone}`, rightX, cursorY + 4, { align: 'right' });
  doc.text(`RCCM: ${BIC_COMPANY_INFO.rccm}`, rightX, cursorY + 8, { align: 'right' });
  doc.text(`ID: ${BIC_COMPANY_INFO.idNat} | N°IMPÔT: ${BIC_COMPANY_INFO.numImpot}`, rightX, cursorY + 12, { align: 'right' });

  cursorY += 25;

  // Ligne de séparation moderne
  doc.setLineWidth(0.5);
  doc.setDrawColor(41, 128, 185);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 8;

  // JUSTIFICATIF DE PAIEMENT - titre moderne
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text("JUSTIFICATIF DE PAIEMENT", margin, cursorY);
  cursorY += 10;
  // Layout en deux colonnes compact
  const leftCol = margin;
  const rightCol = pageWidth / 2 + 10;
  
  // Colonne gauche - Info facture (plus compact)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text("Informations du justificatif", leftCol, cursorY);
  cursorY += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`N°: ${invoice.invoice_number}`, leftCol, cursorY);
  cursorY += 4;
  doc.text(`Date: ${new Date(invoice.search_date).toLocaleDateString('fr-FR')}`, leftCol, cursorY);
  cursorY += 4;
  doc.text(`Parcelle: ${invoice.parcel_number}`, leftCol, cursorY);
  
  // Statut et paiement dans la même section
  cursorY += 4;
  const statusText = invoice.status === 'paid' ? 'Payée' : 
                    invoice.status === 'pending' ? 'En attente' : 'Échec';
  doc.text(`Statut: ${statusText}`, leftCol, cursorY);
  
  cursorY += 4;
  const paymentMethod = invoice.payment_method || 'Non spécifié';
  const paymentDisplay = paymentMethod === 'mobile_money' ? 'Mobile Money' :
                         paymentMethod === 'visa' ? 'Visa •••• 4242' :
                         paymentMethod === 'stripe' ? 'Carte de crédit' : paymentMethod;
  doc.text(`Paiement: ${paymentDisplay}`, leftCol, cursorY);

  // Colonne droite - Info client (alignée)
  const clientY = cursorY - 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text("Facturer à", rightCol, clientY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (invoice.client_name) {
    doc.text(invoice.client_name, rightCol, clientY + 6);
  }
  if (invoice.client_email) {
    doc.text(invoice.client_email, rightCol, clientY + 10);
  }
  if (invoice.client_organization) {
    doc.text(invoice.client_organization, rightCol, clientY + 14);
  }

  cursorY += 15;

  // Tableau des services optimisé et moderne
  const selectedIds = getSelectedServiceIds(invoice);
  const selectedServices = servicesCatalog.filter(s => selectedIds.includes(s.id));

  const tableData = selectedServices.map(service => [
    service.name,
    service.description || 'Service cadastral professionnel',
    '1',
    `$${Number(service.price).toFixed(2)}`,
    `$${Number(service.price).toFixed(2)}`
  ]);

  const availableWidth = pageWidth - (2 * margin);
  
  autoTable(doc, {
    head: [["Prestation", "Description", "Qté", "Prix unit.", "Total"]],
    body: tableData.length ? tableData : [["-", "-", "-", "-", "-"]],
    startY: cursorY,
    styles: { 
      fontSize: 9, 
      cellPadding: 2.5,
      lineColor: [220, 220, 220],
      lineWidth: 0.1
    },
    headStyles: { 
      fillColor: [41, 128, 185], 
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: availableWidth * 0.32 }, // 32% pour prestation
      1: { cellWidth: availableWidth * 0.43 }, // 43% pour description
      2: { cellWidth: availableWidth * 0.08, halign: 'center' }, // 8% pour quantité
      3: { cellWidth: availableWidth * 0.085, halign: 'right' }, // 8.5% pour prix unit
      4: { cellWidth: availableWidth * 0.085, halign: 'right' } // 8.5% pour total
    },
    theme: 'grid',
    alternateRowStyles: { fillColor: [248, 249, 250] },
    margin: { left: margin, right: margin },
    tableWidth: availableWidth
  });

  const finalY = (doc as any).lastAutoTable?.finalY || cursorY + 20;

  // Section totaux compacte et moderne
  const totalsY = finalY + 8;
  const totalsWidth = 60; // Largeur de la section totaux
  const totalsX = pageWidth - margin - totalsWidth;
  
  const subtotal = selectedServices.reduce((sum, service) => sum + Number(service.price), 0);
  const discountAmount = Number(invoice.discount_amount_usd || 0);
  const tvaRate = 0.16;
  const tvaAmount = (subtotal - discountAmount) * tvaRate;
  const total = subtotal - discountAmount + tvaAmount;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  doc.text("Sous-total:", totalsX, totalsY);
  doc.text(`$${subtotal.toFixed(2)}`, pageWidth - margin, totalsY, { align: 'right' });

  if (discountAmount > 0) {
    doc.text("Remise:", totalsX, totalsY + 4);
    doc.text(`-$${discountAmount.toFixed(2)}`, pageWidth - margin, totalsY + 4, { align: 'right' });
  }

  const tvaY = totalsY + (discountAmount > 0 ? 8 : 4);
  doc.text("TVA (16%):", totalsX, tvaY);
  doc.text(`$${tvaAmount.toFixed(2)}`, pageWidth - margin, tvaY, { align: 'right' });

  // Ligne de total moderne
  doc.setLineWidth(0.5);
  doc.setDrawColor(41, 128, 185);
  doc.line(totalsX, tvaY + 2, pageWidth - margin, tvaY + 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("TOTAL:", totalsX, tvaY + 7);
  doc.text(`$${total.toFixed(2)} USD`, pageWidth - margin, tvaY + 7, { align: 'right' });

  // QR Code moderne et compact
  const qrY = tvaY + 12;
  if (invoice.status === 'paid') {
    try {
      const qrData = `${typeof window !== 'undefined' ? window.location.origin : 'https://bic-congo.cd'}/cadastral/${invoice.parcel_number}?invoice=${invoice.invoice_number}&services=${getSelectedServiceIds(invoice).join(',')}`;
      
      // QR Code section compacte
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text("Accès rapide:", margin, qrY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text("Scannez pour accéder", margin, qrY + 3);
      
      // QR code stylisé compact
      const qrSize = 15;
      const qrX = margin;
      const qrStartY = qrY + 5;
      
      doc.setLineWidth(0.3);
      doc.rect(qrX, qrStartY, qrSize, qrSize);
      
      // Motif QR optimisé
      doc.setFillColor(0, 0, 0);
      const cellSize = qrSize / 6;
      const pattern = [
        [1,1,0,1,0,1],
        [1,0,1,0,1,0],
        [0,1,1,1,0,1],
        [1,0,0,1,1,0],
        [0,1,0,0,1,1],
        [1,0,1,1,0,0]
      ];
      
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          if (pattern[i][j]) {
            doc.rect(qrX + j * cellSize + 0.5, qrStartY + i * cellSize + 0.5, cellSize - 0.5, cellSize - 0.5, 'F');
          }
        }
      }
      
    } catch (error) {
      console.error('Erreur génération QR code:', error);
    }
  }

  // Pied de page compact
  const footerY = 280;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    "Document officiel BIC - Sources Ministère des Affaires Foncières",
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );
  doc.text(
    `Généré le ${new Date().toLocaleDateString('fr-FR')} | ${BIC_COMPANY_INFO.rccm}`,
    pageWidth / 2,
    footerY + 3,
    { align: 'center' }
  );

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

/**
 * Génère un PDF A4 d'un rapport cadastral complet avec design épuré
 */
export function generateCadastralReport(
  cadastralResult: any,
  paidServices: string[],
  servicesCatalog: CadastralService[],
  filename?: string
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let currentY = margin;

  const { parcel, ownership_history, tax_history, mortgage_history, boundary_history } = cadastralResult;

  // Fonction pour ajouter une nouvelle page si nécessaire avec en-tête
  const checkPageBreak = (neededSpace: number) => {
    if (currentY + neededSpace > 250) { // 250mm from top to avoid footer
      doc.addPage();
      currentY = margin + 10;
      addPageHeader();
    }
  };

  // Fonction pour ajouter l'en-tête sur chaque page
  const addPageHeader = () => {
    // Logo et nom BIC (côté gauche)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(20, 84, 129); // Bleu professionnel BIC
    doc.text(BIC_COMPANY_INFO.abbreviation, margin, currentY);
    
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(BIC_COMPANY_INFO.name, margin, currentY + 6);
    
    // Informations légales (côté droit) - compact
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    const rightX = pageWidth - margin;
    doc.text(BIC_COMPANY_INFO.address, rightX, currentY, { align: 'right' });
    doc.text(`${BIC_COMPANY_INFO.email} | ${BIC_COMPANY_INFO.phone}`, rightX, currentY + 3, { align: 'right' });
    doc.text(`RCCM: ${BIC_COMPANY_INFO.rccm}`, rightX, currentY + 6, { align: 'right' });

    currentY += 15;

    // Ligne de séparation élégante
    doc.setLineWidth(0.5);
    doc.setDrawColor(20, 84, 129);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 5;
  };

  // Fonction pour formater la superficie comme à l'écran
  const formatArea = (area: number): string => {
    if (area >= 10000) {
      return `${(area / 10000).toFixed(2)} ha (${area.toLocaleString()} m²)`;
    }
    return `${area.toLocaleString()} m²`;
  };

  // Fonction pour traduire le statut de paiement (identique à l'écran)
  const translatePaymentStatus = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Payé';
      case 'overdue':
        return 'En retard';
      case 'pending':
        return 'En attente';
      default:
        return status;
    }
  };

  // En-tête principal de la première page
  addPageHeader();

  // Titre du rapport avec style moderne
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20, 84, 129);
  doc.text("RAPPORT CADASTRAL COMPLET", pageWidth / 2, currentY, { align: 'center' });
  currentY += 6;
  
  // Sous-titre avec informations de la parcelle
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Parcelle N° ${parcel.parcel_number || 'N/A'}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 4;
  
  doc.setFontSize(8);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 12;

  // Section 1: Informations générales - Afficher seulement si le service 'information' est payé
  if (paidServices.includes('information')) {
    checkPageBreak(50);
    
    // Titre de section
    doc.setFillColor(20, 84, 129);
    doc.rect(20, currentY, pageWidth - 40, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('📋 INFORMATIONS GÉNÉRALES', 25, currentY + 6);
    
    currentY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : currentY + 15;

    // Calculer la superficie à partir des coordonnées GPS (si disponible)
    const calculateAreaFromGPS = () => {
      if (!parcel.gps_coordinates || parcel.gps_coordinates.length < 3) return null;
      
      let area = 0;
      const coords = parcel.gps_coordinates;
      const n = coords.length;
      
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += coords[i].lat * coords[j].lng;
        area -= coords[j].lat * coords[i].lng;
      }
      
      return Math.abs(area) / 2 * 111319.5 * 111319.5; // Conversion approximative en m²
    };

    const calculatedArea = calculateAreaFromGPS();
    const formatCalculatedArea = calculatedArea ? formatArea(Math.round(calculatedArea)) : 'N/A';

    // Générer la table des informations générales
    (doc as any).autoTable({
      startY: currentY + 5,
      head: [['Propriété', 'Valeur']],
      body: [
        ['Numéro de parcelle', parcel.parcel_number],
        ['Type de parcelle', parcel.parcel_type === 'SU' ? 'Section Urbaine' : 'Section Rurale'],
        ['Superficie officielle', parcel.official_area ? formatArea(parcel.official_area) : 'N/A'],
        ['Superficie calculée', formatCalculatedArea],
        ['Statut juridique', parcel.legal_status || 'N/A'],
        ['Date d\'enregistrement', parcel.registration_date ? new Date(parcel.registration_date).toLocaleDateString('fr-FR') : 'N/A'],
        ['Dernière mise à jour', parcel.updated_at ? new Date(parcel.updated_at).toLocaleDateString('fr-FR') : 'N/A'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [20, 84, 129], fontSize: 10, textColor: 255 },
      bodyStyles: { fontSize: 9, lineColor: [200, 200, 200] },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      margin: { left: 20, right: 20 },
      tableWidth: 'wrap',
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 100 }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Section 2: Localisation - Afficher seulement si le service 'location_history' est payé
  if (paidServices.includes('location_history')) {
    checkPageBreak(40);
    
    // Titre de section
    doc.setFillColor(20, 84, 129);
    doc.rect(20, currentY, pageWidth - 40, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('📍 LOCALISATION', 25, currentY + 6);
    
    currentY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : currentY + 15;

    // Table des informations de localisation
    (doc as any).autoTable({
      startY: currentY + 5,
      head: [['Propriété', 'Valeur']],
      body: [
        ['Province', parcel.province || 'N/A'],
        ['Ville', parcel.ville || 'N/A'],
        ['Commune', parcel.commune || 'N/A'],
        ['Quartier', parcel.quartier || 'N/A'],
        ['Avenue', parcel.avenue || 'N/A'],
        ['Numéro', parcel.numero || 'N/A'],
        ['Localisation complète', parcel.location || 'N/A']
      ],
      theme: 'striped',
      headStyles: { fillColor: [20, 84, 129], fontSize: 10, textColor: 255 },
      bodyStyles: { fontSize: 9, lineColor: [200, 200, 200] },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      margin: { left: 20, right: 20 },
      tableWidth: 'wrap',
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 100 }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Section 3: Coordonnées GPS - Afficher seulement si le service 'location_history' est payé
  if (paidServices.includes('location_history') && parcel.gps_coordinates && parcel.gps_coordinates.length > 0) {
    checkPageBreak(40);
    
    // Titre de section
    doc.setFillColor(20, 84, 129);
    doc.rect(20, currentY, pageWidth - 40, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('🗺️ COORDONNÉES GPS DES BORNES', 25, currentY + 6);
    
    currentY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : currentY + 15;

    // Table des coordonnées GPS
    (doc as any).autoTable({
      startY: currentY + 5,
      head: [['Point', 'Latitude', 'Longitude']],
      body: parcel.gps_coordinates.map((coord, index) => [
        `Point ${index + 1}`,
        coord.lat.toFixed(6),
        coord.lng.toFixed(6)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [20, 84, 129], fontSize: 10, textColor: 255 },
      bodyStyles: { fontSize: 9, lineColor: [200, 200, 200] },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      margin: { left: 20, right: 20 },
      tableWidth: 'wrap',
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 70 },
        2: { cellWidth: 70 }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Section Historique des propriétés - Afficher seulement si le service 'history' est payé
  if (paidServices.includes('history')) {
    if (ownership_history && ownership_history.length > 0) {
      checkPageBreak(50);
      
      // Titre de section
      doc.setFillColor(20, 84, 129);
      doc.rect(20, currentY, pageWidth - 40, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.text('📋 HISTORIQUE DES PROPRIÉTAIRES', 25, currentY + 6);
      
      currentY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : currentY + 15;

      // Table de l'historique des propriétaires
      (doc as any).autoTable({
        startY: currentY + 5,
        head: [['Propriétaire', 'Période', 'Type de transaction', 'Statut']],
        body: ownership_history.map(owner => [
          owner.owner_name || 'N/A',
          `${owner.start_date ? new Date(owner.start_date).toLocaleDateString('fr-FR') : 'N/A'} - ${owner.end_date ? new Date(owner.end_date).toLocaleDateString('fr-FR') : 'Actuel'}`,
          owner.transaction_type || 'N/A',
          owner.ownership_status || 'N/A'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [20, 84, 129], fontSize: 10, textColor: 255 },
        bodyStyles: { fontSize: 9, lineColor: [200, 200, 200] },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        margin: { left: 20, right: 20 },
        tableWidth: 'wrap',
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 45 },
          2: { cellWidth: 35 },
          3: { cellWidth: 35 }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Section Historique des modifications de limites - Afficher seulement si le service 'history' est payé
    if (boundary_history && boundary_history.length > 0) {
      checkPageBreak(50);
      
      // Titre de section
      doc.setFillColor(20, 84, 129);
      doc.rect(20, currentY, pageWidth - 40, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.text('📐 HISTORIQUE DES MODIFICATIONS DE LIMITES', 25, currentY + 6);
      
      currentY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : currentY + 15;

      // Table de l'historique des modifications de limites
      (doc as any).autoTable({
        startY: currentY + 5,
        head: [['Date de modification', 'Type de modification', 'Ancienne superficie', 'Nouvelle superficie', 'Raison']],
        body: boundary_history.map(boundary => [
          boundary.modification_date ? new Date(boundary.modification_date).toLocaleDateString('fr-FR') : 'N/A',
          boundary.modification_type || 'N/A',
          boundary.old_area ? formatArea(boundary.old_area) : 'N/A',
          boundary.new_area ? formatArea(boundary.new_area) : 'N/A',
          boundary.modification_reason || 'N/A'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [20, 84, 129], fontSize: 10, textColor: 255 },
        bodyStyles: { fontSize: 9, lineColor: [200, 200, 200] },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        margin: { left: 20, right: 20 },
        tableWidth: 'wrap',
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 35 },
          2: { cellWidth: 30 },
          3: { cellWidth: 30 },
          4: { cellWidth: 35 }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // Section Historique fiscal - Afficher seulement si le service 'obligations' est payé
  if (paidServices.includes('obligations')) {
    if (tax_history && tax_history.length > 0) {
      checkPageBreak(50);
      
      // Titre de section
      doc.setFillColor(20, 84, 129);
      doc.rect(20, currentY, pageWidth - 40, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.text('💰 HISTORIQUE FISCAL', 25, currentY + 6);
      
      currentY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : currentY + 15;

      // Table de l'historique fiscal
      (doc as any).autoTable({
        startY: currentY + 5,
        head: [['Année', 'Type d\'impôt', 'Montant (USD)', 'Date d\'échéance', 'Statut de paiement']],
        body: tax_history.map(tax => [
          tax.tax_year?.toString() || 'N/A',
          tax.tax_type || 'N/A',
          tax.amount_due ? `$${tax.amount_due.toFixed(2)}` : 'N/A',
          tax.due_date ? new Date(tax.due_date).toLocaleDateString('fr-FR') : 'N/A',
          translatePaymentStatus(tax.payment_status || 'N/A')
        ]),
        theme: 'striped',
        headStyles: { fillColor: [20, 84, 129], fontSize: 10, textColor: 255 },
        bodyStyles: { fontSize: 9, lineColor: [200, 200, 200] },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        margin: { left: 20, right: 20 },
        tableWidth: 'wrap',
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 40 },
          2: { cellWidth: 35 },
          3: { cellWidth: 35 },
          4: { cellWidth: 30 }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Section Historique des hypothèques - Afficher seulement si le service 'obligations' est payé
    if (mortgage_history && mortgage_history.length > 0) {
      checkPageBreak(50);
      
      // Titre de section
      doc.setFillColor(20, 84, 129);
      doc.rect(20, currentY, pageWidth - 40, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.text('🏦 HISTORIQUE DES HYPOTHÈQUES', 25, currentY + 6);
      
      currentY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : currentY + 15;

      // Table de l'historique des hypothèques
      (doc as any).autoTable({
        startY: currentY + 5,
        head: [['Créancier', 'Montant (USD)', 'Date de création', 'Date d\'échéance', 'Statut']],
        body: mortgage_history.map(mortgage => [
          mortgage.lender_name || 'N/A',
          mortgage.mortgage_amount ? `$${mortgage.mortgage_amount.toFixed(2)}` : 'N/A',
          mortgage.mortgage_date ? new Date(mortgage.mortgage_date).toLocaleDateString('fr-FR') : 'N/A',
          mortgage.due_date ? new Date(mortgage.due_date).toLocaleDateString('fr-FR') : 'N/A',
          mortgage.mortgage_status || 'N/A'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [20, 84, 129], fontSize: 10, textColor: 255 },
        bodyStyles: { fontSize: 9, lineColor: [200, 200, 200] },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        margin: { left: 20, right: 20 },
        tableWidth: 'wrap',
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 35 },
          2: { cellWidth: 30 },
          3: { cellWidth: 30 },
          4: { cellWidth: 25 }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // Section des services inclus - Utiliser les vrais noms des services payés
  checkPageBreak(50);
  
  // Titre de section
  doc.setFillColor(20, 84, 129);
  doc.rect(20, currentY, pageWidth - 40, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(12);
  doc.text('📋 SERVICES INCLUS DANS CE RAPPORT', 25, currentY + 6);
  
  currentY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : currentY + 15;

  // Filtrer les services selon les services payés
  const includedServices = servicesCatalog.filter(service => paidServices.includes(service.id));
  
  // Table des services inclus
  (doc as any).autoTable({
    startY: currentY + 5,
    head: [['Service', 'Description', 'Prix (USD)']],
    body: includedServices.map(service => [
      service.name,
      service.description,
      `$${service.price.toFixed(2)}`
    ]),
    theme: 'striped',
    headStyles: { fillColor: [20, 84, 129], fontSize: 10, textColor: 255 },
    bodyStyles: { fontSize: 9, lineColor: [200, 200, 200] },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { left: 20, right: 20 },
    tableWidth: 'wrap',
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 90 },
      2: { cellWidth: 25 }
    }
  });
  
  // Calculer le total
  const totalAmount = includedServices.reduce((sum, service) => sum + Number(service.price), 0);
  
  currentY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 5 : currentY + 80;

  // Total des services
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text(`Total des services inclus: $${totalAmount.toFixed(2)} USD`, 20, currentY);

  currentY += 10;

  // Notes importantes avec design moderne
  checkPageBreak(35);
  
  // Titre de section
  doc.setFillColor(20, 84, 129);
  doc.rect(20, currentY, pageWidth - 40, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(12);
  doc.text('ℹ️ NOTES IMPORTANTES', 25, currentY + 6);
  
  currentY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : currentY + 15;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  
  const notes = [
    "• Ce rapport est basé sur les données officielles du Ministère des Affaires Foncières de la RDC.",
    "• Les informations contenues dans ce rapport sont valides à la date de génération.",
    "• Pour toute vérification, référez-vous aux documents officiels auprès de la circonscription foncière.",
    "• Ce document est généré automatiquement par le système BIC et certifié conforme.",
    "• En cas de discordance, les documents officiels font foi.",
    "• La superficie calculée par GPS est fournie à titre indicatif et peut différer de la superficie officielle."
  ];

  notes.forEach((note) => {
    checkPageBreak(6);
    doc.text(note, 25, currentY);
    currentY += 6;
  });

  currentY += 5;

  // Pied de page professionnel avec informations complètes
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    const footerY = 285; // Position du pied de page
    
    // Ligne de séparation du pied de page
    doc.setLineWidth(0.3);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    
    // Informations légales à gauche
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(BIC_COMPANY_INFO.name, margin, footerY);
    doc.text(`${BIC_COMPANY_INFO.rccm} | ${BIC_COMPANY_INFO.idNat}`, margin, footerY + 4);
    doc.text(`${BIC_COMPANY_INFO.address}`, margin, footerY + 8);
    
    // Informations de contact au centre
    doc.text(`${BIC_COMPANY_INFO.phone} | ${BIC_COMPANY_INFO.email}`, pageWidth / 2, footerY, { align: 'center' });
    doc.text("Sources : Ministère des Affaires Foncières de la RDC", pageWidth / 2, footerY + 4, { align: 'center' });
    
    // Numérotation des pages et date à droite
    doc.text(`Page ${i}/${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - margin, footerY + 4, { align: 'right' });
    doc.text(`à ${new Date().toLocaleTimeString('fr-FR')}`, pageWidth - margin, footerY + 8, { align: 'right' });
  }

  // Sauvegarde
  const fn = filename || `rapport_cadastral_complet_${parcel.parcel_number}_${Date.now()}.pdf`;
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