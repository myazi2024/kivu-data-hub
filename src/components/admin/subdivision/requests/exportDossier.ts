import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { SubdivisionRequest } from './types';
import { STATUS_LABELS } from './types';
import { getRoadsCount, getCommonSpacesCount } from './helpers';

/**
 * Génère un dossier PDF complet d'une demande de lotissement.
 * Inclut: identification, demandeur, parcelle, lots, voies, espaces communs,
 * paiement, statut, escalade, dates clés.
 */
export const exportSubdivisionDossier = (req: SubdivisionRequest): void => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  const addLine = (label: string, value: string | number | null | undefined, bold = false) => {
    if (y > 280) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(10);
    const v = value === null || value === undefined || value === '' ? '—' : String(value);
    doc.text(`${label}:`, margin, y);
    const lines = doc.splitTextToSize(v, pageWidth - margin * 2 - 50);
    doc.text(lines, margin + 50, y);
    y += 5 * Math.max(1, lines.length);
  };

  const section = (title: string) => {
    if (y > 270) { doc.addPage(); y = margin; }
    y += 3;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 4, pageWidth - margin * 2, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(title, margin + 2, y + 1);
    y += 8;
  };

  // En-tête
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('DOSSIER DEMANDE DE LOTISSEMENT', pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Référence: ${req.reference_number}`, pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.text(
    `Édité le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`,
    pageWidth / 2, y, { align: 'center' },
  );
  y += 8;

  // Statut
  section('Statut');
  addLine('Statut', STATUS_LABELS[req.status] || req.status, true);
  addLine('Escaladée', req.escalated ? 'OUI' : 'Non');
  addLine('Affectée à', req.assigned_to || '—');
  addLine('Date affectation', req.assigned_at ? format(new Date(req.assigned_at), 'dd/MM/yyyy HH:mm') : '—');
  addLine('Date soumission', format(new Date(req.created_at), 'dd/MM/yyyy HH:mm'));
  if (req.in_review_at) addLine('Mise en examen', format(new Date(req.in_review_at), 'dd/MM/yyyy HH:mm'));
  if (req.reviewed_at) addLine('Date traitement', format(new Date(req.reviewed_at), 'dd/MM/yyyy HH:mm'));

  // Demandeur
  section('Demandeur');
  addLine('Nom complet', `${req.requester_last_name} ${req.requester_first_name}`);
  addLine('Type', req.requester_type || '—');
  addLine('Téléphone', req.requester_phone);
  addLine('Email', req.requester_email || '—');
  if (req.requester_id_number) addLine('Pièce d\'identité', req.requester_id_number);

  // Parcelle mère
  section('Parcelle mère');
  addLine('Numéro parcelle', req.parcel_number);
  addLine('Surface', `${req.parent_parcel_area_sqm} m²`);
  if (req.parent_parcel_address) addLine('Adresse', req.parent_parcel_address);
  if (req.section_type) addLine('Type section', req.section_type);
  if (req.location_name) addLine('Localisation', req.location_name);

  // Lots
  section('Découpage');
  addLine('Nombre de lots', req.number_of_lots);
  addLine('Voies', getRoadsCount(req));
  addLine('Espaces communs', getCommonSpacesCount(req));
  if (req.purpose_of_subdivision) addLine('Objet', req.purpose_of_subdivision);

  // Détail lots (si dispo)
  if (Array.isArray(req.lots_data) && req.lots_data.length > 0) {
    section('Détail des lots');
    req.lots_data.slice(0, 30).forEach((lot: any, i: number) => {
      const area = lot.area_sqm || lot.surface || '—';
      const usage = lot.usage || lot.purpose || '—';
      addLine(`Lot ${i + 1}`, `${area} m² — ${usage}`);
    });
    if (req.lots_data.length > 30) {
      addLine('…', `+${req.lots_data.length - 30} lots non listés`);
    }
  }

  // Frais
  section('Frais & Paiement');
  addLine('Frais de soumission', req.submission_fee_usd != null ? `$${Number(req.submission_fee_usd).toFixed(2)}` : '—');
  addLine('Frais de traitement', req.processing_fee_usd != null ? `$${Number(req.processing_fee_usd).toFixed(2)}` : '—');
  addLine('Total', req.total_amount_usd != null ? `$${Number(req.total_amount_usd).toFixed(2)}` : '—', true);
  addLine('Statut paiement', req.submission_payment_status || '—');
  if (req.payment_reference) addLine('Référence paiement', req.payment_reference);

  // Motifs / notes
  if (req.rejection_reason || req.processing_notes) {
    section('Notes & Motifs');
    if (req.rejection_reason) addLine('Motif rejet/renvoi', req.rejection_reason);
    if (req.processing_notes) addLine('Notes de traitement', req.processing_notes);
  }

  // Pied de page
  const totalPages = (doc as any).internal.getNumberOfPages?.() ?? 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `BIC — Bureau d'Information Cadastrale  •  Page ${i}/${totalPages}`,
      pageWidth / 2, 290, { align: 'center' },
    );
  }

  doc.save(`dossier-lotissement-${req.reference_number}.pdf`);
};
