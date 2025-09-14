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
 * Génère un rapport cadastral détaillé et conforme aux données à l'écran
 */
export function generateCadastralReport(
  cadastralResult: any,
  paidServices: string[],
  servicesCatalog: CadastralService[],
  filename?: string
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  let currentY = margin;

  const { parcel, ownership_history, tax_history, mortgage_history, boundary_history } = cadastralResult;

  // En-tête professionnel avec logo
  doc.setTextColor(44, 62, 80);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text("BIC", margin, currentY);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(108, 117, 125);
  doc.text("Bureau de l'Immobilier du Congo", margin + 30, currentY);
  
  // Date et numéro de rapport à droite
  const reportDate = new Date().toLocaleDateString('fr-FR');
  const reportNumber = `RPT-${parcel.parcel_number.replace(/[^0-9A-Za-z]/g, '')}-${Date.now().toString().slice(-6)}`;
  doc.setFontSize(9);
  doc.text(reportDate, pageWidth - margin, currentY, { align: 'right' });
  doc.text(`N° ${reportNumber}`, pageWidth - margin, currentY + 4, { align: 'right' });
  currentY += 20;

  // Titre du rapport
  doc.setTextColor(44, 62, 80);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(`RAPPORT CADASTRAL`, margin, currentY);
  currentY += 8;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Parcelle ${parcel.parcel_number}`, margin, currentY);
  currentY += 6;
  
  // Type de parcelle avec badge visuel
  const parcelTypeText = parcel.parcel_type === 'SU' ? 'Section Urbaine' : 'Section Rurale';
  doc.setFontSize(10);
  doc.setTextColor(108, 117, 125);
  doc.text(`${parcelTypeText} • ${parcel.location || 'Localisation non spécifiée'}`, margin, currentY);
  currentY += 15;

  // Services acquis détaillés
  doc.setTextColor(44, 62, 80);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("Services inclus dans ce rapport:", margin, currentY);
  currentY += 5;
  
  paidServices.forEach(serviceId => {
    const service = servicesCatalog.find(s => s.id === serviceId);
    if (service) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(22, 163, 74); // Vert pour les services payés
      doc.text(`✓ ${service.name}`, margin + 5, currentY);
      currentY += 4;
    }
  });
  currentY += 8;

  // Fonction pour créer des sections détaillées
  const addDetailedSection = (title: string, data: Array<[string, string]>, hasAccess: boolean = true) => {
    // Vérifier si on a besoin d'une nouvelle page
    if (currentY + (data.length * 5) + 20 > 270) {
      doc.addPage();
      currentY = margin;
    }

    // Titre de section avec ligne de séparation
    doc.setTextColor(44, 62, 80);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(title, margin, currentY);
    
    // Ligne de séparation sous le titre
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);
    currentY += 8;

    if (!hasAccess) {
      doc.setTextColor(156, 163, 175);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text("Service non inclus dans cette consultation", margin, currentY);
      currentY += 12;
      return;
    }

    if (data.length === 0) {
      doc.setTextColor(156, 163, 175);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text("Aucune donnée disponible", margin, currentY);
      currentY += 12;
      return;
    }

    // Tableau des données avec style professionnel
    autoTable(doc, {
      startY: currentY,
      head: [['Propriété', 'Valeur']],
      body: data,
      styles: { 
        fontSize: 9,
        cellPadding: 3,
        lineColor: [230, 230, 230],
        lineWidth: 0.2,
        textColor: [44, 62, 80]
      },
      headStyles: { 
        fillColor: [248, 249, 250], 
        textColor: [44, 62, 80],
        fontStyle: 'bold',
        fontSize: 10
      },
      columnStyles: {
        0: { 
          cellWidth: 60, 
          fontStyle: 'bold',
          fillColor: [252, 253, 254]
        },
        1: { 
          cellWidth: pageWidth - 2 * margin - 60,
          cellPadding: { left: 8, right: 3, top: 3, bottom: 3 }
        }
      },
      alternateRowStyles: { fillColor: [252, 253, 254] },
      theme: 'grid',
      margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable?.finalY + 12;
  };

  // Fonction pour formater la superficie (identique à l'écran)
  const formatArea = (sqm: number): string => {
    if (sqm >= 10000) {
      return `${(sqm / 10000).toFixed(2)} ha (${sqm.toLocaleString()} m²)`;
    }
    return `${sqm.toLocaleString()} m²`;
  };

  // Fonction pour formater les dates (identique à l'écran)
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // 1. INFORMATIONS GÉNÉRALES (service 'information')
  if (paidServices.includes('information')) {
    const generalData: Array<[string, string]> = [
      ['Numéro de parcelle', parcel.parcel_number || 'N/A'],
      ['Type de section', parcel.parcel_type === 'SU' ? 'Section Urbaine' : 'Section Rurale'],
      ['Superficie officielle', parcel.official_area ? formatArea(parcel.official_area) : 'N/A'],
      ['Statut légal', parcel.legal_status || 'Non défini'],
      ['Date d\'enregistrement', formatDate(parcel.registration_date)],
      ['Zone cadastrale', parcel.cadastral_zone || 'N/A'],
      ['Numéro de titre', parcel.title_number || 'N/A'],
      ['Usage autorisé', parcel.authorized_use || 'Usage général']
    ];

    // Ajouter la superficie calculée si disponible
    if (parcel.gps_coordinates && parcel.gps_coordinates.length >= 3) {
      const calculatedArea = calculateSurfaceFromBounds(parcel.gps_coordinates);
      if (calculatedArea) {
        generalData.push(['Superficie calculée (GPS)', formatArea(calculatedArea)]);
      }
    }

    addDetailedSection('INFORMATIONS GÉNÉRALES', generalData, true);
  } else {
    addDetailedSection('INFORMATIONS GÉNÉRALES', [], false);
  }

  // 2. LOCALISATION DÉTAILLÉE (service 'location_history')
  if (paidServices.includes('location_history')) {
    const locationData: Array<[string, string]> = [];
    
    // Adresse hiérarchique complète
    if (parcel.province) locationData.push(['Province', parcel.province]);
    if (parcel.ville) locationData.push(['Ville', parcel.ville]);
    if (parcel.commune) locationData.push(['Commune', parcel.commune]);
    if (parcel.quartier) locationData.push(['Quartier', parcel.quartier]);
    if (parcel.avenue) locationData.push(['Avenue/Rue', parcel.avenue]);
    if (parcel.location) locationData.push(['Adresse complète', parcel.location]);
    
    // Coordonnées centrales si disponibles
    if (parcel.gps_coordinates && parcel.gps_coordinates.length > 0) {
      const centerLat = parcel.gps_coordinates.reduce((sum: number, coord: any) => sum + coord.lat, 0) / parcel.gps_coordinates.length;
      const centerLng = parcel.gps_coordinates.reduce((sum: number, coord: any) => sum + coord.lng, 0) / parcel.gps_coordinates.length;
      locationData.push(['Coordonnées centrales', `${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}`]);
      locationData.push(['Nombre de points GPS', parcel.gps_coordinates.length.toString()]);
    }

    addDetailedSection('LOCALISATION', locationData, true);

    // Coordonnées GPS détaillées en sous-section
    if (parcel.gps_coordinates && parcel.gps_coordinates.length > 0) {
      const gpsData = parcel.gps_coordinates.map((coord: any, index: number) => [
        `Point ${index + 1}`,
        `Lat: ${coord.lat.toFixed(6)}, Lng: ${coord.lng.toFixed(6)}`
      ]);
      
      addDetailedSection('COORDONNÉES GPS (BORNES)', gpsData, true);
    }
  } else {
    addDetailedSection('LOCALISATION', [], false);
  }

  // 3. HISTORIQUE DE PROPRIÉTÉ (service 'history' ou 'ownership_history')
  const hasOwnershipAccess = paidServices.includes('history') || paidServices.includes('ownership_history');
  if (hasOwnershipAccess && ownership_history && ownership_history.length > 0) {
    const ownershipData = ownership_history.map((owner: any, index: number) => {
      const startDate = owner.ownership_start_date ? formatDate(owner.ownership_start_date) : 'N/A';
      const endDate = owner.ownership_end_date ? formatDate(owner.ownership_end_date) : 'Actuel';
      const duration = owner.ownership_start_date && owner.ownership_end_date 
        ? `${Math.round((new Date(owner.ownership_end_date).getTime() - new Date(owner.ownership_start_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25))} ans`
        : 'En cours';
      
      return [
        `Propriétaire ${index + 1}`,
        `${owner.owner_name || 'Nom non disponible'}\nPériode: ${startDate} → ${endDate}\nDurée: ${duration}\nType: ${owner.ownership_type || 'N/A'}`
      ];
    });
    
    addDetailedSection('HISTORIQUE DE PROPRIÉTÉ', ownershipData, true);
  } else {
    addDetailedSection('HISTORIQUE DE PROPRIÉTÉ', [], !hasOwnershipAccess ? false : true);
  }

  // 4. OBLIGATIONS FISCALES (service 'obligations')
  if (paidServices.includes('obligations') && tax_history && tax_history.length > 0) {
    const taxData = tax_history.map((tax: any) => {
      const year = new Date(tax.tax_year).getFullYear();
      const status = tax.payment_status === 'paid' ? 'Payé ✓' : 
                    tax.payment_status === 'overdue' ? 'En retard ⚠️' : 'En attente ⏳';
      const amount = tax.amount_due ? `${Number(tax.amount_due).toFixed(2)} USD` : 'N/A';
      const paymentDate = tax.payment_date ? formatDate(tax.payment_date) : 'Non payé';
      
      return [
        `Année ${year}`,
        `Montant: ${amount}\nStatut: ${status}\nDate de paiement: ${paymentDate}\nType: ${tax.tax_type || 'Taxe foncière'}`
      ];
    });

    // Calculer le résumé fiscal
    const totalDue = tax_history.reduce((sum: number, tax: any) => sum + (Number(tax.amount_due) || 0), 0);
    const paidTaxes = tax_history.filter(tax => tax.payment_status === 'paid').length;
    const overdueTaxes = tax_history.filter(tax => tax.payment_status === 'overdue').length;
    
    taxData.unshift([
      'RÉSUMÉ FISCAL',
      `Total dû: ${totalDue.toFixed(2)} USD\nTaxes payées: ${paidTaxes}/${tax_history.length}\nTaxes en retard: ${overdueTaxes}\nStatut global: ${overdueTaxes > 0 ? 'ATTENTION - Retards de paiement' : 'À jour'}`
    ]);
    
    addDetailedSection('OBLIGATIONS FISCALES', taxData, true);
  } else {
    addDetailedSection('OBLIGATIONS FISCALES', [], !paidServices.includes('obligations') ? false : true);
  }

  // 5. HYPOTHÈQUES ET CHARGES (service 'history')
  if (paidServices.includes('history') && mortgage_history && mortgage_history.length > 0) {
    const mortgageData = mortgage_history.map((mortgage: any, index: number) => {
      const amount = mortgage.mortgage_amount ? `${Number(mortgage.mortgage_amount).toFixed(2)} USD` : 'N/A';
      const startDate = formatDate(mortgage.mortgage_start_date);
      const endDate = formatDate(mortgage.mortgage_end_date);
      const status = mortgage.mortgage_status === 'active' ? 'Active ✓' : 
                    mortgage.mortgage_status === 'paid_off' ? 'Remboursée ✓' : 'Inconnue';
      
      return [
        `Hypothèque ${index + 1}`,
        `Créancier: ${mortgage.lender_name || 'N/A'}\nMontant: ${amount}\nPériode: ${startDate} → ${endDate}\nStatut: ${status}\nTaux: ${mortgage.interest_rate ? mortgage.interest_rate + '%' : 'N/A'}`
      ];
    });
    
    addDetailedSection('HYPOTHÈQUES ET CHARGES', mortgageData, true);
  } else {
    addDetailedSection('HYPOTHÈQUES ET CHARGES', [], !paidServices.includes('history') ? false : true);
  }

  // Pied de page professionnel
  const footerY = 285;
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  doc.setTextColor(108, 117, 125);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Bureau de l'Immobilier du Congo (BIC) - ${BIC_COMPANY_INFO.address}`, pageWidth / 2, footerY, { align: 'center' });
  doc.text(`${BIC_COMPANY_INFO.email} • ${BIC_COMPANY_INFO.phone}`, pageWidth / 2, footerY + 4, { align: 'center' });
  doc.text(`Rapport généré le ${reportDate} - Document confidentiel`, pageWidth / 2, footerY + 8, { align: 'center' });

  // Sauvegarde avec nom descriptif
  const fn = filename || `rapport_cadastral_${parcel.parcel_number.replace(/[^0-9A-Za-z]/g, '_')}_${formatDateForFilename()}.pdf`;
  saveDocument(doc, fn);
}

// Fonction utilitaire pour calculer la superficie depuis les coordonnées GPS (identique à l'écran)
function calculateSurfaceFromBounds(gpsCoordinates: Array<{lat: number, lng: number}>): number | null {
  if (!gpsCoordinates || gpsCoordinates.length < 3) return null;
  
  let area = 0;
  const coords = gpsCoordinates;
  const n = coords.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coords[i].lat * coords[j].lng;
    area -= coords[j].lat * coords[i].lng;
  }
  
  return Math.abs(area) / 2 * 111319.5 * 111319.5; // Conversion approximative en m²
}