// Edge function: generate-subdivision-plan
//
// Génère le PLAN OFFICIEL d'un lotissement approuvé en PDF vectoriel HD,
// l'archive dans le bucket privé `subdivision-plans` et persiste son chemin
// dans `subdivision_requests.official_plan_path`.
//
// - Réservé à un admin/super_admin.
// - Incrémente `official_plan_version` à chaque (re)génération.
// - Crée une `document_verifications` (type `subdivision_plan`) côté serveur,
//   avec QR pointant vers `/verify/{code}`.
// - Format vectoriel pur dimensionné selon le ratio bbox (lots + voies),
//   base 1000 mm bornée à [600, 1400] mm → imprimable jusqu'à 10×10 m.
// - 3 cadres de signature dynamiques urbain (ville/commune) ou rural
//   (territoire/groupement).
// - Filigrane diagonal opacité ~7 %.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import jsPDF from "npm:jspdf@2.5.1";
import QRCode from "npm:qrcode@1.5.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body { request_id: string }

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

    // --- Charger demande + lots + parcelle géo ---
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

    // --- Contexte urbain/rural ---
    const { data: parcelGeo } = await supabase.from("cadastral_parcels")
      .select("commune, ville, territoire, groupement, province")
      .eq("parcel_number", request.parcel_number).maybeSingle();

    const ctx = buildContext(parcelGeo || {});

    // --- Version & verification code ---
    const newVersion = (Number(request.official_plan_version) || 0) + 1;
    const verifCode = `SP-${request.reference_number}-V${newVersion}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
    const verifyUrl = `${url.replace("//", "//").replace(/\/$/, "")}/verify/${verifCode}`;
    // Best path: use frontend origin if FRONTEND_URL set, else fall back to api URL.
    const frontendBase = Deno.env.get("FRONTEND_URL") || "";
    const finalVerifyUrl = frontendBase ? `${frontendBase.replace(/\/$/, "")}/verify/${verifCode}` : verifyUrl;

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

    // --- Générer PDF ---
    const pdfBlob = await buildPdf({ request, lots, roads, ctx, verifyUrl: finalVerifyUrl, version: newVersion });
    const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());

    // --- Upload bucket privé : {user_id}/{request_id}/plan-{ref}-v{n}.pdf ---
    const path = `${request.user_id}/${request.id}/plan-${request.reference_number}-v${newVersion}.pdf`;
    const { error: upErr } = await supabase.storage.from("subdivision-plans")
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    // --- Persister chemin + version ---
    await supabase.from("subdivision_requests").update({
      official_plan_path: path,
      official_plan_generated_at: new Date().toISOString(),
      official_plan_version: newVersion,
    }).eq("id", request.id);

    // --- Audit ---
    await supabase.from("request_admin_audit").insert({
      request_table: "subdivision_requests",
      request_id: request.id,
      action: "plan_generated",
      old_status: request.status,
      new_status: request.status,
      admin_id: user.id,
      payload: { version: newVersion, path },
    }).then(() => null).catch(() => null);

    // --- Notif user ---
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

interface Frame { title: string; authority: string }
function buildContext(p: any): { isUrban: boolean; frames: Frame[] } {
  const t = (v: any) => (typeof v === "string" ? v.trim() : "") || "";
  const commune = t(p.commune), ville = t(p.ville), territoire = t(p.territoire), groupement = t(p.groupement);
  const isUrban = !!(commune && ville);
  const f1: Frame = { title: "Certifié conforme au plan cadastral", authority: "Bureau d'Information Cadastrale" };
  const f2: Frame = isUrban
    ? { title: `Approuvé par la ville de ${ville}`, authority: "Hôtel de Ville" }
    : { title: `Approuvé par le Bureau de la Chefferie${groupement ? " " + groupement : ""}`, authority: "Chefferie" };
  const f3: Frame = isUrban
    ? { title: `Vu par le Bureau de la Commune${commune ? " de " + commune : ""}`, authority: "Bureau Communal" }
    : { title: `Vu par le Chef du Territoire${territoire ? " de " + territoire : ""}`, authority: "Administration du Territoire" };
  return { isUrban, frames: [f1, f2, f3] };
}

async function buildPdf(args: {
  request: any; lots: any[]; roads: any[]; ctx: { frames: Frame[] }; verifyUrl: string; version: number;
}): Promise<Blob> {
  const { request, lots, roads, ctx, verifyUrl, version } = args;

  // BBox pour ratio
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
  const BASE = 1000;
  let pageW = BASE, pageH = BASE / ratio;
  if (pageH < 600) { pageH = 600; pageW = pageH * ratio; }
  if (pageH > 1400) { pageH = 1400; pageW = pageH * ratio; }
  if (pageW < 600) { pageW = 600; pageH = pageW / ratio; }
  if (pageW > 1400) { pageW = 1400; pageH = pageW / ratio; }

  const doc = new jsPDF({ orientation: pageW >= pageH ? "landscape" : "portrait", unit: "mm", format: [pageW, pageH] });
  const S = Math.min(pageW, pageH) / 600;
  const mm = (v: number) => v * S;

  // Bordure
  doc.setLineWidth(mm(1)); doc.setDrawColor(0, 100, 200);
  doc.rect(mm(8), mm(8), pageW - mm(16), pageH - mm(16));

  // Filigrane
  drawWatermark(doc, pageW, pageH, `PLAN OFFICIEL — ${request.reference_number}`, S);

  // Header
  doc.setFont("helvetica", "bold"); doc.setTextColor(0, 50, 100);
  doc.setFontSize(16 * S); doc.text("RÉPUBLIQUE DÉMOCRATIQUE DU CONGO", pageW / 2, mm(16), { align: "center" });
  doc.setFontSize(11 * S); doc.text("BUREAU D'INFORMATION CADASTRALE", pageW / 2, mm(22), { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9 * S); doc.setTextColor(80, 80, 80);
  doc.text("Direction de l'Aménagement et de l'Urbanisme", pageW / 2, mm(27), { align: "center" });
  doc.setLineWidth(mm(0.4)); doc.setDrawColor(0, 100, 200);
  doc.line(mm(12), mm(31), pageW - mm(12), mm(31));
  doc.setFont("helvetica", "bold"); doc.setFontSize(15 * S); doc.setTextColor(180, 0, 0);
  doc.text("PLAN OFFICIEL DE LOTISSEMENT", pageW / 2, mm(39), { align: "center" });
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
    if (yT > tableMaxY) return; // tronqué pour rester sur la page
    if (i % 2 === 0) { doc.setFillColor(245, 245, 245); doc.rect(mm(12), yT, pageW - mm(24), mm(5.5), "F"); }
    doc.text(String(lot.lotNumber || i + 1), colXs[0] + mm(1), yT + mm(4));
    doc.text(String(Number(lot.areaSqm || 0).toFixed(2)), colXs[1] + mm(1), yT + mm(4));
    doc.text(String(Number(lot.perimeterM || 0).toFixed(2)), colXs[2] + mm(1), yT + mm(4));
    doc.text(String(lot.intendedUse || "—").slice(0, 30), colXs[3] + mm(1), yT + mm(4));
    doc.text(String(lot.ownerName || "—").slice(0, 50), colXs[4] + mm(1), yT + mm(4));
    yT += mm(5.5);
  });

  // 3 cadres signature
  const sigY = pageH - mm(72), sigH = mm(45), sigGap = mm(4);
  const sigW = (pageW - mm(24) - sigGap * 2) / 3;
  ctx.frames.forEach((frame, idx) => drawSignatureFrame(doc, mm(12) + idx * (sigW + sigGap), sigY, sigW, sigH, frame, S));

  // QR + footer
  const qrPng = await QRCode.toDataURL(verifyUrl, { width: 400, margin: 1 });
  const qrSize = mm(22);
  const qrX = pageW - qrSize - mm(12), qrY = pageH - qrSize - mm(12);
  doc.addImage(qrPng, "PNG", qrX, qrY, qrSize, qrSize);
  doc.setFontSize(7 * S); doc.setTextColor(80, 80, 80); doc.setFont("helvetica", "normal");
  doc.text("Scannez pour vérifier", qrX + qrSize / 2, qrY + qrSize + mm(3), { align: "center" });
  doc.setFontSize(6 * S); doc.text(verifyUrl, qrX + qrSize / 2, qrY + qrSize + mm(6), { align: "center" });

  doc.setFontSize(7 * S); doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "italic");
  const lines = [
    `Version officielle v${version} — Document généré le ${new Date().toLocaleString("fr-FR")}.`,
    "Ce plan de lotissement est authentifiable via le QR code ci-contre.",
    "Toute reproduction ou falsification est passible de poursuites judiciaires.",
    `Format : ${pageW.toFixed(0)} × ${pageH.toFixed(0)} mm — vectoriel HD imprimable jusqu'à 10 m.`,
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
  doc.text(frame.authority, x + w / 2, y + mm(10), { align: "center" });
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

function drawWatermark(doc: any, pageW: number, pageH: number, text: string, S: number) {
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.07 }));
  doc.setFont("helvetica", "bold"); doc.setFontSize(48 * S); doc.setTextColor(180, 0, 0);
  const step = 80 * S;
  for (let y = -step; y < pageH + step; y += step) {
    for (let x = -step; x < pageW + step; x += step * 2) {
      doc.text(text, x, y, { angle: -30 });
    }
  }
  doc.restoreGraphicsState();
}
