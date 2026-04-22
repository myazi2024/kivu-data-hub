// Edge function: subdivision-request
// Creates a subdivision_requests row securely with SERVICE_ROLE.
// Server is the source of truth for: reference_number, submission_fee_usd, total_amount_usd, status.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildMetricFrame,
  aggregateAuxiliaryMetrics,
  computeSubdivisionFee,
} from "../_shared/subdivisionFees.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SubdivisionRequestBody {
  parcel_number: string;
  parcel_id?: string | null;
  /** 'urban' | 'rural' — explicit, computed client-side. Falls back to inference. */
  section_type?: 'urban' | 'rural';
  parent_parcel: {
    areaSqm: number;
    location: string;
    ownerName: string;
    titleReference: string;
    gpsCoordinates: { lat: number; lng: number }[];
    quartier?: string | null;
    village?: string | null;
  };
  requester: {
    firstName: string;
    lastName: string;
    middleName?: string | null;
    phone: string;
    email?: string | null;
    type: string;
    // Identité enrichie (alignée sur le bloc « Propriétaire actuel » du formulaire CCC)
    legalStatus?: string | null;
    gender?: string | null;
    entityType?: string | null;
    entitySubType?: string | null;
    entitySubTypeOther?: string | null;
    rccmNumber?: string | null;
    rightType?: string | null;
    stateExploitedBy?: string | null;
    nationality?: string | null;
  };
  lots: any[];
  roads: any[];
  commonSpaces: any[];
  servitudes: any[];
  planElements: any;
  purpose: string;
  documents: {
    /** Storage path inside the private `cadastral-documents` bucket. */
    requester_id_document_url?: string | null;
    proof_of_ownership_url?: string | null;
    subdivision_sketch_url?: string | null;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authentication required");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid authentication token");

    const body: SubdivisionRequestBody = await req.json();

    // Basic validation
    if (!body.parcel_number) throw new Error("parcel_number is required");
    if (!body.parent_parcel?.areaSqm) throw new Error("parent_parcel.areaSqm is required");
    if (!Array.isArray(body.lots) || body.lots.length < 2) throw new Error("At least 2 lots are required");
    if (!body.requester?.firstName || !body.requester?.lastName || !body.requester?.phone) {
      throw new Error("Requester name and phone are required");
    }
    if (!body.documents?.requester_id_document_url || !body.documents?.proof_of_ownership_url) {
      throw new Error("CNI demandeur et preuve de propriété sont obligatoires");
    }
    if (!body.purpose) throw new Error("purpose is required");

    // === SERVER-SIDE FEE COMPUTATION (source of truth) ===
    // Prefer explicit section_type from client; fall back to quartier vs village inference.
    const sectionType: 'urban' | 'rural' = body.section_type
      ?? (body.parent_parcel?.quartier ? 'urban' : (body.parent_parcel?.village ? 'rural' : 'urban'));

    // Fetch matching rate
    const { data: rates } = await supabase
      .from("subdivision_rate_config")
      .select("*")
      .eq("section_type", sectionType)
      .eq("is_active", true);

    const ratesData = (rates as any[]) || [];
    const fallbackRate = ratesData.find((r) => r.location_name === "*");
    const rate = fallbackRate || ratesData[0];

    let totalFee = 0;
    if (rate) {
      const ratePerSqm = Number(rate.rate_per_sqm_usd);
      const minPerLot = rate.min_fee_per_lot_usd != null ? Number(rate.min_fee_per_lot_usd) : 0;
      const maxPerLot = rate.max_fee_per_lot_usd != null ? Number(rate.max_fee_per_lot_usd) : Infinity;
      for (const lot of body.lots) {
        const area = Number(lot.areaSqm) || 0;
        const raw = area * ratePerSqm;
        totalFee += Math.max(minPerLot, Math.min(raw, maxPerLot));
      }
      totalFee = Math.round(totalFee * 100) / 100;
    } else {
      // Safe fallback: 10$ per lot minimum
      totalFee = body.lots.length * 10;
    }

    if (totalFee <= 0) throw new Error("Computed fee must be positive");

    // === Generate reference_number atomically ===
    const year = new Date().getFullYear();
    const tempId = crypto.randomUUID();
    const refNum = `LOT-${year}-${tempId.substring(0, 8).toUpperCase()}`;

    // === Insert with SERVICE_ROLE — server-controlled fields ===
    const insertPayload = {
      user_id: user.id,
      parcel_id: body.parcel_id || null,
      parcel_number: body.parcel_number,
      reference_number: refNum,
      parent_parcel_area_sqm: body.parent_parcel.areaSqm,
      parent_parcel_location: body.parent_parcel.location,
      parent_parcel_owner_name: body.parent_parcel.ownerName,
      parent_parcel_title_reference: body.parent_parcel.titleReference,
      parent_parcel_gps_coordinates: body.parent_parcel.gpsCoordinates,
      requester_first_name: body.requester.firstName,
      requester_last_name: body.requester.lastName,
      requester_middle_name: body.requester.middleName || null,
      requester_phone: body.requester.phone,
      requester_email: body.requester.email || null,
      requester_type: body.requester.type,
      // Identité enrichie
      requester_legal_status: body.requester.legalStatus || null,
      requester_gender: body.requester.gender || null,
      requester_entity_type: body.requester.entityType || null,
      requester_entity_subtype: body.requester.entitySubType || null,
      requester_rccm_number: body.requester.rccmNumber || null,
      requester_right_type: body.requester.rightType || null,
      requester_state_exploited_by: body.requester.stateExploitedBy || null,
      requester_nationality: body.requester.nationality || null,
      number_of_lots: body.lots.length,
      lots_data: body.lots,
      subdivision_plan_data: {
        lots: body.lots,
        roads: body.roads,
        commonSpaces: body.commonSpaces,
        servitudes: body.servitudes,
        planElements: body.planElements,
      },
      purpose_of_subdivision: body.purpose,
      submission_fee_usd: totalFee,
      total_amount_usd: totalFee,
      status: "pending",
      submission_payment_status: "pending",
      requester_id_document_url: body.documents.requester_id_document_url,
      proof_of_ownership_url: body.documents.proof_of_ownership_url,
      subdivision_sketch_url: body.documents.subdivision_sketch_url || null,
    };

    const { data, error } = await supabase
      .from("subdivision_requests")
      .insert(insertPayload as any)
      .select("id, reference_number, total_amount_usd, submission_fee_usd")
      .single();

    if (error) throw error;

    // Notification (best-effort, non-blocking)
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "info",
      title: "Demande de lotissement créée",
      message: `Votre demande ${refNum} est en attente de paiement (${totalFee.toFixed(2)} USD).`,
      action_url: "/user-dashboard?tab=subdivisions",
    }).then(() => null).catch(() => null);

    return new Response(JSON.stringify({
      id: data.id,
      reference_number: data.reference_number,
      total_amount_usd: data.total_amount_usd,
      submission_fee_usd: data.submission_fee_usd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("subdivision-request error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
