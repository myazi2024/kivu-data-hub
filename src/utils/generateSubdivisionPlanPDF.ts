import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { fetchAppLogo } from '@/utils/pdfLogoHelper';
import { createDocumentVerification } from '@/lib/documentVerification';
import { supabase } from '@/integrations/supabase/client';
import { getSubdivisionPlanElementsAsync } from '@/hooks/useSubdivisionPlanElements';

interface SubdivisionPlanData {
  id: string;
  reference_number: string;
  parcel_number: string;
  number_of_lots: number;
  purpose_of_subdivision?: string | null;
  parent_parcel_area_sqm?: number | null;
  parent_parcel_location?: string | null;
  parent_parcel_owner_name?: string | null;
  requester_first_name?: string | null;
  requester_last_name?: string | null;
  approved_at?: string | null;
  reviewed_at?: string | null;
  lots_data?: any[] | null;
  subdivision_plan_data?: any | null;
}

/**
 * Génère le plan de lotissement en PDF (A4 paysage) avec :
 * - en-tête officiel
 * - identification de la demande / parcelle mère
 * - schéma vectoriel des lots (et voies si dispo)
 * - tableau récapitulatif des lots
 * - QR code de vérification dans le footer
 */
export async function generateSubdivisionPlanPDF(req: SubdivisionPlanData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Charger la config admin des éléments de plan obligatoires
  const planElements = await getSubdivisionPlanElementsAsync();
  const activeRequiredKeys = new Set(
    planElements.filter(e => e.is_active && e.is_required).map(e => e.element_key)
  );
  const has = (key: string) => activeRequiredKeys.has(key);

  // Si les lots ne sont pas dans la requête, charger depuis subdivision_lots
  let lots: any[] = Array.isArray(req.lots_data) ? req.lots_data : [];
  if (lots.length === 0) {
    const { data } = await (supabase as any)
      .from('subdivision_lots')
      .select('lot_number, lot_label, area_sqm, perimeter_m, intended_use, owner_name, plan_coordinates, color')
      .eq('subdivision_request_id', req.id);
    lots = (data || []).map((l: any) => ({
      lotNumber: l.lot_number,
      areaSqm: l.area_sqm,
      perimeterM: l.perimeter_m,
      intendedUse: l.intended_use,
      ownerName: l.owner_name,
      vertices: Array.isArray(l.plan_coordinates) ? l.plan_coordinates : [],
      color: l.color || '#22c55e',
    }));
  }

  const planData: any = req.subdivision_plan_data || {};
  const roads: any[] = Array.isArray(planData.roads) ? planData.roads : [];

  // Bordure
  doc.setLineWidth(1);
  doc.setDrawColor(0, 100, 200);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  // Logo
  const logo = await fetchAppLogo();
  if (logo) {
    try { doc.addImage(logo, 'PNG', 12, 11, 14, 14); } catch { /* ignore */ }
  }

  // En-tête
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 50, 100);
  doc.text('RÉPUBLIQUE DÉMOCRATIQUE DU CONGO', pageWidth / 2, 16, { align: 'center' });
  doc.setFontSize(11);
  doc.text('BUREAU D\'INFORMATION CADASTRALE', pageWidth / 2, 22, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Direction de l\'Aménagement et de l\'Urbanisme', pageWidth / 2, 27, { align: 'center' });

  doc.setLineWidth(0.4);
  doc.setDrawColor(0, 100, 200);
  doc.line(12, 31, pageWidth - 12, 31);

  // Titre
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 0, 0);
  doc.text('PLAN OFFICIEL DE LOTISSEMENT', pageWidth / 2, 39, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(`Référence : ${req.reference_number}`, pageWidth / 2, 45, { align: 'center' });

  // Bloc identification (gauche)
  let yInfo = 54;
  doc.setFontSize(9);
  const label = (l: string, v: string | number | null | undefined, y: number) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${l} :`, 12, y);
    doc.setFont('helvetica', 'normal');
    const val = v === null || v === undefined || v === '' ? '—' : String(v);
    const lines = doc.splitTextToSize(val, 70);
    doc.text(lines, 48, y);
    return y + lines.length * 4 + 1;
  };

  yInfo = label('Parcelle mère', req.parcel_number, yInfo);
  yInfo = label('Surface mère', req.parent_parcel_area_sqm ? `${req.parent_parcel_area_sqm} m²` : '—', yInfo);
  yInfo = label('Localisation', req.parent_parcel_location, yInfo);
  yInfo = label('Propriétaire', req.parent_parcel_owner_name, yInfo);
  yInfo = label('Demandeur', `${req.requester_last_name || ''} ${req.requester_first_name || ''}`.trim() || '—', yInfo);
  yInfo = label('Nombre de lots', req.number_of_lots, yInfo);
  yInfo = label('Date d\'approbation', req.approved_at || req.reviewed_at
    ? new Date(req.approved_at || req.reviewed_at!).toLocaleDateString('fr-FR')
    : '—', yInfo);
  if (req.purpose_of_subdivision) {
    yInfo = label('Objet', req.purpose_of_subdivision, yInfo);
  }

  // ===== Schéma des lots (zone droite) =====
  const planX = 130;
  const planY = 52;
  const planW = pageWidth - planX - 14;
  const planH = 110;

  // Cadre
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.rect(planX, planY, planW, planH);
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'bold');
  doc.text('Schéma du lotissement', planX + planW / 2, planY - 1.5, { align: 'center' });

  // Calcul bbox des vertices (espace 0..1)
  const allPts: { x: number; y: number }[] = [];
  lots.forEach((l) => {
    if (Array.isArray(l.vertices)) l.vertices.forEach((p: any) => {
      if (typeof p?.x === 'number' && typeof p?.y === 'number') allPts.push(p);
    });
  });
  roads.forEach((r) => {
    if (Array.isArray(r.path)) r.path.forEach((p: any) => {
      if (typeof p?.x === 'number' && typeof p?.y === 'number') allPts.push(p);
    });
  });

  if (allPts.length >= 3) {
    const minX = Math.min(...allPts.map(p => p.x));
    const maxX = Math.max(...allPts.map(p => p.x));
    const minY = Math.min(...allPts.map(p => p.y));
    const maxY = Math.max(...allPts.map(p => p.y));
    const dx = Math.max(0.0001, maxX - minX);
    const dy = Math.max(0.0001, maxY - minY);
    const pad = 4;
    const scale = Math.min((planW - pad * 2) / dx, (planH - pad * 2) / dy);
    const offsetX = planX + (planW - dx * scale) / 2;
    const offsetY = planY + (planH - dy * scale) / 2;

    const project = (p: { x: number; y: number }) => ({
      X: offsetX + (p.x - minX) * scale,
      Y: offsetY + (p.y - minY) * scale,
    });

    const hexToRgb = (hex: string): [number, number, number] => {
      const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
      if (!m) return [200, 230, 200];
      const n = parseInt(m[1], 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };

    // Lots
    doc.setLineWidth(0.3);
    lots.forEach((lot) => {
      const verts: any[] = Array.isArray(lot.vertices) ? lot.vertices : [];
      if (verts.length < 3) return;
      const [r, g, b] = hexToRgb(lot.color || '#22c55e');
      // Remplissage clair
      doc.setFillColor(Math.min(255, r + 60), Math.min(255, g + 60), Math.min(255, b + 60));
      doc.setDrawColor(r, g, b);
      const projected = verts.map(project);
      const lines: [number, number][] = projected.slice(1).map((p, i) => [p.X - projected[i].X, p.Y - projected[i].Y]);
      (doc as any).lines(lines, projected[0].X, projected[0].Y, [1, 1], 'FD', true);

      // Label
      const cx = projected.reduce((s, p) => s + p.X, 0) / projected.length;
      const cy = projected.reduce((s, p) => s + p.Y, 0) / projected.length;
      doc.setFontSize(7);
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'bold');
      doc.text(String(lot.lotNumber || ''), cx, cy, { align: 'center' });
    });

    // Voies
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.6);
    roads.forEach((road) => {
      const path: any[] = Array.isArray(road.path) ? road.path : [];
      if (path.length < 2) return;
      const projected = path.map(project);
      for (let i = 1; i < projected.length; i++) {
        doc.line(projected[i - 1].X, projected[i - 1].Y, projected[i].X, projected[i].Y);
      }
    });
  } else {
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'italic');
    doc.text('Schéma non disponible', planX + planW / 2, planY + planH / 2, { align: 'center' });
  }

  // ===== Éléments obligatoires du plan (configurables par l'admin) =====
  // Flèche du Nord (en haut-droite du cadre schéma)
  if (has('north_arrow')) {
    const nx = planX + planW - 8;
    const ny = planY + 8;
    doc.setDrawColor(40, 40, 40);
    doc.setFillColor(40, 40, 40);
    doc.setLineWidth(0.4);
    // Flèche : triangle pointant vers le haut + ligne
    doc.triangle(nx, ny - 5, nx - 2.5, ny + 2, nx + 2.5, ny + 2, 'F');
    doc.line(nx, ny + 2, nx, ny + 6);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('N', nx, ny - 6, { align: 'center' });
  }

  // Échelle graphique (en bas-gauche du cadre schéma)
  if (has('echelle_graphique')) {
    const sx = planX + 4;
    const sy = planY + planH - 5;
    const segW = 6; // mm par segment
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.4);
    // Barres alternées noir/blanc
    for (let i = 0; i < 4; i++) {
      if (i % 2 === 0) {
        doc.setFillColor(40, 40, 40);
        doc.rect(sx + i * segW, sy, segW, 1.5, 'F');
      } else {
        doc.setFillColor(255, 255, 255);
        doc.rect(sx + i * segW, sy, segW, 1.5, 'FD');
      }
    }
    doc.setFontSize(6);
    doc.setTextColor(40, 40, 40);
    doc.text('0', sx, sy + 4);
    doc.text('échelle indicative', sx + segW * 4 + 1, sy + 1.2);
  }

  // Légende dynamique (en bas-droite du cadre schéma)
  if (has('legende') && lots.length > 0) {
    // Regrouper par usage prévu
    const usageColors = new Map<string, string>();
    lots.forEach(l => {
      const u = (l.intendedUse || 'Non défini').slice(0, 24);
      if (!usageColors.has(u)) usageColors.set(u, l.color || '#22c55e');
    });
    const entries = Array.from(usageColors.entries()).slice(0, 5);
    const lgX = planX + planW - 50;
    let lgY = planY + planH - 4 - entries.length * 4;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Légende', lgX, lgY - 1.5);
    doc.setFont('helvetica', 'normal');
    entries.forEach(([usage, color]) => {
      const m = /^#?([0-9a-f]{6})$/i.exec(color || '');
      if (m) {
        const n = parseInt(m[1], 16);
        doc.setFillColor((n >> 16) & 255, (n >> 8) & 255, n & 255);
      } else {
        doc.setFillColor(34, 197, 94);
      }
      doc.rect(lgX, lgY, 3, 3, 'F');
      doc.setTextColor(40, 40, 40);
      doc.text(usage, lgX + 4.5, lgY + 2.4);
      lgY += 4;
    });
  }

  let yTable = Math.max(yInfo + 4, planY + planH + 6);
  if (yTable > pageHeight - 50) { doc.addPage(); yTable = 20; }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 50, 100);
  doc.text('Récapitulatif des lots', 12, yTable);
  yTable += 4;

  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(0, 100, 200);
  const cols = [
    { label: 'N° Lot', x: 12, w: 18 },
    { label: 'Surface (m²)', x: 30, w: 28 },
    { label: 'Périmètre (m)', x: 58, w: 28 },
    { label: 'Usage', x: 86, w: 50 },
    { label: 'Propriétaire', x: 136, w: 80 },
  ];
  doc.rect(12, yTable, pageWidth - 24, 6, 'F');
  cols.forEach(c => doc.text(c.label, c.x + 1, yTable + 4));
  yTable += 6;

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  lots.forEach((lot, i) => {
    if (yTable > pageHeight - 30) { doc.addPage(); yTable = 20; }
    if (i % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(12, yTable, pageWidth - 24, 5.5, 'F');
    }
    doc.text(String(lot.lotNumber || i + 1), cols[0].x + 1, yTable + 4);
    doc.text(String(Number(lot.areaSqm || 0).toFixed(2)), cols[1].x + 1, yTable + 4);
    doc.text(String(Number(lot.perimeterM || 0).toFixed(2)), cols[2].x + 1, yTable + 4);
    doc.text(String(lot.intendedUse || '—').slice(0, 30), cols[3].x + 1, yTable + 4);
    doc.text(String(lot.ownerName || '—').slice(0, 50), cols[4].x + 1, yTable + 4);
    yTable += 5.5;
  });

  // ===== Footer avec QR code de vérification =====
  // Création du code (best-effort — si échec, on met un QR vers la home /verify)
  let verifyUrl = `${window.location.origin}/verify`;
  try {
    const v = await createDocumentVerification({
      documentType: 'subdivision_plan' as any,
      parcelNumber: req.parcel_number,
      clientName: `${req.requester_last_name || ''} ${req.requester_first_name || ''}`.trim() || null,
      metadata: {
        subdivision_request_id: req.id,
        reference_number: req.reference_number,
        number_of_lots: req.number_of_lots,
      },
    });
    if (v?.verifyUrl) verifyUrl = v.verifyUrl;
  } catch (e) {
    console.warn('Verification creation failed, using fallback URL', e);
  }

  const qrImg = await QRCode.toDataURL(verifyUrl, { width: 200, margin: 1 });
  const qrSize = 22;
  const qrX = pageWidth - qrSize - 12;
  const qrY = pageHeight - qrSize - 12;
  doc.addImage(qrImg, 'PNG', qrX, qrY, qrSize, qrSize);

  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.text('Scannez pour vérifier', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
  doc.setFontSize(6);
  doc.text(verifyUrl, qrX + qrSize / 2, qrY + qrSize + 6, { align: 'center' });

  // Texte légal (gauche du footer)
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'italic');
  const footerText = [
    `Document officiel généré le ${new Date().toLocaleString('fr-FR')}.`,
    'Ce plan de lotissement est authentifiable via le QR code ci-contre.',
    'Toute reproduction ou falsification est passible de poursuites judiciaires.',
  ];
  footerText.forEach((t, i) => doc.text(t, 12, pageHeight - 18 + i * 3));

  return doc.output('blob');
}
