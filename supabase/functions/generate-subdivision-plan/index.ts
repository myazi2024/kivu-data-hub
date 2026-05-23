// Edge function: generate-subdivision-plan
//
// Génère le PLAN OFFICIEL d'un lotissement approuvé en PDF vectoriel HD,
// l'archive dans le bucket privé `subdivision-plans` et persiste son chemin
// dans `subdivision_requests.official_plan_path`.
//
// P1 — Consomme intégralement `configSnapshot` (app_subdivision_plan_config,
// subdivision_signature_frames, subdivision_legend_symbols) ; rien d'autre
// n'est codé en dur.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import jsPDF from "npm:jspdf@2.5.1";
import QRCode from "npm:qrcode@1.5.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body { request_id: string }

type Frame = { title: string; authority: string };
type LegendSymbolRow = { symbol_type: string; label: string; color?: string | null; active?: boolean };
type ConfigSnapshot = {
  config: Record<string, any>;
  signature_frames: any[];
  legend_symbols: LegendSymbolRow[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("Authentication required");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Invalid authentication token");

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles ?? []).some((r: any) => ["admin", "super_admin"].includes(r.role));
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    const body: Body = await req.json();
    if (!body.request_id) throw new Error("request_id required");

    const { data: request, error: rErr } = await supabase
      .from("subdivision_requests").select("*").eq("id", body.request_id).single();
    if (rErr || !request) throw new Error("Subdivision request not found");
    if (request.status !== "approved") throw new Error("Request must be approved");

    const { data: lotsDb } = await supabase.from("subdivision_lots")
      .select("lot_number, area_sqm, perimeter_m, intended_use, owner_name, plan_coordinates, color")
      .eq("subdivision_request_id", request.id);

    const lots = (lotsDb && lotsDb.length > 0)
      ? lotsDb.map((l: any) => ({
          lotNumber: l.lot_number, areaSqm: l.area_sqm, perimeterM: l.perimeter_m,
          intendedUse: l.intended_use, ownerName: l.owner_name,
          vertices: Array.isArray(l.plan_coordinates) ? l.plan_coordinates : [],
          color: l.color || "#22c55e",
        }))
      : (Array.isArray(request.lots_data) ? request.lots_data : []);

    const planData: any = request.subdivision_plan_data || {};
    const roads: any[] = Array.isArray(planData.roads) ? planData.roads : [];

    // Contexte urbain/rural pour filtrer les cadres
    const { data: parcelGeo } = await supabase.from("cadastral_parcels")
      .select("commune, ville, territoire, groupement, province")
      .eq("parcel_number", request.parcel_number).maybeSingle();
    const province = (parcelGeo?.province || "").trim() || null;
    const isUrban = !!((parcelGeo?.commune || "").trim() && (parcelGeo?.ville || "").trim());

    // Version & verification code
    const newVersion = (Number(request.official_plan_version) || 0) + 1;
    const randSuffix = crypto.randomUUID().slice(0, 8).toUpperCase();
    const verifCode = `SP-${request.reference_number}-V${newVersion}-${randSuffix}`;
    const frontendBase = (Deno.env.get("FRONTEND_URL") || req.headers.get("origin") || url).replace(/\/$/, "");
    const finalVerifyUrl = `${frontendBase}/verify/${verifCode}`;

    await supabase.from("document_verifications").insert({
      verification_code: verifCode,
      document_type: "subdivision_plan",
      parcel_number: request.parcel_number,
      client_name: `${request.requester_last_name || ""} ${request.requester_first_name || ""}`.trim() || null,
      user_id: request.user_id,
      metadata: {
        subdivision_request_id: request.id,
        reference_number: request.reference_number,
        number_of_lots: request.number_of_lots,
        official_version: newVersion,
      },
    });

    // Snapshot config complet
    const { data: cfgRows } = await supabase
      .from("app_subdivision_plan_config").select("config_key, config_value");
    const { data: framesRows } = await supabase
      .from("subdivision_signature_frames")
      .select("*").eq("active", true).order("display_order", { ascending: true });
    const { data: symbolsRows } = await supabase
      .from("subdivision_legend_symbols")
      .select("*").eq("active", true).order("display_order", { ascending: true });

    const configSnapshot: ConfigSnapshot = {
      config: (cfgRows || []).reduce((acc: any, r: any) => { acc[r.config_key] = r.config_value; return acc; }, {}),
      signature_frames: framesRows || [],
      legend_symbols: (symbolsRows || []) as LegendSymbolRow[],
    };

    // Cadres dynamiques (filtre urbain/rural + province)
    const frames = resolveFrames(configSnapshot.signature_frames, { isUrban, province });

    const pdfBlob = await buildPdf({
      request, lots, roads, frames, verifyUrl: finalVerifyUrl, version: newVersion,
      snapshot: configSnapshot,
    });
    const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());

    const path = `${request.user_id}/${request.id}/plan-${request.reference_number}-v${newVersion}.pdf`;
    const { error: upErr } = await supabase.storage.from("subdivision-plans")
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    await supabase.from("subdivision_requests").update({
      official_plan_path: path,
      official_plan_generated_at: new Date().toISOString(),
      official_plan_version: newVersion,
    }).eq("id", request.id);

    await supabase.from("subdivision_plan_versions").insert({
      subdivision_request_id: request.id,
      version_number: newVersion,
      official_version: newVersion,
      pdf_path: path,
      plan_data: planData,
      lots_data: lots,
      verification_code: verifCode,
      config_snapshot: { ...configSnapshot, generator: "generate-subdivision-plan@p1", snapshot_at: new Date().toISOString() },
      is_current: true,
      reason: "official_plan_generated",
      created_by: user.id,
    }).then(() => null).catch((e: any) => console.warn("plan_versions insert failed:", e?.message));

    await supabase.from("request_admin_audit").insert({
      request_table: "subdivision_requests",
      request_id: request.id,
      action: "plan_generated",
      old_status: request.status,
      new_status: request.status,
      admin_id: user.id,
      payload: { version: newVersion, path },
    }).then(() => null).catch(() => null);

    await supabase.from("notifications").insert({
      user_id: request.user_id,
      type: "success",
      title: "Plan officiel disponible",
      message: `Le plan officiel v${newVersion} de votre lotissement ${request.reference_number} est prêt à être téléchargé.`,
      action_url: "/user-dashboard?tab=subdivisions",
    }).then(() => null).catch(() => null);

    return new Response(JSON.stringify({ ok: true, path, version: newVersion, verification_code: verifCode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (e: any) {
    console.error("generate-subdivision-plan error:", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  }
});

// ---------- Helpers ----------

function resolveFrames(rows: any[], ctx: { isUrban: boolean; province: string | null }): Frame[] {
  const applies = ctx.isUrban ? "urban" : "rural";
  const filtered = (rows || []).filter((r: any) => {
    if (r.applies_to && r.applies_to !== "both" && r.applies_to !== applies) return false;
    const pf: string[] = r.province_filter || [];
    if (pf.length && ctx.province && !pf.includes(ctx.province)) return false;
    return true;
  });
  if (filtered.length) {
    return filtered.map((r: any) => ({ title: r.title_template || r.name, authority: r.authority || "" }));
  }
  // Fallback minimal si aucun cadre configuré
  return [
    { title: "Certifié conforme au plan cadastral", authority: "Bureau d'Information Cadastrale" },
    { title: ctx.isUrban ? "Approuvé par la Ville" : "Approuvé par la Chefferie", authority: ctx.isUrban ? "Hôtel de Ville" : "Chefferie" },
    { title: ctx.isUrban ? "Vu par le Bureau Communal" : "Vu par le Chef du Territoire", authority: ctx.isUrban ? "Bureau Communal" : "Administration du Territoire" },
  ];
}

// Échelle normalisée à partir des tiers de configuration
function normalizedScaleLabel(maxDimM: number, paperMm: number, tiers?: number[]): string {
  if (!maxDimM || !paperMm) return "";
  const defaultTiers = [200, 500, 1000, 2000, 5000, 10000];
  const t = (Array.isArray(tiers) && tiers.length ? tiers : defaultTiers).slice().sort((a, b) => a - b);
  const rawDenominator = (maxDimM * 1000) / paperMm;
  const tier = t.find((x) => x >= rawDenominator) || t[t.length - 1];
  return `1:${tier.toLocaleString("fr-FR")}`;
}

function deriveLegendItems(symbols: LegendSymbolRow[], presentTypes: string[]): { label: string; color: string }[] {
  const set = new Set(presentTypes);
  return (symbols || [])
    .filter((s) => s.active !== false && set.has(s.symbol_type))
    .map((s) => ({ label: s.label, color: s.color || "#666" }));
}

async function buildPdf(args: {
  request: any; lots: any[]; roads: any[]; frames: Frame[]; verifyUrl: string; version: number;
  snapshot: ConfigSnapshot;
}): Promise<Blob> {
  const { request, lots, roads, frames, verifyUrl, version, snapshot } = args;
  const cfg = snapshot.config || {};
  const hdr = cfg.header || {};
  const wmCfg = cfg.watermarks || {};
  const paper = cfg.paper_format || {};
  const scaleCfg = cfg.scale_tiers || {};
  const rp = cfg.report_program || {};
  const footerCustom = (cfg.footer_text?.text as string) || "Reproduction interdite — toute falsification est passible de poursuites judiciaires.";

  // BBox
  const allPts: { x: number; y: number }[] = [];
  lots.forEach((l: any) => Array.isArray(l.vertices) && l.vertices.forEach((p: any) => {
    if (typeof p?.x === "number" && typeof p?.y === "number") allPts.push(p);
  }));
  roads.forEach((r: any) => Array.isArray(r.path) && r.path.forEach((p: any) => {
    if (typeof p?.x === "number" && typeof p?.y === "number") allPts.push(p);
  }));

  let ratio = 1.41;
  if (allPts.length >= 3) {
    const minX = Math.min(...allPts.map(p => p.x)), maxX = Math.max(...allPts.map(p => p.x));
    const minY = Math.min(...allPts.map(p => p.y)), maxY = Math.max(...allPts.map(p => p.y));
    ratio = Math.max(0.0001, maxX - minX) / Math.max(0.0001, maxY - minY);
  }
  const BASE = Number(paper.base_mm) || 1000;
  const MIN = Number(paper.min_mm) || 600;
  const MAX = Number(paper.max_mm) || 1400;
  let pageW = BASE, pageH = BASE / ratio;
  if (pageH < MIN) { pageH = MIN; pageW = pageH * ratio; }
  if (pageH > MAX) { pageH = MAX; pageW = pageH * ratio; }
  if (pageW < MIN) { pageW = MIN; pageH = pageW / ratio; }
  if (pageW > MAX) { pageW = MAX; pageH = pageW / ratio; }

  const doc = new jsPDF({ orientation: pageW >= pageH ? "landscape" : "portrait", unit: "mm", format: [pageW, pageH] });
  const S = Math.min(pageW, pageH) / 600;
  const mm = (v: number) => v * S;

  // Bordure
  doc.setLineWidth(mm(1)); doc.setDrawColor(0, 100, 200);
  doc.rect(mm(8), mm(8), pageW - mm(16), pageH - mm(16));

  // Filigrane d'état (final = sample éphémère ? non, final = pas de filigrane,
  // mais "PLAN OFFICIEL — ref" reste apposé en filigrane léger)
  drawOfficialWatermark(doc, pageW, pageH, `PLAN OFFICIEL — ${request.reference_number}`, S, wmCfg.final);

  // Header (config-driven)
  const orgLine1 = hdr.org_line1 || "RÉPUBLIQUE DÉMOCRATIQUE DU CONGO";
  const orgLine2 = hdr.org_line2 || "BUREAU D'INFORMATION CADASTRALE";
  const orgLine3 = hdr.org_line3 || "Direction de l'Aménagement et de l'Urbanisme";
  const titleText = hdr.title || "PLAN OFFICIEL DE LOTISSEMENT";

  doc.setFont("helvetica", "bold"); doc.setTextColor(0, 50, 100);
  doc.setFontSize(16 * S); doc.text(orgLine1, pageW / 2, mm(16), { align: "center" });
  doc.setFontSize(11 * S); doc.text(orgLine2, pageW / 2, mm(22), { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9 * S); doc.setTextColor(80, 80, 80);
  doc.text(orgLine3, pageW / 2, mm(27), { align: "center" });
  doc.setLineWidth(mm(0.4)); doc.setDrawColor(0, 100, 200);
  doc.line(mm(12), mm(31), pageW - mm(12), mm(31));
  doc.setFont("helvetica", "bold"); doc.setFontSize(15 * S); doc.setTextColor(180, 0, 0);
  doc.text(titleText, pageW / 2, mm(39), { align: "center" });
  doc.setTextColor(0, 0, 0); doc.setFontSize(10 * S);
  doc.text(`Référence : ${request.reference_number}  —  Version officielle v${version}`, pageW / 2, mm(45), { align: "center" });

  // Identification gauche
  let yInfo = mm(54);
  doc.setFontSize(9 * S);
  const lab = (l: string, v: any, y: number) => {
    doc.setFont("helvetica", "bold"); doc.text(`${l} :`, mm(12), y);
    doc.setFont("helvetica", "normal");
    const val = (v === null || v === undefined || v === "") ? "—" : String(v);
    const lines = doc.splitTextToSize(val, mm(70));
    doc.text(lines, mm(48), y);
    return y + lines.length * mm(4) + mm(1);
  };
  yInfo = lab("Parcelle mère", request.parcel_number, yInfo);
  yInfo = lab("Surface mère", request.parent_parcel_area_sqm ? `${request.parent_parcel_area_sqm} m²` : "—", yInfo);
  yInfo = lab("Localisation", request.parent_parcel_location, yInfo);
  yInfo = lab("Propriétaire", request.parent_parcel_owner_name, yInfo);
  yInfo = lab("Demandeur", `${request.requester_last_name || ""} ${request.requester_first_name || ""}`.trim() || "—", yInfo);
  yInfo = lab("Nombre de lots", request.number_of_lots, yInfo);
  yInfo = lab("Approuvé le", request.approved_at ? new Date(request.approved_at).toLocaleDateString("fr-FR") : "—", yInfo);

  // Schéma
  const planX = mm(130), planY = mm(52);
  const planW = pageW - planX - mm(14);
  const planH = Math.max(mm(80), pageH - planY - mm(120));
  doc.setDrawColor(120, 120, 120); doc.setLineWidth(mm(0.3));
  doc.rect(planX, planY, planW, planH);
  doc.setFont("helvetica", "bold"); doc.setFontSize(8 * S); doc.setTextColor(80, 80, 80);
  doc.text("Schéma du lotissement (vectoriel HD)", planX + planW / 2, planY - mm(1.5), { align: "center" });

  if (allPts.length >= 3) {
    const minX = Math.min(...allPts.map(p => p.x)), maxX = Math.max(...allPts.map(p => p.x));
    const minY = Math.min(...allPts.map(p => p.y)), maxY = Math.max(...allPts.map(p => p.y));
    const dx = Math.max(0.0001, maxX - minX), dy = Math.max(0.0001, maxY - minY);
    const pad = mm(4);
    const scale = Math.min((planW - pad * 2) / dx, (planH - pad * 2) / dy);
    const offsetX = planX + (planW - dx * scale) / 2;
    const offsetY = planY + (planH - dy * scale) / 2;
    const project = (p: any) => ({ X: offsetX + (p.x - minX) * scale, Y: offsetY + (p.y - minY) * scale });
    const hexRgb = (hex: string): [number, number, number] => {
      const m = /^#?([0-9a-f]{6})$/i.exec(hex || ""); if (!m) return [200, 230, 200];
      const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    doc.setLineWidth(mm(0.35));
    lots.forEach((lot: any) => {
      const verts: any[] = Array.isArray(lot.vertices) ? lot.vertices : [];
      if (verts.length < 3) return;
      const [r, g, b] = hexRgb(lot.color || "#22c55e");
      doc.setFillColor(Math.min(255, r + 60), Math.min(255, g + 60), Math.min(255, b + 60));
      doc.setDrawColor(r, g, b);
      const proj = verts.map(project);
      const lines: [number, number][] = proj.slice(1).map((p: any, i: number) => [p.X - proj[i].X, p.Y - proj[i].Y]);
      (doc as any).lines(lines, proj[0].X, proj[0].Y, [1, 1], "FD", true);
      const cx = proj.reduce((s: number, p: any) => s + p.X, 0) / proj.length;
      const cy = proj.reduce((s: number, p: any) => s + p.Y, 0) / proj.length;
      doc.setFontSize(7 * S); doc.setTextColor(40, 40, 40); doc.setFont("helvetica", "bold");
      doc.text(String(lot.lotNumber || ""), cx, cy, { align: "center" });
    });
    doc.setDrawColor(80, 80, 80); doc.setLineWidth(mm(0.7));
    roads.forEach((road: any) => {
      const path: any[] = Array.isArray(road.path) ? road.path : [];
      if (path.length < 2) return;
      const proj = path.map(project);
      for (let i = 1; i < proj.length; i++) doc.line(proj[i - 1].X, proj[i - 1].Y, proj[i].X, proj[i].Y);
    });

    // Flèche du nord
    const nx = planX + planW - mm(8), ny = planY + mm(8);
    doc.setDrawColor(40, 40, 40); doc.setFillColor(40, 40, 40);
    doc.setLineWidth(mm(0.4));
    doc.triangle(nx, ny - mm(5), nx - mm(2.5), ny + mm(2), nx + mm(2.5), ny + mm(2), "F");
    doc.line(nx, ny + mm(2), nx, ny + mm(6));
    doc.setFontSize(7 * S); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 40, 40);
    doc.text("N", nx, ny - mm(6), { align: "center" });
  }

  // Tableau lots
  let yT = Math.max(yInfo + mm(4), planY + planH + mm(6));
  const tableMaxY = pageH - mm(80);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10 * S); doc.setTextColor(0, 50, 100);
  doc.text("Récapitulatif des lots", mm(12), yT); yT += mm(4);
  doc.setFontSize(8 * S); doc.setTextColor(255, 255, 255); doc.setFillColor(0, 100, 200);
  const colWs = [18, 28, 28, 50, 80].map(mm);
  const colXs: number[] = []; let xc = mm(12); for (const w of colWs) { colXs.push(xc); xc += w; }
  doc.rect(mm(12), yT, pageW - mm(24), mm(6), "F");
  ["N° Lot", "Surface (m²)", "Périmètre (m)", "Usage", "Propriétaire"].forEach((l, i) => doc.text(l, colXs[i] + mm(1), yT + mm(4)));
  yT += mm(6);
  doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal");
  lots.forEach((lot: any, i: number) => {
    if (yT > tableMaxY) return;
    if (i % 2 === 0) { doc.setFillColor(245, 245, 245); doc.rect(mm(12), yT, pageW - mm(24), mm(5.5), "F"); }
    doc.text(String(lot.lotNumber || i + 1), colXs[0] + mm(1), yT + mm(4));
    doc.text(String(Number(lot.areaSqm || 0).toFixed(2)), colXs[1] + mm(1), yT + mm(4));
    doc.text(String(Number(lot.perimeterM || 0).toFixed(2)), colXs[2] + mm(1), yT + mm(4));
    doc.text(String(lot.intendedUse || "—").slice(0, 30), colXs[3] + mm(1), yT + mm(4));
    doc.text(String(lot.ownerName || "—").slice(0, 50), colXs[4] + mm(1), yT + mm(4));
    yT += mm(5.5);
  });

  // Cadres signature (dynamiques)
  const sigY = pageH - mm(72), sigH = mm(45), sigGap = mm(4);
  const sigCount = Math.max(1, Math.min(frames.length, 5));
  const sigW = (pageW - mm(24) - sigGap * (sigCount - 1)) / sigCount;
  frames.slice(0, sigCount).forEach((frame, idx) =>
    drawSignatureFrame(doc, mm(12) + idx * (sigW + sigGap), sigY, sigW, sigH, frame, S),
  );

  // Légende auto (depuis subdivision_legend_symbols)
  const presentTypes: string[] = ["north_arrow", "echelle_graphique"];
  if (roads.length) presentTypes.push("road");
  if (lots.length) presentTypes.push("lot");
  const legend = deriveLegendItems(snapshot.legend_symbols, presentTypes).slice(0, 6);
  if (legend.length) drawLegendBox(doc, pageW - mm(80), sigY - mm(22), mm(68), mm(20), legend, S);

  // QR
  const qrPng = await QRCode.toDataURL(verifyUrl, { width: 400, margin: 1 });
  const qrSize = mm(22);
  const qrX = pageW - qrSize - mm(12), qrY = pageH - qrSize - mm(12);
  doc.addImage(qrPng, "PNG", qrX, qrY, qrSize, qrSize);
  doc.setFontSize(7 * S); doc.setTextColor(80, 80, 80); doc.setFont("helvetica", "normal");
  doc.text("Scannez pour vérifier", qrX + qrSize / 2, qrY + qrSize + mm(3), { align: "center" });
  doc.setFontSize(6 * S); doc.text(verifyUrl, qrX + qrSize / 2, qrY + qrSize + mm(6), { align: "center" });

  // Programme signalement (récompense) — config-driven
  if (rp?.active && rp?.whatsapp_number) {
    const reportText = (rp.report_text_template
      || "Si vous n'avez pas de résultat positif, signalez-le au {whatsapp_number}. Vous pouvez gagner une récompense financière jusqu'à {reward_amount} {currency}.")
      .replace("{whatsapp_number}", rp.whatsapp_number)
      .replace("{reward_amount}", String(rp.reward_amount ?? ""))
      .replace("{currency}", rp.reward_currency || "USD");
    doc.setFontSize(7 * S); doc.setTextColor(120, 30, 30); doc.setFont("helvetica", "italic");
    const wrapped = doc.splitTextToSize(reportText, qrSize + mm(50));
    doc.text(wrapped, qrX, qrY - mm(2), { align: "left" });
  }

  // Échelle normalisée
  let scaleLabel = "";
  if (allPts.length >= 3 && request.parent_parcel_area_sqm) {
    const maxDim = Math.sqrt(request.parent_parcel_area_sqm) * 1.2;
    const tiers = Array.isArray(scaleCfg.tiers) ? scaleCfg.tiers : undefined;
    scaleLabel = normalizedScaleLabel(maxDim, Math.min(pageW, pageH) - 40, tiers);
  }

  doc.setFontSize(7 * S); doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "italic");
  const lines = [
    `Version officielle v${version} — Document généré le ${new Date().toLocaleString("fr-FR")}.`,
    "Ce plan de lotissement est authentifiable via le QR code ci-contre.",
    footerCustom,
    `Format : ${pageW.toFixed(0)} × ${pageH.toFixed(0)} mm${scaleLabel ? ` — Échelle ${scaleLabel}` : ""} — vectoriel HD.`,
  ];
  lines.forEach((t, i) => doc.text(t, mm(12), pageH - mm(20) + i * mm(3)));

  return doc.output("blob");
}

function drawSignatureFrame(doc: any, x: number, y: number, w: number, h: number, frame: Frame, S: number) {
  const mm = (v: number) => v * S;
  doc.setDrawColor(60, 60, 60); doc.setLineWidth(mm(0.3)); doc.rect(x, y, w, h);
  doc.setFillColor(240, 244, 250); doc.rect(x, y, w, mm(7), "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8 * S); doc.setTextColor(0, 50, 100);
  const tlines = doc.splitTextToSize(frame.title, w - mm(2));
  doc.text(tlines[0] || frame.title, x + w / 2, y + mm(4.5), { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(7 * S); doc.setTextColor(80, 80, 80);
  doc.text(frame.authority || "", x + w / 2, y + mm(10), { align: "center" });
  let fy = y + mm(15);
  doc.setFontSize(7 * S); doc.setTextColor(40, 40, 40);
  for (const f of ["Nom :", "Fonction :", "Date :"]) {
    doc.text(f, x + mm(2), fy);
    doc.setLineWidth(mm(0.15)); doc.setDrawColor(150, 150, 150);
    doc.line(x + mm(14), fy + mm(0.3), x + w - mm(2), fy + mm(0.3));
    fy += mm(5);
  }
  doc.setDrawColor(120, 120, 120); doc.setLineDashPattern([1, 1], 0);
  const sealR = mm(8), sealCx = x + w - sealR - mm(3), sealCy = y + h - sealR - mm(3);
  doc.circle(sealCx, sealCy, sealR);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(6 * S); doc.setTextColor(150, 150, 150);
  doc.text("Sceau", sealCx, sealCy + mm(0.5), { align: "center" });
  doc.setFontSize(7 * S); doc.setTextColor(40, 40, 40);
  doc.text("Signature :", x + mm(2), y + h - mm(3));
  doc.setLineWidth(mm(0.15)); doc.setDrawColor(150, 150, 150);
  doc.line(x + mm(16), y + h - mm(2.7), x + w - sealR * 2 - mm(8), y + h - mm(2.7));
}

function drawLegendBox(doc: any, x: number, y: number, w: number, h: number, items: { label: string; color: string }[], S: number) {
  const mm = (v: number) => v * S;
  doc.setDrawColor(120, 120, 120); doc.setLineWidth(mm(0.3)); doc.rect(x, y, w, h);
  doc.setFillColor(245, 245, 250); doc.rect(x, y, w, mm(5), "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8 * S); doc.setTextColor(0, 50, 100);
  doc.text("Légende", x + w / 2, y + mm(3.5), { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(7 * S); doc.setTextColor(40, 40, 40);
  const rowH = mm(3.2);
  items.forEach((it, i) => {
    const ry = y + mm(6) + i * rowH;
    const m = /^#?([0-9a-f]{6})$/i.exec(it.color || "");
    const n = m ? parseInt(m[1], 16) : 0x666666;
    doc.setFillColor((n >> 16) & 255, (n >> 8) & 255, n & 255);
    doc.rect(x + mm(2), ry - mm(2), mm(3), mm(2), "F");
    doc.text(it.label, x + mm(7), ry - mm(0.5));
  });
}

function drawOfficialWatermark(doc: any, pageW: number, pageH: number, text: string, S: number, override?: any) {
  const opacity = typeof override?.opacity === "number" ? override.opacity : 0.07;
  const color: [number, number, number] = Array.isArray(override?.color) && override.color.length === 3
    ? override.color : [180, 0, 0];
  const customText = typeof override?.text === "string" && override.text ? override.text : text;

  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity }));
  doc.setFont("helvetica", "bold"); doc.setFontSize(48 * S); doc.setTextColor(color[0], color[1], color[2]);
  const step = 80 * S;
  for (let y = -step; y < pageH + step; y += step) {
    for (let x = -step; x < pageW + step; x += step * 2) {
      doc.text(customText, x, y, { angle: -30 });
    }
  }
  doc.restoreGraphicsState();
}
