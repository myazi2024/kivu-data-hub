import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CadastralInvoice, CadastralService } from '@/hooks/useCadastralBilling';

// Informations légales complètes de BIC
const BIC_COMPANY_INFO = {
  name: "Bureau de l'Immobilier du Congo",
  abbreviation: "BIC",
  fullLegalName: "Bureau de l'Immobilier du Congo S.A.R.L.",
  address: "Avenue Patrice Lumumba, Quartier Himbi II",
  city: "Goma, Province du Nord-Kivu",
  country: "République Démocratique du Congo",
  rccm: "RCCM/GOMA/2024/B/001234",
  idNat: "01-234-N12345C",
  numImpot: "A1234567890",
  numTva: "TVA001234567",
  email: "contact@bic-congo.cd",
  phone: "+243 997 123 456",
  fax: "+243 281 123 457",
  website: "www.bic-congo.cd",
  authorizedCapital: "100.000 USD",
  legalForm: "Société à Responsabilité Limitée (S.A.R.L.)",
  tradeLicense: "LIC/2024/GOMA/001",
  establishedYear: "2024"
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

  // En-tête ultra compact
  doc.setTextColor(44, 62, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.text("BIC", margin, cursorY);
  
  doc.setFontSize(8);
  doc.setTextColor(127, 140, 141);
  doc.text("Bureau de l'Immobilier du Congo", margin + 20, cursorY);
  
  // Date et numéro à droite
  doc.text(`${new Date(invoice.search_date).toLocaleDateString('fr-FR')}`, pageWidth - margin, cursorY, { align: 'right' });
  doc.text(`N° ${invoice.invoice_number}`, pageWidth - margin, cursorY + 4, { align: 'right' });

  cursorY += 20;
  // Informations en ligne compacte
  const selectedIds = getSelectedServiceIds(invoice);
  const selectedServices = servicesCatalog.filter(s => selectedIds.includes(s.id));
  
  doc.setTextColor(44, 62, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Parcelle et statut en une ligne
  doc.text(`Parcelle ${invoice.parcel_number}`, margin, cursorY);
  const statusText = invoice.status === 'paid' ? 'Payé' : 'En attente';
  doc.setTextColor(statusText === 'Payé' ? 39 : 231, statusText === 'Payé' ? 174 : 76, statusText === 'Payé' ? 96 : 60);
  doc.text(statusText, pageWidth - margin, cursorY, { align: 'right' });
  
  cursorY += 8;
  doc.setTextColor(44, 62, 80);

  // Services en tableau ultra compact
  if (selectedServices.length > 0) {
    const tableData = selectedServices.map(service => [
      service.name,
      `${Number(service.price).toFixed(2)} $`
    ]);

    autoTable(doc, {
      head: [["Service", "Prix"]],
      body: tableData,
      startY: cursorY,
      styles: { 
        fontSize: 9, 
        cellPadding: 1.5,
        lineColor: [230, 230, 230],
        lineWidth: 0.2,
        textColor: [44, 62, 80]
      },
      headStyles: { 
        fillColor: [250, 250, 250], 
        textColor: [44, 62, 80],
        fontStyle: 'normal',
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: (pageWidth - 2 * margin) * 0.7 },
        1: { cellWidth: (pageWidth - 2 * margin) * 0.3, halign: 'right' }
      },
      theme: 'plain',
      margin: { left: margin, right: margin }
    });

    cursorY = (doc as any).lastAutoTable?.finalY + 5;
  }

  // Calculs compacts
  const subtotal = selectedServices.reduce((sum, service) => sum + Number(service.price), 0);
  const discountAmount = Number(invoice.discount_amount_usd || 0);
  const netAmount = subtotal - discountAmount;
  const tvaAmount = netAmount * 0.16;
  const total = netAmount + tvaAmount;

  // Totaux alignés à droite
  const rightAlign = pageWidth - margin;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  if (discountAmount > 0) {
    doc.text(`Remise: -${discountAmount.toFixed(2)} $`, rightAlign, cursorY, { align: 'right' });
    cursorY += 4;
  }
  
  doc.text(`TVA 16%: ${tvaAmount.toFixed(2)} $`, rightAlign, cursorY, { align: 'right' });
  cursorY += 6;

  // Total avec emphase
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Total: ${total.toFixed(2)} $`, rightAlign, cursorY, { align: 'right' });
  
  cursorY += 15;

  // Pied de page minimaliste
  doc.setTextColor(127, 140, 141);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text("BIC - Bureau de l'Immobilier du Congo", pageWidth / 2, 280, { align: 'center' });

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
 * Génère un rapport cadastral ultra-compact sur une seule page, conforme aux données à l'écran
 */
export function generateCadastralReport(
  cadastralResult: any,
  paidServices: string[],
  servicesCatalog: CadastralService[],
  filename?: string
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let currentY = margin;

  const { parcel, ownership_history, tax_history, mortgage_history, boundary_history } = cadastralResult;

  // ===== FONCTIONS DE FORMATAGE IDENTIQUES À L'ÉCRAN =====
  const formatArea = (sqm: number): string => {
    if (!sqm || sqm === 0) return 'Non spécifiée';
    if (sqm >= 10000) {
      return `${(sqm / 10000).toFixed(2)} ha (${sqm.toLocaleString('fr-FR')} m²)`;
    }
    return `${sqm.toLocaleString('fr-FR')} m²`;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // ===== EN-TÊTE ULTRA-COMPACT =====
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("BIC", margin, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text("Bureau de l'Immobilier du Congo", margin + 25, currentY);
  doc.text(new Date().toLocaleDateString('fr-FR'), pageWidth - margin, currentY, { align: 'right' });

  currentY += 8;

  // ===== TITRE ET PARCELLE =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`RAPPORT CADASTRAL - PARCELLE ${parcel.parcel_number}`, margin, currentY);
  
  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const parcelTypeText = parcel.parcel_type === 'SU' ? 'Section Urbaine' : 'Section Rurale';
  doc.text(`${parcelTypeText} • ${parcel.location || 'Localisation indéterminée'}`, margin, currentY);
  
  currentY += 10;

  // ===== MISE EN PAGE EN DEUX COLONNES =====
  const colWidth = (pageWidth - 3 * margin) / 2;
  const leftCol = margin;
  const rightCol = margin + colWidth + margin;
  let leftY = currentY;
  let rightY = currentY;

  // ===== COLONNE GAUCHE: INFORMATIONS GÉNÉRALES =====
  if (paidServices.includes('information')) {
    doc.setTextColor(0, 51, 102);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text("INFORMATIONS GÉNÉRALES", leftCol, leftY);
    leftY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);

    // Données EXACTES de l'écran
    const infoData = [
      ['Type:', parcel.property_title_type || 'Non spécifié'],
      ['Surface:', formatArea(parcel.area_sqm)], // Utilise area_sqm comme à l'écran
      ...(parcel.area_hectares > 0 ? [['Hectares:', `${parcel.area_hectares.toFixed(2)} ha`]] : [])
    ];

    infoData.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, leftCol, leftY);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(value, colWidth - 25);
      doc.text(lines, leftCol + 25, leftY);
      leftY += 3.5;
    });

    leftY += 3;

    // Propriétaire actuel (EXACTEMENT comme à l'écran)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text("PROPRIÉTAIRE ACTUEL", leftCol, leftY);
    leftY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const ownerData = [
      ['Nom:', parcel.current_owner_name || 'Non renseigné'],
      ['Statut:', parcel.current_owner_legal_status || 'Non défini'],
      ['Depuis:', formatDate(parcel.current_owner_since)]
    ];

    ownerData.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, leftCol, leftY);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(value, colWidth - 25);
      doc.text(lines, leftCol + 25, leftY);
      leftY += 3.5;
    });
  } else {
    doc.setTextColor(200, 0, 0);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text("Service 'Information' non inclus", leftCol, leftY);
    leftY += 5;
  }

  // ===== COLONNE DROITE: LOCALISATION =====
  if (paidServices.includes('location_history')) {
    doc.setTextColor(0, 51, 102);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text("LOCALISATION", rightCol, rightY);
    rightY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);

    // Données EXACTES comme affichées à l'écran
    const locationData = [];
    if (parcel.province) locationData.push(['Province:', parcel.province]);
    
    if (parcel.parcel_type === 'SU') {
      if (parcel.ville) locationData.push(['Ville:', parcel.ville]);
      if (parcel.commune) locationData.push(['Commune:', parcel.commune]);
      if (parcel.quartier) locationData.push(['Quartier:', parcel.quartier]);
      if (parcel.avenue) locationData.push(['Avenue:', parcel.avenue]);
    } else {
      if (parcel.territoire) locationData.push(['Territoire:', parcel.territoire]);
      if (parcel.collectivite) locationData.push(['Collectivité:', parcel.collectivite]);
      if (parcel.groupement) locationData.push(['Groupement:', parcel.groupement]);
      if (parcel.village) locationData.push(['Village:', parcel.village]);
    }

    locationData.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, rightCol, rightY);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(value, colWidth - 25);
      doc.text(lines, rightCol + 25, rightY);
      rightY += 3.5;
    });

    // Coordonnées GPS si disponibles
    if (parcel.gps_coordinates && parcel.gps_coordinates.length > 0) {
      rightY += 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text("COORDONNÉES GPS", rightCol, rightY);
      rightY += 4;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text(`${parcel.gps_coordinates.length} points de délimitation`, rightCol, rightY);
      rightY += 3;
      
      // Superficie calculée côté serveur (garantit cohérence avec l'écran)
      const calculatedArea = (parcel as any).calculated_surface_sqm;
      if (calculatedArea && calculatedArea > 0) {
        doc.text(`Surface GPS: ${formatArea(calculatedArea)}`, rightCol, rightY);
        rightY += 3;
      }
    }
  } else {
    doc.setTextColor(200, 0, 0);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text("Service 'Localisation' non inclus", rightCol, rightY);
    rightY += 5;
  }

  // Continuer avec la plus haute colonne
  currentY = Math.max(leftY, rightY) + 10;

  // ===== HISTORIQUE (Si inclus) =====
  if (paidServices.includes('history')) {
    doc.setTextColor(0, 51, 102);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text("HISTORIQUE", margin, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);

    if (ownership_history && ownership_history.length > 0) {
      const recentOwners = ownership_history.slice(0, 3); // Limiter pour l'espace
      recentOwners.forEach((owner, index) => {
        const startDate = formatDate(owner.ownership_start_date);
        const endDate = owner.ownership_end_date ? formatDate(owner.ownership_end_date) : 'Actuel';
        doc.text(`${index + 1}. ${owner.owner_name || 'Inconnu'} (${startDate} → ${endDate})`, margin, currentY);
        currentY += 3;
      });
      if (ownership_history.length > 3) {
        doc.setFont('helvetica', 'italic');
        doc.text(`... et ${ownership_history.length - 3} autre(s) propriétaire(s)`, margin, currentY);
        currentY += 3;
      }
    } else {
      doc.text("Aucun historique disponible", margin, currentY);
      currentY += 3;
    }
  }

  // ===== OBLIGATIONS FISCALES (Si incluses) =====
  if (paidServices.includes('obligations')) {
    currentY += 5;
    doc.setTextColor(0, 51, 102);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text("OBLIGATIONS FISCALES", margin, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);

    if (tax_history && tax_history.length > 0) {
      const overdueTaxes = tax_history.filter(tax => tax.payment_status === 'overdue');
      const paidTaxes = tax_history.filter(tax => tax.payment_status === 'paid');
      const pendingTaxes = tax_history.filter(tax => tax.payment_status === 'pending');
      
      doc.text(`Total: ${tax_history.length} taxes | Payées: ${paidTaxes.length} | En retard: ${overdueTaxes.length} | En attente: ${pendingTaxes.length}`, margin, currentY);
      currentY += 3;
      
      const statusText = overdueTaxes.length > 0 ? 'RETARDS DE PAIEMENT' : 'À JOUR';
      const statusColor: [number, number, number] = overdueTaxes.length > 0 ? [200, 0, 0] : [0, 150, 0];
      doc.setTextColor(...statusColor);
      doc.text(`Statut: ${statusText}`, margin, currentY);
      currentY += 3;
    } else {
      doc.text("Aucune donnée fiscale disponible", margin, currentY);
      currentY += 3;
    }
  }

  // ===== BORNAGE (Si disponible) =====
  if (boundary_history && boundary_history.length > 0) {
    currentY += 5;
    doc.setTextColor(0, 51, 102);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text("BORNAGE", margin, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);

    boundary_history.slice(0, 2).forEach(boundary => {
      const surveyDate = formatDate(boundary.survey_date);
      doc.text(`PV: ${boundary.pv_reference_number} | Date: ${surveyDate} | Géomètre: ${boundary.surveyor_name || 'N/A'}`, margin, currentY);
      currentY += 3;
    });
  }

  // ===== SERVICES INCLUS =====
  currentY += 8;
  doc.setFillColor(240, 248, 255);
  doc.rect(margin - 2, currentY - 3, pageWidth - 2 * margin + 4, 6, 'F');
  doc.setTextColor(0, 102, 51);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text("SERVICES INCLUS:", margin, currentY);
  currentY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  let servicesList = '';
  paidServices.forEach(serviceId => {
    const service = servicesCatalog.find(s => s.id === serviceId);
    if (service) {
      servicesList += `✓ ${service.name} ($${Number(service.price).toFixed(2)}) `;
    }
  });
  doc.text(servicesList || 'Aucun service payé', margin, currentY);
  
  // ===== PIED DE PAGE COMPACT =====
  const footerY = 280;
  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(BIC_COMPANY_INFO.fullLegalName, pageWidth / 2, footerY + 4, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text(`${BIC_COMPANY_INFO.address}, ${BIC_COMPANY_INFO.city}`, pageWidth / 2, footerY + 8, { align: 'center' });
  doc.text(`RCCM: ${BIC_COMPANY_INFO.rccm} • N° TVA: ${BIC_COMPANY_INFO.numTva}`, pageWidth / 2, footerY + 11, { align: 'center' });
  doc.text(`Tél: ${BIC_COMPANY_INFO.phone} • Email: ${BIC_COMPANY_INFO.email}`, pageWidth / 2, footerY + 14, { align: 'center' });

  // Sauvegarde
  const reportDate = new Date().toISOString().split('T')[0];
  const fn = filename || `rapport_cadastral_${parcel.parcel_number.replace(/[^0-9A-Za-z]/g, '_')}_${reportDate}.pdf`;
  saveDocument(doc, fn);
}


// Les calculs de superficie sont maintenant effectués côté serveur
// Cette fonction n'est plus nécessaire car les données arrivent déjà calculées