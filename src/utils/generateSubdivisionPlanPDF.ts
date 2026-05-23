import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { fetchAppLogo } from '@/utils/pdfLogoHelper';
import { createDocumentVerification } from '@/lib/documentVerification';
import { supabase } from '@/integrations/supabase/client';
import { getSubdivisionPlanElementsAsync } from '@/hooks/useSubdivisionPlanElements';
import { resolveSubdivisionPlanContext, type SignatureFrame } from '@/utils/subdivisionPlanContext';
import { computeNormalizedScale, formatScale } from '@/utils/subdivisionPlanScale';
import { fetchLegendSymbols, deriveLegend, type LegendItem } from '@/utils/subdivisionPlanLegend';

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

export type PlanLifecycleState = 'draft' | 'test' | 'sample' | 'final';

interface GenerateOptions {
  /** Marque le document comme aperçu (filigrane « APERÇU »). @deprecated utiliser `state`. */
  preview?: boolean;
  /** Marque la version officielle (numéro de version dans le footer). */
  officialVersion?: number | null;
  /** État du document : draft (BROUILLON), test (TEST), sample (SAMPLE), final (sans filigrane). */
  state?: PlanLifecycleState;
}

interface PlanConfigBundle {
  header: any;
  watermarks: any;
  paper_format: any;
  scale_tiers: any;
  report_program: any;
  footer_text: any;
}

async function loadPlanConfig(): Promise<PlanConfigBundle> {
  try {
    const { data } = await (supabase as any)
      .from('app_subdivision_plan_config')
      .select('config_key, config_value');
    const map: any = {};
    (data || []).forEach((r: any) => { map[r.config_key] = r.config_value; });
    return map as PlanConfigBundle;
  } catch {
    return {} as PlanConfigBundle;
  }
}

async function loadDynamicFrames(
  parcelCtx: { isUrban: boolean; province?: string | null },
): Promise<SignatureFrame[]> {
  try {
    const { data } = await (supabase as any)
      .from('subdivision_signature_frames')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true });
    const rows = (data || []) as any[];
    const applies = parcelCtx.isUrban ? 'urban' : 'rural';
    const filtered = rows.filter(r => {
      if (r.applies_to !== 'both' && r.applies_to !== applies) return false;
      const pf: string[] = r.province_filter || [];
      if (pf.length && parcelCtx.province && !pf.includes(parcelCtx.province)) return false;
      return true;
    });
    return filtered.map(r => ({ title: r.title_template || r.name, authority: r.authority }));
  } catch {
    return [];
  }
}

/**
 * Génère le plan de lotissement HD imprimable jusqu'à 10×10 m.
 *
 * - Format vectoriel pur (jsPDF lignes/textes), agrandissable sans pixellisation.
 * - Page dimensionnée selon le **ratio bbox** (lots + voies + parcelle-mère),
 *   base 1000 mm bornée à [600, 1400] mm pour rester gérable.
 * - 3 cadres de signature dont les libellés sont **dynamiques urbain/rural**.
 * - Filigrane diagonal « PLAN OFFICIEL — {ref} » répété (vectoriel, opacité faible).
 * - QR + code de vérification via `createDocumentVerification`.
 */
export async function generateSubdivisionPlanPDF(
  req: SubdivisionPlanData,
  opts: GenerateOptions = {},
): Promise<Blob> {
  const planElements = await getSubdivisionPlanElementsAsync();
  const activeRequiredKeys = new Set(
    planElements.filter(e => e.is_active && e.is_required).map(e => e.element_key),
  );
  const has = (key: string) => activeRequiredKeys.has(key);

  // Données lots / voies
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

  // BBox global pour ratio de page
  const allPts: { x: number; y: number }[] = [];
  lots.forEach(l => Array.isArray(l.vertices) && l.vertices.forEach((p: any) => {
    if (typeof p?.x === 'number' && typeof p?.y === 'number') allPts.push(p);
  }));
  roads.forEach(r => Array.isArray(r.path) && r.path.forEach((p: any) => {
    if (typeof p?.x === 'number' && typeof p?.y === 'number') allPts.push(p);
  }));

  let bboxRatio = 1.41; // défaut A3 paysage si pas de géom
  if (allPts.length >= 3) {
    const minX = Math.min(...allPts.map(p => p.x));
    const maxX = Math.max(...allPts.map(p => p.x));
    const minY = Math.min(...allPts.map(p => p.y));
    const maxY = Math.max(...allPts.map(p => p.y));
    const dx = Math.max(0.0001, maxX - minX);
    const dy = Math.max(0.0001, maxY - minY);
    bboxRatio = dx / dy;
  }
  // Base 1000mm — borne hauteur dans [600, 1400]
  const BASE = 1000;
  let pageW = BASE;
  let pageH = BASE / bboxRatio;
  if (pageH < 600) { pageH = 600; pageW = pageH * bboxRatio; }
  if (pageH > 1400) { pageH = 1400; pageW = pageH * bboxRatio; }
  if (pageW < 600) { pageW = 600; pageH = pageW / bboxRatio; }
  if (pageW > 1400) { pageW = 1400; pageH = pageW / bboxRatio; }

  const doc = new jsPDF({ orientation: pageW >= pageH ? 'landscape' : 'portrait', unit: 'mm', format: [pageW, pageH] });

  // Échelle relative — base spatiale 1000mm pour calcul des marges/typo
  const S = Math.min(pageW, pageH) / 600; // facteur d'échelle global (typo, lignes)
  const mm = (v: number) => v * S;

  // Charge config + état
  const config = await loadPlanConfig();
  const state: PlanLifecycleState = opts.state
    ?? (opts.preview ? 'sample' : (opts.officialVersion ? 'final' : 'draft'));

  // Bordure
  doc.setLineWidth(mm(1));
  doc.setDrawColor(0, 100, 200);
  doc.rect(mm(8), mm(8), pageW - mm(16), pageH - mm(16));

  // === Filigrane d'état (BROUILLON/TEST/SAMPLE — rien pour final) ===
  await drawStateWatermark(doc, pageW, pageH, state, config.watermarks, req.reference_number, S);

  // === En-tête ===
  const logo = await fetchAppLogo();
  if (logo) {
    try { doc.addImage(logo, 'PNG', mm(12), mm(11), mm(14), mm(14)); } catch { /* ignore */ }
  }
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 50, 100);
  doc.setFontSize(16 * S);
  doc.text('RÉPUBLIQUE DÉMOCRATIQUE DU CONGO', pageW / 2, mm(16), { align: 'center' });
  doc.setFontSize(11 * S);
  doc.text("BUREAU D'INFORMATION CADASTRALE", pageW / 2, mm(22), { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9 * S);
  doc.setTextColor(80, 80, 80);
  doc.text("Direction de l'Aménagement et de l'Urbanisme", pageW / 2, mm(27), { align: 'center' });

  doc.setLineWidth(mm(0.4));
  doc.setDrawColor(0, 100, 200);
  doc.line(mm(12), mm(31), pageW - mm(12), mm(31));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15 * S);
  doc.setTextColor(180, 0, 0);
  doc.text('PLAN OFFICIEL DE LOTISSEMENT', pageW / 2, mm(39), { align: 'center' });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10 * S);
  doc.text(`Référence : ${req.reference_number}`, pageW / 2, mm(45), { align: 'center' });

  // === Bloc identification (gauche) ===
  let yInfo = mm(54);
  doc.setFontSize(9 * S);
  const labelW = mm(70);
  const label = (l: string, v: string | number | null | undefined, y: number) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${l} :`, mm(12), y);
    doc.setFont('helvetica', 'normal');
    const val = v === null || v === undefined || v === '' ? '—' : String(v);
    const lines = doc.splitTextToSize(val, labelW);
    doc.text(lines, mm(48), y);
    return y + lines.length * mm(4) + mm(1);
  };
  yInfo = label('Parcelle mère', req.parcel_number, yInfo);
  yInfo = label('Surface mère', req.parent_parcel_area_sqm ? `${req.parent_parcel_area_sqm} m²` : '—', yInfo);
  yInfo = label('Localisation', req.parent_parcel_location, yInfo);
  yInfo = label('Propriétaire', req.parent_parcel_owner_name, yInfo);
  yInfo = label('Demandeur', `${req.requester_last_name || ''} ${req.requester_first_name || ''}`.trim() || '—', yInfo);
  yInfo = label('Nombre de lots', req.number_of_lots, yInfo);
  yInfo = label("Date d'approbation", req.approved_at || req.reviewed_at
    ? new Date(req.approved_at || req.reviewed_at!).toLocaleDateString('fr-FR')
    : '—', yInfo);
  if (req.purpose_of_subdivision) yInfo = label('Objet', req.purpose_of_subdivision, yInfo);

  // === Schéma vectoriel (zone droite, occupant l'essentiel de la page) ===
  const planX = mm(130);
  const planY = mm(52);
  const planW = pageW - planX - mm(14);
  // Hauteur du schéma : on garde de la place pour table + 3 cadres signature en bas
  const reservedBottom = mm(60) + mm(60); // table + cadres signature
  const planH = Math.max(mm(80), pageH - planY - reservedBottom);

  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(mm(0.3));
  doc.rect(planX, planY, planW, planH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8 * S);
  doc.setTextColor(80, 80, 80);
  doc.text('Schéma du lotissement (vectoriel HD)', planX + planW / 2, planY - mm(1.5), { align: 'center' });

  if (allPts.length >= 3) {
    const minX = Math.min(...allPts.map(p => p.x));
    const maxX = Math.max(...allPts.map(p => p.x));
    const minY = Math.min(...allPts.map(p => p.y));
    const maxY = Math.max(...allPts.map(p => p.y));
    const dx = Math.max(0.0001, maxX - minX);
    const dy = Math.max(0.0001, maxY - minY);
    const pad = mm(4);
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

    doc.setLineWidth(mm(0.35));
    lots.forEach((lot) => {
      const verts: any[] = Array.isArray(lot.vertices) ? lot.vertices : [];
      if (verts.length < 3) return;
      const [r, g, b] = hexToRgb(lot.color || '#22c55e');
      doc.setFillColor(Math.min(255, r + 60), Math.min(255, g + 60), Math.min(255, b + 60));
      doc.setDrawColor(r, g, b);
      const projected = verts.map(project);
      const lines: [number, number][] = projected.slice(1).map((p, i) => [p.X - projected[i].X, p.Y - projected[i].Y]);
      (doc as any).lines(lines, projected[0].X, projected[0].Y, [1, 1], 'FD', true);
      const cx = projected.reduce((s, p) => s + p.X, 0) / projected.length;
      const cy = projected.reduce((s, p) => s + p.Y, 0) / projected.length;
      doc.setFontSize(7 * S);
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'bold');
      doc.text(String(lot.lotNumber || ''), cx, cy, { align: 'center' });
    });

    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(mm(0.7));
    roads.forEach((road) => {
      const path: any[] = Array.isArray(road.path) ? road.path : [];
      if (path.length < 2) return;
      const projected = path.map(project);
      for (let i = 1; i < projected.length; i++) {
        doc.line(projected[i - 1].X, projected[i - 1].Y, projected[i].X, projected[i].Y);
      }
    });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9 * S);
    doc.setTextColor(150, 150, 150);
    doc.text('Schéma non disponible', planX + planW / 2, planY + planH / 2, { align: 'center' });
  }

  // Flèche du Nord
  if (has('north_arrow')) {
    const nx = planX + planW - mm(8);
    const ny = planY + mm(8);
    doc.setDrawColor(40, 40, 40);
    doc.setFillColor(40, 40, 40);
    doc.setLineWidth(mm(0.4));
    doc.triangle(nx, ny - mm(5), nx - mm(2.5), ny + mm(2), nx + mm(2.5), ny + mm(2), 'F');
    doc.line(nx, ny + mm(2), nx, ny + mm(6));
    doc.setFontSize(7 * S);
    doc.setFont('helvetica', 'bold');
    doc.text('N', nx, ny - mm(6), { align: 'center' });
  }

  // Échelle graphique en mètres réels (calculée d'après surface mère)
  if (has('echelle_graphique') && req.parent_parcel_area_sqm) {
    const sx = planX + mm(4);
    const sy = planY + planH - mm(5);
    const segMm = mm(8);
    // Taille indicative : si parcelle 10 000 m² ~ 100m de côté, 1 segment ≈ 25m
    const realM = Math.round(Math.sqrt(req.parent_parcel_area_sqm) / 4);
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(mm(0.4));
    for (let i = 0; i < 4; i++) {
      if (i % 2 === 0) {
        doc.setFillColor(40, 40, 40);
        doc.rect(sx + i * segMm, sy, segMm, mm(1.5), 'F');
      } else {
        doc.setFillColor(255, 255, 255);
        doc.rect(sx + i * segMm, sy, segMm, mm(1.5), 'FD');
      }
    }
    doc.setFontSize(6 * S);
    doc.setTextColor(40, 40, 40);
    doc.text('0', sx, sy + mm(4));
    doc.text(`${realM * 4} m env.`, sx + segMm * 4 + mm(1), sy + mm(1.2));
  }

  // === Tableau récapitulatif des lots (sous le bloc info gauche) ===
  let yTable = Math.max(yInfo + mm(4), planY + planH + mm(6));
  const tableMaxY = pageH - mm(80); // garde 80mm bas pour cadres signature + footer
  if (yTable > tableMaxY) { doc.addPage(); yTable = mm(20); }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10 * S);
  doc.setTextColor(0, 50, 100);
  doc.text('Récapitulatif des lots', mm(12), yTable);
  yTable += mm(4);

  doc.setFontSize(8 * S);
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(0, 100, 200);
  const colWs = [18, 28, 28, 50, 80].map(mm);
  const colXs: number[] = [];
  let xc = mm(12);
  for (const w of colWs) { colXs.push(xc); xc += w; }
  const colLabels = ['N° Lot', 'Surface (m²)', 'Périmètre (m)', 'Usage', 'Propriétaire'];
  doc.rect(mm(12), yTable, pageW - mm(24), mm(6), 'F');
  colLabels.forEach((l, i) => doc.text(l, colXs[i] + mm(1), yTable + mm(4)));
  yTable += mm(6);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  lots.forEach((lot, i) => {
    if (yTable > tableMaxY) { doc.addPage(); yTable = mm(20); }
    if (i % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(mm(12), yTable, pageW - mm(24), mm(5.5), 'F');
    }
    doc.text(String(lot.lotNumber || i + 1), colXs[0] + mm(1), yTable + mm(4));
    doc.text(String(Number(lot.areaSqm || 0).toFixed(2)), colXs[1] + mm(1), yTable + mm(4));
    doc.text(String(Number(lot.perimeterM || 0).toFixed(2)), colXs[2] + mm(1), yTable + mm(4));
    doc.text(String(lot.intendedUse || '—').slice(0, 30), colXs[3] + mm(1), yTable + mm(4));
    doc.text(String(lot.ownerName || '—').slice(0, 50), colXs[4] + mm(1), yTable + mm(4));
    yTable += mm(5.5);
  });

  // === Cadres de signature dynamiques urbain/rural ===
  const ctx = await resolveSubdivisionPlanContext(req.parcel_number, req.parent_parcel_location);
  const sigY = pageH - mm(72);
  const sigH = mm(45);
  const sigGap = mm(4);
  const sigW = (pageW - mm(24) - sigGap * 2) / 3;
  ctx.frames.forEach((frame, idx) => {
    const x = mm(12) + idx * (sigW + sigGap);
    drawSignatureFrame(doc, x, sigY, sigW, sigH, frame, S);
  });

  // === Footer : QR + mentions légales + version ===
  let verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/verify`;
  try {
    const v = await createDocumentVerification({
      documentType: 'subdivision_plan' as any,
      parcelNumber: req.parcel_number,
      clientName: `${req.requester_last_name || ''} ${req.requester_first_name || ''}`.trim() || null,
      metadata: {
        subdivision_request_id: req.id,
        reference_number: req.reference_number,
        number_of_lots: req.number_of_lots,
        official_version: opts.officialVersion ?? null,
      },
    });
    if (v?.verifyUrl) verifyUrl = v.verifyUrl;
  } catch (e) {
    console.warn('Verification creation failed, using fallback URL', e);
  }

  const qrImg = await QRCode.toDataURL(verifyUrl, { width: 400, margin: 1 });
  const qrSize = mm(22);
  const qrX = pageW - qrSize - mm(12);
  const qrY = pageH - qrSize - mm(12);
  doc.addImage(qrImg, 'PNG', qrX, qrY, qrSize, qrSize);

  doc.setFontSize(7 * S);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.text('Scannez pour vérifier', qrX + qrSize / 2, qrY + qrSize + mm(3), { align: 'center' });
  doc.setFontSize(6 * S);
  doc.text(verifyUrl, qrX + qrSize / 2, qrY + qrSize + mm(6), { align: 'center' });

  doc.setFontSize(7 * S);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'italic');
  const versionLine = opts.officialVersion
    ? `Version officielle v${opts.officialVersion} — `
    : opts.preview ? 'APERÇU NON OFFICIEL — ' : '';
  const footerText = [
    `${versionLine}Document généré le ${new Date().toLocaleString('fr-FR')}.`,
    'Ce plan de lotissement est authentifiable via le QR code ci-contre.',
    'Toute reproduction ou falsification est passible de poursuites judiciaires.',
    `Format : ${pageW.toFixed(0)} × ${pageH.toFixed(0)} mm — vectoriel HD imprimable jusqu'à 10 m.`,
  ];
  footerText.forEach((t, i) => doc.text(t, mm(12), pageH - mm(20) + i * mm(3)));

  return doc.output('blob');
}

/** Cadre signature : titre + lignes Nom/Fonction/Date/Signature + emplacement sceau. */
function drawSignatureFrame(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  frame: SignatureFrame, S: number,
) {
  const mm = (v: number) => v * S;
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(mm(0.3));
  doc.rect(x, y, w, h);
  // Titre
  doc.setFillColor(240, 244, 250);
  doc.rect(x, y, w, mm(7), 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8 * S);
  doc.setTextColor(0, 50, 100);
  const titleLines = doc.splitTextToSize(frame.title, w - mm(2));
  doc.text(titleLines[0] || frame.title, x + w / 2, y + mm(4.5), { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7 * S);
  doc.setTextColor(80, 80, 80);
  doc.text(frame.authority, x + w / 2, y + mm(10), { align: 'center' });

  // Lignes Nom/Fonction/Date
  const fields = ['Nom :', 'Fonction :', 'Date :'];
  let fy = y + mm(15);
  doc.setFontSize(7 * S);
  doc.setTextColor(40, 40, 40);
  fields.forEach(f => {
    doc.text(f, x + mm(2), fy);
    doc.setLineWidth(mm(0.15));
    doc.setDrawColor(150, 150, 150);
    doc.line(x + mm(14), fy + mm(0.3), x + w - mm(2), fy + mm(0.3));
    fy += mm(5);
  });

  // Sceau (cercle pointillé) + Signature
  doc.setDrawColor(120, 120, 120);
  doc.setLineDashPattern([1, 1], 0);
  const sealR = mm(8);
  const sealCx = x + w - sealR - mm(3);
  const sealCy = y + h - sealR - mm(3);
  doc.circle(sealCx, sealCy, sealR);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(6 * S);
  doc.setTextColor(150, 150, 150);
  doc.text('Sceau', sealCx, sealCy + mm(0.5), { align: 'center' });

  // Zone signature
  doc.setFontSize(7 * S);
  doc.setTextColor(40, 40, 40);
  doc.text('Signature :', x + mm(2), y + h - mm(3));
  doc.setLineWidth(mm(0.15));
  doc.setDrawColor(150, 150, 150);
  doc.line(x + mm(16), y + h - mm(2.7), x + w - sealR * 2 - mm(8), y + h - mm(2.7));
}

/** Filigrane diagonal vectoriel (texte rouge clair, opacité réduite). */
async function drawWatermark(doc: jsPDF, pageW: number, pageH: number, text: string, S: number) {
  doc.saveGraphicsState();
  // @ts-expect-error : GState accepté par jspdf en runtime
  doc.setGState(new doc.GState({ opacity: 0.07 }));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(48 * S);
  doc.setTextColor(180, 0, 0);
  const step = 80 * S;
  for (let y = -step; y < pageH + step; y += step) {
    for (let x = -step; x < pageW + step; x += step * 2) {
      doc.text(text, x, y, { angle: -30 });
    }
  }
  doc.restoreGraphicsState();
}
