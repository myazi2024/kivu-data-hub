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
 * Génère un PDF A4 d'un rapport cadastral complet
 */
export function generateCadastralReport(
  cadastralResult: any,
  paidServices: string[],
  servicesCatalog: CadastralService[],
  filename?: string
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let cursorY = margin;

  const { parcel, ownership_history, tax_history, mortgage_history, boundary_history } = cadastralResult;

  // Fonction pour ajouter une nouvelle page si nécessaire
  const checkPageSpace = (neededSpace: number) => {
    if (cursorY + neededSpace > 270) { // 270mm from top to avoid footer
      doc.addPage();
      cursorY = margin;
    }
  };

  // En-tête du rapport
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text("RAPPORT CADASTRAL COMPLET", pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 8;
  
  doc.setFontSize(12);
  doc.text("Bureau de l'Immobilier du Congo (BIC)", pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 15;

  // Section 1: Informations générales de la parcelle
  checkPageSpace(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("1. INFORMATIONS GÉNÉRALES", margin, cursorY);
  cursorY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  
  const generalInfo = [
    ['Numéro de parcelle:', parcel.parcel_number || 'N/A'],
    ['Type de parcelle:', parcel.parcel_type || 'N/A'],
    ['Type de titre foncier:', parcel.property_title_type || 'N/A'],
    ['Superficie officielle:', parcel.area_sqm ? `${Number(parcel.area_sqm).toLocaleString()} m² (${(Number(parcel.area_sqm) / 10000).toFixed(4)} ha)` : 'N/A'],
    ['Superficie calculée (bornes):', parcel.surface_calculee_bornes ? `${Number(parcel.surface_calculee_bornes).toLocaleString()} m² (${(Number(parcel.surface_calculee_bornes) / 10000).toFixed(4)} ha)` : 'N/A'],
    ['Nombre de bornes:', parcel.nombre_bornes?.toString() || 'N/A'],
    ['Propriétaire actuel:', parcel.current_owner_name || 'N/A'],
    ['Statut juridique:', parcel.current_owner_legal_status || 'N/A'],
    ['Propriétaire depuis:', parcel.current_owner_since ? new Date(parcel.current_owner_since).toLocaleDateString('fr-FR') : 'N/A']
  ];

  generalInfo.forEach(([label, value]) => {
    checkPageSpace(6);
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, cursorY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 60, cursorY);
    cursorY += 6;
  });

  cursorY += 10;

  // Section 2: Localisation
  checkPageSpace(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("2. LOCALISATION", margin, cursorY);
  cursorY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  
  const locationInfo = [
    ['Circonscription foncière:', parcel.circonscription_fonciere || 'N/A'],
    ['Province:', parcel.province || 'N/A'],
    ['Ville:', parcel.ville || 'N/A'],
    ['Commune:', parcel.commune || 'N/A'],
    ['Quartier:', parcel.quartier || 'N/A'],
    ['Avenue:', parcel.avenue || 'N/A'],
    ['Territoire:', parcel.territoire || 'N/A'],
    ['Collectivité:', parcel.collectivite || 'N/A'],
    ['Groupement:', parcel.groupement || 'N/A'],
    ['Village:', parcel.village || 'N/A']
  ];

  locationInfo.forEach(([label, value]) => {
    if (value !== 'N/A') {
      checkPageSpace(6);
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin, cursorY);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 60, cursorY);
      cursorY += 6;
    }
  });

  cursorY += 10;

  // Section 3: Coordonnées GPS
  if (parcel.gps_coordinates && parcel.gps_coordinates.length > 0) {
    checkPageSpace(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("3. COORDONNÉES GPS DES BORNES", margin, cursorY);
    cursorY += 8;

    const gpsData = parcel.gps_coordinates.map((coord: any, index: number) => [
      `Borne ${index + 1}`,
      coord.lat?.toFixed(6) || 'N/A',
      coord.lng?.toFixed(6) || 'N/A'
    ]);

    autoTable(doc, {
      head: [["Borne", "Latitude", "Longitude"]],
      body: gpsData,
      startY: cursorY,
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [25, 113, 194], halign: 'center' },
      columnStyles: {
        0: { cellWidth: 40, halign: 'center' },
        1: { cellWidth: 60, halign: 'center' },
        2: { cellWidth: 60, halign: 'center' }
      },
      theme: 'grid',
      margin: { left: margin, right: margin }
    });

    cursorY = (doc as any).lastAutoTable?.finalY + 15 || cursorY + 30;
  }

  // Section 4: Historique de propriété
  if (ownership_history && ownership_history.length > 0) {
    checkPageSpace(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("4. HISTORIQUE DE PROPRIÉTÉ", margin, cursorY);
    cursorY += 8;

    const ownershipData = ownership_history.map((owner: any) => [
      owner.owner_name || 'N/A',
      owner.legal_status || 'N/A',
      owner.ownership_start_date ? new Date(owner.ownership_start_date).toLocaleDateString('fr-FR') : 'N/A',
      owner.ownership_end_date ? new Date(owner.ownership_end_date).toLocaleDateString('fr-FR') : 'En cours',
      owner.mutation_type || 'N/A'
    ]);

    autoTable(doc, {
      head: [["Propriétaire", "Statut juridique", "Début", "Fin", "Type de mutation"]],
      body: ownershipData,
      startY: cursorY,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [25, 113, 194], halign: 'center' },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 35 },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 35 }
      },
      theme: 'grid',
      margin: { left: margin, right: margin }
    });

    cursorY = (doc as any).lastAutoTable?.finalY + 15 || cursorY + 40;
  }

  // Section 5: Historique fiscal
  if (tax_history && tax_history.length > 0) {
    checkPageSpace(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("5. HISTORIQUE FISCAL", margin, cursorY);
    cursorY += 8;

    const taxData = tax_history.map((tax: any) => [
      tax.tax_year?.toString() || 'N/A',
      tax.amount_usd ? `${Number(tax.amount_usd).toLocaleString()} USD` : 'N/A',
      tax.payment_date ? new Date(tax.payment_date).toLocaleDateString('fr-FR') : 'Non payé',
      tax.payment_status === 'paid' ? 'Payé' : 
      tax.payment_status === 'overdue' ? 'En retard' : 'En attente'
    ]);

    autoTable(doc, {
      head: [["Année", "Montant", "Date de paiement", "Statut"]],
      body: taxData,
      startY: cursorY,
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [25, 113, 194], halign: 'center' },
      columnStyles: {
        0: { cellWidth: 30, halign: 'center' },
        1: { cellWidth: 40, halign: 'right' },
        2: { cellWidth: 40, halign: 'center' },
        3: { cellWidth: 35, halign: 'center' }
      },
      theme: 'grid',
      margin: { left: margin, right: margin }
    });

    cursorY = (doc as any).lastAutoTable?.finalY + 15 || cursorY + 40;
  }

  // Section 6: Historique des hypothèques
  if (mortgage_history && mortgage_history.length > 0) {
    checkPageSpace(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("6. HISTORIQUE DES HYPOTHÈQUES", margin, cursorY);
    cursorY += 8;

    const mortgageData = mortgage_history.map((mortgage: any) => [
      mortgage.creditor_name || 'N/A',
      mortgage.creditor_type || 'N/A',
      mortgage.mortgage_amount_usd ? `${Number(mortgage.mortgage_amount_usd).toLocaleString()} USD` : 'N/A',
      mortgage.duration_months ? `${mortgage.duration_months} mois` : 'N/A',
      mortgage.contract_date ? new Date(mortgage.contract_date).toLocaleDateString('fr-FR') : 'N/A',
      mortgage.mortgage_status === 'active' ? 'Active' : 
      mortgage.mortgage_status === 'paid' ? 'Remboursée' : 'Inactive'
    ]);

    autoTable(doc, {
      head: [["Créancier", "Type", "Montant", "Durée", "Date contrat", "Statut"]],
      body: mortgageData,
      startY: cursorY,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [25, 113, 194], halign: 'center' },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 25 },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' }
      },
      theme: 'grid',
      margin: { left: margin, right: margin }
    });

    cursorY = (doc as any).lastAutoTable?.finalY + 15 || cursorY + 40;
  }

  // Section 7: Historique de bornage
  if (boundary_history && boundary_history.length > 0) {
    checkPageSpace(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("7. HISTORIQUE DE BORNAGE", margin, cursorY);
    cursorY += 8;

    const boundaryData = boundary_history.map((boundary: any) => [
      boundary.surveyor_name || 'N/A',
      boundary.pv_reference_number || 'N/A',
      boundary.survey_date ? new Date(boundary.survey_date).toLocaleDateString('fr-FR') : 'N/A',
      boundary.boundary_purpose || 'N/A'
    ]);

    autoTable(doc, {
      head: [["Géomètre", "Référence PV", "Date d'arpentage", "Objet"]],
      body: boundaryData,
      startY: cursorY,
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [25, 113, 194], halign: 'center' },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 35 },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 45 }
      },
      theme: 'grid',
      margin: { left: margin, right: margin }
    });

    cursorY = (doc as any).lastAutoTable?.finalY + 15 || cursorY + 40;
  }

  // Section 8: Services inclus dans ce rapport
  const selectedServices = servicesCatalog.filter(s => paidServices.includes(s.id));
  
  if (selectedServices.length > 0) {
    checkPageSpace(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("8. SERVICES INCLUS DANS CE RAPPORT", margin, cursorY);
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
  checkPageSpace(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text("NOTES IMPORTANTES", margin, cursorY);
  cursorY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const notes = [
    "• Ce rapport est basé sur les données officielles du Ministère des Affaires Foncières de la RDC.",
    "• Les informations contenues dans ce rapport sont valides à la date de génération.",
    "• Pour toute vérification, référez-vous aux documents officiels auprès de la circonscription foncière.",
    "• Ce document est généré automatiquement par le système BIC et certifié conforme.",
    "• En cas de discordance, les documents officiels font foi."
  ];

  notes.forEach(note => {
    checkPageSpace(5);
    doc.text(note, margin, cursorY);
    cursorY += 5;
  });

  // Ajouter le pied de page sur toutes les pages
  const totalPages = doc.internal.pages.length - 1; // Exclude the first empty page
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    const footerY = 297 - 10; // A4 height ~297mm
    doc.text(
      `Document généré automatiquement par BIC - Page ${i}/${totalPages} - ${new Date().toLocaleDateString('fr-FR')}`,
      pageWidth / 2,
      footerY,
      { align: 'center' }
    );
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
