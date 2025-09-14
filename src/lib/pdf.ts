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
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let currentY = margin;

  const { parcel, ownership_history, tax_history, mortgage_history, boundary_history } = cadastralResult;

  // ===== EN-TÊTE PROFESSIONNEL AVEC INFORMATIONS LÉGALES COMPLÈTES =====
  
  // Logo et nom principal
  doc.setTextColor(0, 51, 102); // Bleu professionnel
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(BIC_COMPANY_INFO.abbreviation, margin, currentY);
  
  // Nom complet de l'entreprise
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(BIC_COMPANY_INFO.fullLegalName, margin + 35, currentY);
  
  // Informations légales à droite
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const rightMargin = pageWidth - margin;
  doc.text(`RCCM: ${BIC_COMPANY_INFO.rccm}`, rightMargin, currentY - 2, { align: 'right' });
  doc.text(`N° TVA: ${BIC_COMPANY_INFO.numTva}`, rightMargin, currentY + 2, { align: 'right' });
  doc.text(`ID NAT: ${BIC_COMPANY_INFO.idNat}`, rightMargin, currentY + 6, { align: 'right' });
  
  currentY += 12;
  
  // Adresse complète
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(BIC_COMPANY_INFO.address, margin, currentY);
  doc.text(`${BIC_COMPANY_INFO.city}, ${BIC_COMPANY_INFO.country}`, margin, currentY + 4);
  
  // Contact à droite
  doc.text(`Tél: ${BIC_COMPANY_INFO.phone}`, rightMargin, currentY, { align: 'right' });
  doc.text(`Email: ${BIC_COMPANY_INFO.email}`, rightMargin, currentY + 4, { align: 'right' });
  
  currentY += 12;
  
  // Ligne de séparation
  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(0.8);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // ===== TITRE ET INFORMATIONS DU RAPPORT =====
  
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`RAPPORT CADASTRAL DÉTAILLÉ`, margin, currentY);
  
  // Informations du rapport à droite
  const reportDate = new Date().toLocaleDateString('fr-FR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const reportTime = new Date().toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  const reportNumber = `RPT-${parcel.parcel_number.replace(/[^0-9A-Za-z]/g, '')}-${Date.now().toString().slice(-6)}`;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Date: ${reportDate}`, rightMargin, currentY - 4, { align: 'right' });
  doc.text(`Heure: ${reportTime}`, rightMargin, currentY, { align: 'right' });
  doc.text(`N° Rapport: ${reportNumber}`, rightMargin, currentY + 4, { align: 'right' });
  
  currentY += 12;
  
  // Informations principales de la parcelle
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`PARCELLE N° ${parcel.parcel_number}`, margin, currentY);
  
  currentY += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const parcelTypeText = parcel.parcel_type === 'SU' ? 'Section Urbaine' : 'Section Rurale';
  doc.text(`${parcelTypeText} • ${parcel.location || 'Localisation à déterminer'}`, margin, currentY);
  
  currentY += 10;

  // ===== SERVICES INCLUS DANS LE RAPPORT =====
  
  doc.setTextColor(0, 102, 51); // Vert pour les services
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("SERVICES INCLUS DANS CE RAPPORT:", margin, currentY);
  currentY += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let servicesCount = 0;
  paidServices.forEach(serviceId => {
    const service = servicesCatalog.find(s => s.id === serviceId);
    if (service) {
      servicesCount++;
      doc.setTextColor(0, 150, 0);
      doc.text(`✓ ${service.name} - ${service.description || 'Service cadastral'}`, margin + 5, currentY);
      doc.setTextColor(80, 80, 80);
      doc.text(`$${Number(service.price).toFixed(2)}`, rightMargin, currentY, { align: 'right' });
      currentY += 4;
    }
  });
  
  if (servicesCount === 0) {
    doc.setTextColor(200, 0, 0);
    doc.text("Aucun service payé - Rapport limité", margin + 5, currentY);
    currentY += 4;
  }
  
  currentY += 8;

  // ===== FONCTIONS UTILITAIRES POUR CONFORMITÉ ÉCRAN =====
  
  const formatArea = (sqm: number): string => {
    if (!sqm || sqm === 0) return 'Non spécifiée';
    if (sqm >= 10000) {
      return `${(sqm / 10000).toFixed(4)} hectares (${sqm.toLocaleString('fr-FR')} m²)`;
    }
    return `${sqm.toLocaleString('fr-FR')} m²`;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Non spécifiée';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Format invalide';
    }
  };

  const formatCurrency = (amount: number | string | null): string => {
    if (!amount) return '0,00 USD';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  };

  // ===== FONCTION POUR CRÉER DES SECTIONS DÉTAILLÉES =====
  
  const addDetailedSection = (title: string, data: Array<[string, string]>, hasAccess: boolean = true, description?: string) => {
    // Vérifier si on a besoin d'une nouvelle page
    if (currentY + (data.length * 6) + 25 > pageHeight - 40) {
      doc.addPage();
      currentY = margin;
    }

    // Titre de section avec fond coloré
    doc.setFillColor(240, 248, 255);
    doc.rect(margin - 2, currentY - 3, pageWidth - 2 * margin + 4, 8, 'F');
    
    doc.setTextColor(0, 51, 102);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(title, margin, currentY);
    
    if (!hasAccess) {
      doc.setTextColor(200, 0, 0);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text("(Service non inclus - Données non disponibles)", rightMargin, currentY, { align: 'right' });
    }
    
    currentY += 8;
    
    // Description du service si fournie
    if (description && hasAccess) {
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text(description, margin, currentY);
      currentY += 4;
    }

    if (!hasAccess) {
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text("Pour accéder à ces informations, veuillez souscrire au service correspondant.", margin, currentY);
      currentY += 12;
      return;
    }

    if (data.length === 0) {
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text("Aucune donnée disponible pour cette section.", margin, currentY);
      currentY += 12;
      return;
    }

    // Affichage des données en tableau structuré
    autoTable(doc, {
      startY: currentY,
      head: [['Propriété', 'Valeur']],
      body: data,
      styles: { 
        fontSize: 9,
        cellPadding: 3,
        lineColor: [220, 220, 220],
        lineWidth: 0.3,
        textColor: [40, 40, 40],
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      headStyles: { 
        fillColor: [248, 250, 252], 
        textColor: [0, 51, 102],
        fontStyle: 'bold',
        fontSize: 10
      },
      columnStyles: {
        0: { 
          cellWidth: 60, 
          fontStyle: 'bold',
          fillColor: [252, 254, 255],
          valign: 'top'
        },
        1: { 
          cellWidth: pageWidth - 2 * margin - 60,
          cellPadding: { left: 8, right: 3, top: 3, bottom: 3 },
          valign: 'top'
        }
      },
      alternateRowStyles: { fillColor: [252, 254, 255] },
      theme: 'grid',
      margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable?.finalY + 10;
  };

  // ===== 1. INFORMATIONS GÉNÉRALES (Service 'information') =====
  
  if (paidServices.includes('information')) {
    const generalData: Array<[string, string]> = [
      ['Numéro de parcelle', parcel.parcel_number || 'Non spécifié'],
      ['Type de section', parcel.parcel_type === 'SU' ? 'Section Urbaine (SU)' : 'Section Rurale (SR)'],
      ['Superficie officielle', formatArea(parcel.official_area)],
      ['Statut juridique', parcel.legal_status || 'Non défini'],
      ['Date d\'enregistrement', formatDate(parcel.registration_date)],
      ['Zone cadastrale', parcel.cadastral_zone || 'Non spécifiée'],
      ['Numéro de titre foncier', parcel.title_number || 'Non attribué'],
      ['Usage autorisé', parcel.authorized_use || 'Usage mixte'],
      ['Valeur estimée', formatCurrency(parcel.estimated_value)],
      ['Date de dernière mise à jour', formatDate(parcel.last_updated)]
    ];

    // Calcul de superficie GPS si disponible
    if (parcel.gps_coordinates && parcel.gps_coordinates.length >= 3) {
      const calculatedArea = calculateSurfaceFromBounds(parcel.gps_coordinates);
      if (calculatedArea && calculatedArea > 0) {
        generalData.push(['Superficie calculée (GPS)', formatArea(calculatedArea)]);
        
        // Comparaison avec superficie officielle
        if (parcel.official_area && Math.abs(calculatedArea - parcel.official_area) > 1) {
          const difference = ((calculatedArea - parcel.official_area) / parcel.official_area * 100).toFixed(2);
          generalData.push(['Écart GPS/Officiel', `${difference}% (${(calculatedArea - parcel.official_area).toFixed(2)} m²)`]);
        }
      }
    }

    addDetailedSection(
      'INFORMATIONS GÉNÉRALES DE LA PARCELLE', 
      generalData, 
      true,
      'Données de base extraites du registre foncier officiel'
    );
  } else {
    addDetailedSection('INFORMATIONS GÉNÉRALES DE LA PARCELLE', [], false);
  }

  // ===== 2. LOCALISATION DÉTAILLÉE (Service 'location_history') =====
  
  if (paidServices.includes('location_history')) {
    const locationData: Array<[string, string]> = [];
    
    // Hiérarchie administrative complète
    if (parcel.province) locationData.push(['Province', parcel.province]);
    if (parcel.ville) locationData.push(['Ville/Territoire', parcel.ville]);
    if (parcel.commune) locationData.push(['Commune/Secteur', parcel.commune]);
    if (parcel.quartier) locationData.push(['Quartier/Localité', parcel.quartier]);
    if (parcel.avenue) locationData.push(['Avenue/Rue', parcel.avenue]);
    if (parcel.location) locationData.push(['Adresse complète', parcel.location]);
    
    // Coordonnées et géolocalisation
    if (parcel.gps_coordinates && parcel.gps_coordinates.length > 0) {
      const centerLat = parcel.gps_coordinates.reduce((sum: number, coord: any) => sum + coord.lat, 0) / parcel.gps_coordinates.length;
      const centerLng = parcel.gps_coordinates.reduce((sum: number, coord: any) => sum + coord.lng, 0) / parcel.gps_coordinates.length;
      
      locationData.push(['Coordonnées centrales', `${centerLat.toFixed(6)}°N, ${centerLng.toFixed(6)}°E`]);
      locationData.push(['Système de coordonnées', 'WGS84 (GPS)']);
      locationData.push(['Nombre de points de délimitation', `${parcel.gps_coordinates.length} points`]);
      
      // Périmètre calculé
      let perimeter = 0;
      for (let i = 0; i < parcel.gps_coordinates.length; i++) {
        const current = parcel.gps_coordinates[i];
        const next = parcel.gps_coordinates[(i + 1) % parcel.gps_coordinates.length];
        const distance = Math.sqrt(Math.pow((next.lat - current.lat) * 111000, 2) + Math.pow((next.lng - current.lng) * 111000 * Math.cos(current.lat * Math.PI / 180), 2));
        perimeter += distance;
      }
      locationData.push(['Périmètre calculé', `${perimeter.toFixed(2)} mètres`]);
    } else {
      locationData.push(['Géolocalisation', 'Coordonnées GPS non disponibles']);
    }

    addDetailedSection(
      'LOCALISATION ET GÉOLOCALISATION', 
      locationData, 
      true,
      'Position géographique précise et délimitation de la parcelle'
    );

    // Sous-section: Coordonnées GPS détaillées
    if (parcel.gps_coordinates && parcel.gps_coordinates.length > 0) {
      const gpsDetailData = parcel.gps_coordinates.map((coord: any, index: number) => [
        `Borne ${index + 1}`,
        `Latitude: ${coord.lat.toFixed(8)}°\nLongitude: ${coord.lng.toFixed(8)}°\nPrécision: ±3m (GPS standard)`
      ]);
      
      addDetailedSection(
        'COORDONNÉES GPS DES BORNES', 
        gpsDetailData, 
        true,
        'Points de délimitation précis relevés par GPS'
      );
    }
  } else {
    addDetailedSection('LOCALISATION ET GÉOLOCALISATION', [], false);
  }

  // ===== 3. HISTORIQUE DE PROPRIÉTÉ (Service 'history' ou 'ownership_history') =====
  
  const hasOwnershipAccess = paidServices.includes('history') || paidServices.includes('ownership_history');
  if (hasOwnershipAccess && ownership_history && ownership_history.length > 0) {
    const ownershipData = ownership_history.map((owner: any, index: number) => {
      const startDate = formatDate(owner.ownership_start_date);
      const endDate = owner.ownership_end_date ? formatDate(owner.ownership_end_date) : 'Propriétaire actuel';
      
      let duration = 'En cours';
      if (owner.ownership_start_date && owner.ownership_end_date) {
        const start = new Date(owner.ownership_start_date);
        const end = new Date(owner.ownership_end_date);
        const years = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
        const months = Math.round(((end.getTime() - start.getTime()) % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
        duration = `${years} an(s) ${months} mois`;
      } else if (owner.ownership_start_date) {
        const start = new Date(owner.ownership_start_date);
        const now = new Date();
        const years = Math.round((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
        duration = `${years} an(s) (en cours)`;
      }
      
      return [
        `Propriétaire ${index + 1}`,
        `Nom: ${owner.owner_name || 'Non renseigné'}\n` +
        `Période: ${startDate} → ${endDate}\n` +
        `Durée: ${duration}\n` +
        `Type de propriété: ${owner.ownership_type || 'Propriété privée'}\n` +
        `Mode d'acquisition: ${owner.acquisition_method || 'Non spécifié'}\n` +
        `Prix d'acquisition: ${formatCurrency(owner.acquisition_price)}`
      ];
    });
    
    // Ajouter un résumé en tête
    const currentOwner = ownership_history.find((owner: any) => !owner.ownership_end_date);
    if (currentOwner) {
      ownershipData.unshift([
        'PROPRIÉTAIRE ACTUEL',
        `${currentOwner.owner_name || 'Non identifié'}\n` +
        `Depuis: ${formatDate(currentOwner.ownership_start_date)}\n` +
        `Statut: ${currentOwner.ownership_type || 'Propriété privée'}`
      ]);
    }
    
    addDetailedSection(
      'HISTORIQUE DE PROPRIÉTÉ', 
      ownershipData, 
      true,
      'Succession complète des propriétaires depuis la création de la parcelle'
    );
  } else {
    addDetailedSection('HISTORIQUE DE PROPRIÉTÉ', [], !hasOwnershipAccess);
  }

  // ===== 4. OBLIGATIONS FISCALES (Service 'obligations') =====
  
  if (paidServices.includes('obligations') && tax_history && tax_history.length > 0) {
    // Calculs préalables pour résumé
    const totalDue = tax_history.reduce((sum: number, tax: any) => sum + (Number(tax.amount_due) || 0), 0);
    const totalPaid = tax_history.reduce((sum: number, tax: any) => {
      return sum + (tax.payment_status === 'paid' ? (Number(tax.amount_due) || 0) : 0);
    }, 0);
    const paidTaxes = tax_history.filter(tax => tax.payment_status === 'paid').length;
    const overdueTaxes = tax_history.filter(tax => tax.payment_status === 'overdue').length;
    const pendingTaxes = tax_history.filter(tax => tax.payment_status === 'pending').length;
    
    const taxData: Array<[string, string]> = [
      [
        'RÉSUMÉ FISCAL',
        `Total des taxes: ${formatCurrency(totalDue)}\n` +
        `Montant payé: ${formatCurrency(totalPaid)}\n` +
        `Solde dû: ${formatCurrency(totalDue - totalPaid)}\n` +
        `Taxes payées: ${paidTaxes}/${tax_history.length}\n` +
        `Taxes en retard: ${overdueTaxes}\n` +
        `Taxes en attente: ${pendingTaxes}\n` +
        `Statut global: ${overdueTaxes > 0 ? '⚠️ RETARDS DE PAIEMENT' : totalPaid >= totalDue ? '✅ À JOUR' : '⏳ PAIEMENTS EN COURS'}`
      ]
    ];

    // Détail par année fiscale
    tax_history.forEach((tax: any) => {
      const year = tax.tax_year ? new Date(tax.tax_year).getFullYear() : 'Année inconnue';
      const status = tax.payment_status === 'paid' ? '✅ Payé' : 
                    tax.payment_status === 'overdue' ? '⚠️ En retard' : 
                    tax.payment_status === 'pending' ? '⏳ En attente' : '❓ Statut inconnu';
      const amount = formatCurrency(tax.amount_due);
      const paymentDate = formatDate(tax.payment_date);
      const dueDate = formatDate(tax.due_date);
      
      let penaltyInfo = '';
      if (tax.penalty_amount && Number(tax.penalty_amount) > 0) {
        penaltyInfo = `\nPénalités: ${formatCurrency(tax.penalty_amount)}`;
      }
      
      taxData.push([
        `Exercice ${year}`,
        `Type: ${tax.tax_type || 'Taxe foncière'}\n` +
        `Montant: ${amount}\n` +
        `Statut: ${status}\n` +
        `Date d'échéance: ${dueDate}\n` +
        `Date de paiement: ${paymentDate}${penaltyInfo}\n` +
        `Méthode de paiement: ${tax.payment_method || 'Non spécifiée'}`
      ]);
    });
    
    addDetailedSection(
      'OBLIGATIONS FISCALES ET PAIEMENTS', 
      taxData, 
      true,
      'État complet des taxes foncières et obligations fiscales'
    );
  } else {
    addDetailedSection('OBLIGATIONS FISCALES ET PAIEMENTS', [], !paidServices.includes('obligations'));
  }

  // ===== 5. HYPOTHÈQUES ET CHARGES (Service 'history') =====
  
  if (paidServices.includes('history') && mortgage_history && mortgage_history.length > 0) {
    const mortgageData = mortgage_history.map((mortgage: any, index: number) => {
      const amount = formatCurrency(mortgage.mortgage_amount);
      const startDate = formatDate(mortgage.mortgage_start_date);
      const endDate = formatDate(mortgage.mortgage_end_date);
      const status = mortgage.mortgage_status === 'active' ? '🔴 Active' : 
                     mortgage.mortgage_status === 'paid_off' ? '✅ Remboursée' : 
                     mortgage.mortgage_status === 'default' ? '⚠️ En défaut' : '❓ Statut inconnu';
      
      const interestRate = mortgage.interest_rate ? `${mortgage.interest_rate}% par an` : 'Non spécifié';
      const monthlyPayment = formatCurrency(mortgage.monthly_payment);
      const remainingBalance = formatCurrency(mortgage.remaining_balance);
      
      return [
        `Hypothèque ${index + 1}`,
        `Créancier: ${mortgage.lender_name || 'Institution non identifiée'}\n` +
        `Montant initial: ${amount}\n` +
        `Période: ${startDate} → ${endDate}\n` +
        `Statut: ${status}\n` +
        `Taux d'intérêt: ${interestRate}\n` +
        `Paiement mensuel: ${monthlyPayment}\n` +
        `Solde restant: ${remainingBalance}\n` +
        `Type d'hypothèque: ${mortgage.mortgage_type || 'Hypothèque conventionnelle'}\n` +
        `Garanties: ${mortgage.collateral_description || 'La parcelle elle-même'}`
      ];
    });
    
    // Résumé des charges
    const totalMortgages = mortgage_history.length;
    const activeMortgages = mortgage_history.filter(m => m.mortgage_status === 'active').length;
    const totalDebt = mortgage_history.reduce((sum: number, m: any) => {
      return sum + (m.mortgage_status === 'active' ? (Number(m.remaining_balance) || Number(m.mortgage_amount) || 0) : 0);
    }, 0);
    
    mortgageData.unshift([
      'RÉSUMÉ DES CHARGES',
      `Nombre total d'hypothèques: ${totalMortgages}\n` +
      `Hypothèques actives: ${activeMortgages}\n` +
      `Dette totale active: ${formatCurrency(totalDebt)}\n` +
      `Statut général: ${activeMortgages > 0 ? '⚠️ PARCELLE GREVÉE' : '✅ PARCELLE LIBRE'}`
    ]);
    
    addDetailedSection(
      'HYPOTHÈQUES ET CHARGES RÉELLES', 
      mortgageData, 
      true,
      'Ensemble des charges, hypothèques et sûretés grevant la parcelle'
    );
  } else {
    addDetailedSection('HYPOTHÈQUES ET CHARGES RÉELLES', [], !paidServices.includes('history'));
  }

  // ===== 6. HISTORIQUE DES LIMITES (Service bonus si disponible) =====
  
  if (boundary_history && boundary_history.length > 0) {
    const boundaryData = boundary_history.map((boundary: any, index: number) => [
      `Délimitation ${index + 1}`,
      `Date: ${formatDate(boundary.survey_date)}\n` +
      `Géomètre: ${boundary.surveyor_name || 'Non identifié'}\n` +
      `Méthode: ${boundary.survey_method || 'Non spécifiée'}\n` +
      `Précision: ${boundary.precision || 'Standard'}\n` +
      `Notes: ${boundary.notes || 'Aucune remarque'}`
    ]);
    
    addDetailedSection(
      'HISTORIQUE DES DÉLIMITATIONS', 
      boundaryData, 
      true,
      'Historique des relevés topographiques et délimitations'
    );
  }

  // ===== PIED DE PAGE AVEC INFORMATIONS LÉGALES COMPLÈTES =====
  
  const footerStartY = pageHeight - 35;
  
  // Ligne de séparation
  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(0.8);
  doc.line(margin, footerStartY, pageWidth - margin, footerStartY);
  
  // Informations légales complètes
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(BIC_COMPANY_INFO.fullLegalName, pageWidth / 2, footerStartY + 4, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`${BIC_COMPANY_INFO.address}, ${BIC_COMPANY_INFO.city}`, pageWidth / 2, footerStartY + 8, { align: 'center' });
  doc.text(`${BIC_COMPANY_INFO.legalForm} - Capital: ${BIC_COMPANY_INFO.authorizedCapital}`, pageWidth / 2, footerStartY + 11, { align: 'center' });
  
  // Informations légales en deux colonnes
  doc.text(`RCCM: ${BIC_COMPANY_INFO.rccm}`, margin, footerStartY + 15);
  doc.text(`N° TVA: ${BIC_COMPANY_INFO.numTva}`, pageWidth - margin, footerStartY + 15, { align: 'right' });
  doc.text(`ID NAT: ${BIC_COMPANY_INFO.idNat}`, margin, footerStartY + 18);
  doc.text(`Licence: ${BIC_COMPANY_INFO.tradeLicense}`, pageWidth - margin, footerStartY + 18, { align: 'right' });
  
  // Contact et certification
  doc.setTextColor(80, 80, 80);
  doc.text(`Tél: ${BIC_COMPANY_INFO.phone} • Email: ${BIC_COMPANY_INFO.email} • Web: ${BIC_COMPANY_INFO.website}`, pageWidth / 2, footerStartY + 22, { align: 'center' });
  
  // Mentions légales
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(120, 120, 120);
  doc.text(`Rapport généré le ${reportDate} à ${reportTime} - Document confidentiel - Établi depuis ${BIC_COMPANY_INFO.establishedYear}`, pageWidth / 2, footerStartY + 26, { align: 'center' });
  doc.text("Les informations contenues dans ce rapport sont extraites des registres officiels et bases de données cadastrales.", pageWidth / 2, footerStartY + 29, { align: 'center' });

  // Sauvegarde avec nom descriptif complet
  const fn = filename || `rapport_cadastral_detaille_${parcel.parcel_number.replace(/[^0-9A-Za-z]/g, '_')}_${formatDateForFilename()}_${reportNumber}.pdf`;
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