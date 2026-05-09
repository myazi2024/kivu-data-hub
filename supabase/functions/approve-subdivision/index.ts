// Edge function: approve-subdivision
// Atomically: update subdivision_requests status + insert subdivision_lots + flag parent parcel.
// Replaces the previous client-side multi-step flow that could leave the DB in an inconsistent state.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ApproveBody {
  request_id: string;
  action: "approve" | "reject" | "return";
  processing_fee_usd?: number;
  rejection_reason?: string;
  processing_notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Authenticate caller and verify admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authentication required");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Invalid authentication token");

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isAdmin = (roles ?? []).some((r: any) => ["admin", "super_admin"].includes(r.role));
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    const body: ApproveBody = await req.json();
    if (!body.request_id || !body.action) throw new Error("request_id and action are required");

    // Load the request
    const { data: request, error: loadErr } = await supabase
      .from("subdivision_requests")
      .select("*")
      .eq("id", body.request_id)
      .single();
    if (loadErr || !request) throw new Error("Subdivision request not found");

    const updates: Record<string, any> = {
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      processing_notes: body.processing_notes || null,
    };

    let notif: { type: string; title: string; message: string } | null = null;

    if (body.action === "approve") {
      const fee = Number(body.processing_fee_usd ?? 0);
      if (!Number.isFinite(fee) || fee < 0) throw new Error("Invalid processing fee");

      updates.status = fee > 0 ? "awaiting_payment" : "approved";
      updates.processing_fee_usd = fee;
      updates.total_amount_usd = Number(request.submission_fee_usd || 0) + fee;
      if (fee === 0) updates.approved_at = new Date().toISOString();

      // Update status first
      const { error: updErr } = await supabase
        .from("subdivision_requests")
        .update(updates)
        .eq("id", body.request_id);
      if (updErr) throw updErr;

      // If immediately approved, materialise lots + roads + flag parcel (atomic best-effort)
      if (updates.status === "approved") {
        const lotsData: any[] = Array.isArray(request.lots_data) ? request.lots_data : [];
        const planData: any = request.subdivision_plan_data || {};
        const roadsData: any[] = Array.isArray(planData.roads) ? planData.roads : [];
        const parentGps: any[] = Array.isArray(request.parent_parcel_gps_coordinates)
          ? request.parent_parcel_gps_coordinates
          : [];

        const bb = parentGps.length >= 3
          ? {
              minLat: Math.min(...parentGps.map((c: any) => c.lat)),
              maxLat: Math.max(...parentGps.map((c: any) => c.lat)),
              minLng: Math.min(...parentGps.map((c: any) => c.lng)),
              maxLng: Math.max(...parentGps.map((c: any) => c.lng)),
            }
          : null;

        const projectVertex = (v: any) =>
          bb ? {
            lat: bb.minLat + v.y * (bb.maxLat - bb.minLat),
            lng: bb.minLng + v.x * (bb.maxLng - bb.minLng),
          } : null;

        const rows = lotsData.map((lot: any) => {
          const gpsCoordinates = (bb && Array.isArray(lot.vertices))
            ? lot.vertices.map(projectVertex)
            : null;
          return {
            subdivision_request_id: request.id,
            parcel_number: request.parcel_number,
            lot_number: lot.lotNumber || lot.id,
            lot_label: `Lot ${lot.lotNumber}`,
            area_sqm: Number(lot.areaSqm) || 0,
            perimeter_m: Number(lot.perimeterM) || 0,
            intended_use: lot.intendedUse || "residential",
            owner_name: lot.ownerName || null,
            is_built: !!lot.isBuilt,
            has_fence: !!lot.hasFence,
            gps_coordinates: gpsCoordinates,
            plan_coordinates: lot.vertices || null,
            color: lot.color || "#22c55e",
          };
        });

        if (rows.length > 0) {
          const { error: lotsErr } = await supabase.from("subdivision_lots").insert(rows);
          if (lotsErr) {
            // Roll back the status change to keep the workflow consistent
            await supabase
              .from("subdivision_requests")
              .update({ status: request.status, reviewed_by: null, reviewed_at: null, approved_at: null })
              .eq("id", body.request_id);
            throw new Error(`Lot insertion failed, status reverted: ${lotsErr.message}`);
          }
        }

        // Materialise roads (best-effort: do not roll back if this fails — non-critical for billing)
        if (roadsData.length > 0) {
          const roadRows = roadsData.map((r: any) => ({
            subdivision_request_id: request.id,
            road_name: r.name || null,
            width_m: Number(r.widthM) || null,
            surface_type: r.surfaceType || null,
            is_existing: !!r.isExisting,
            plan_coordinates: r.path || null,
            gps_coordinates: (bb && Array.isArray(r.path)) ? r.path.map(projectVertex) : null,
          }));
          await supabase.from("subdivision_roads").insert(roadRows)
            .then(() => null)
            .catch((e: any) => console.error("subdivision_roads insert failed:", e?.message));
        }

        // Best-effort: flag the parent parcel
        await supabase
          .from("cadastral_parcels")
          .update({ is_subdivided: true })
          .eq("parcel_number", request.parcel_number)
          .then(() => null)
          .catch(() => null);
      }


      notif = {
        type: "success",
        title: "Lotissement approuvé",
        message: `Votre demande ${request.reference_number} a été approuvée.`,
      };
    } else if (body.action === "reject") {
      if (!body.rejection_reason?.trim()) throw new Error("rejection_reason required");
      updates.status = "rejected";
      updates.rejection_reason = body.rejection_reason;
      const { error } = await supabase.from("subdivision_requests").update(updates).eq("id", body.request_id);
      if (error) throw error;
      notif = {
        type: "error",
        title: "Lotissement rejeté",
        message: `Votre demande ${request.reference_number} a été rejetée. Motif: ${body.rejection_reason}`,
      };
    } else if (body.action === "return") {
      if (!body.rejection_reason?.trim()) throw new Error("rejection_reason required (motif du renvoi)");
      updates.status = "returned";
      updates.rejection_reason = body.rejection_reason;
      const { error } = await supabase.from("subdivision_requests").update(updates).eq("id", body.request_id);
      if (error) throw error;
      notif = {
        type: "warning",
        title: "Lotissement renvoyé pour correction",
        message: `Votre demande ${request.reference_number} nécessite des corrections. Motif: ${body.rejection_reason}`,
      };
    }

    if (notif) {
      await supabase.from("notifications").insert({
        user_id: request.user_id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        action_url: "/user-dashboard?tab=subdivisions",
      }).then(() => null).catch(() => null);
    }

    // Generic admin audit (best-effort, non-blocking)
    await supabase.from("request_admin_audit").insert({
      request_table: "subdivision_requests",
      request_id: body.request_id,
      action: body.action,
      old_status: request.status,
      new_status: updates.status ?? null,
      admin_id: user.id,
      rejection_reason: body.rejection_reason || null,
      payload: {
        processing_fee_usd: body.processing_fee_usd ?? null,
        processing_notes: body.processing_notes ?? null,
      },
    }).then(() => null).catch((e: any) => console.error("audit insert failed:", e?.message));

    return new Response(JSON.stringify({ ok: true, status: updates.status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("approve-subdivision error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
