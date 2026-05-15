// Edge function: subdivision-request
// Creates a subdivision_requests row securely with SERVICE_ROLE.
// Server is the source of truth for: reference_number, submission_fee_usd, total_amount_usd, status.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildMetricFrame,
  aggregateAuxiliaryMetrics,
  computeSubdivisionFee,
  polygonAreaSqm,
} from "../_shared/subdivisionFees.ts";
import { inferSectionType } from "../_shared/sectionType.ts";

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
    // Cascade géographique (pour matching règle de zonage)
    province?: string | null;
    ville?: string | null;
    commune?: string | null;
    quartier?: string | null;
    avenue?: string | null;
    territoire?: string | null;
    collectivite?: string | null;
    groupement?: string | null;
    village?: string | null;
    propertyTitleType?: string | null;
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
    [k: string]: string | null | undefined;
  };
  /** Lot E — infrastructures sélectionnées par l'utilisateur (key -> quantité). */
  selected_infrastructures?: Record<string, number>;
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

    // === IDEMPOTENCE — short-circuit on retry ===
    const idempotencyKey =
      req.headers.get("Idempotency-Key") ||
      req.headers.get("x-idempotency-key") ||
      null;
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from("subdivision_requests")
        .select("id, reference_number, total_amount_usd, submission_fee_usd")
        .eq("user_id", user.id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({
          id: existing.id,
          reference_number: existing.reference_number,
          total_amount_usd: existing.total_amount_usd,
          submission_fee_usd: existing.submission_fee_usd,
          idempotent_replay: true,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
      }
    }

    // === OWNERSHIP CHECK — owner-type requesters must have an approved CCC contribution ===
    if ((body.requester.type || "").toLowerCase() === "owner") {
      const { data: canSubdivide, error: ownErr } = await supabase
        .rpc("can_subdivide_parcel", { p_parcel_number: body.parcel_number, p_user_id: user.id });
      if (ownErr) console.error("ownership rpc error", ownErr);
      if (!canSubdivide) {
        return new Response(JSON.stringify({
          error: "OWNERSHIP_REQUIRED",
          message:
            "Vous devez disposer d'une contribution cadastrale approuvée sur cette parcelle pour la lotir en tant que propriétaire. Soumettez d'abord la fiche CCC, ou choisissez une autre qualité (mandataire, notaire, etc.) avec pièce justificative.",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 });
      }
    }

    // === SERVER-SIDE FEE COMPUTATION (source of truth) ===
    // Section type via shared helper (mirrored on the client).
    const sectionType: 'urban' | 'rural' = body.section_type ?? inferSectionType(body.parent_parcel);

    // === SERVER-SIDE PARENT PARCEL ELIGIBILITY (zoning rule) ===
    // Verrou: surface min/max parcelle-mère définis dans subdivision_zoning_rules.
    {
      const geo = body.parent_parcel;
      const candidates = (sectionType === 'urban'
        ? [geo.avenue, geo.quartier, geo.commune, geo.ville, geo.province]
        : [geo.village, geo.groupement, geo.collectivite, geo.territoire, geo.province])
        .map((v) => (v || '').trim()).filter(Boolean);
      candidates.push('*');
      const { data: zoningRules } = await supabase
        .from('subdivision_zoning_rules')
        .select('*')
        .eq('is_active', true)
        .eq('section_type', sectionType)
        .in('location_name', candidates);
      const rows = (zoningRules as any[]) || [];
      const matchedName = candidates.find((c) => rows.some((r) => r.location_name === c));
      const matched = matchedName ? rows.find((r) => r.location_name === matchedName) : null;
      if (matched) {
        const area = Number(body.parent_parcel.areaSqm) || 0;
        const minA = Number(matched.parent_min_area_sqm) || 0;
        const maxA = matched.parent_max_area_sqm != null ? Number(matched.parent_max_area_sqm) : null;
        if (minA > 0 && area < minA) {
          return new Response(JSON.stringify({
            error: 'PARENT_AREA_OUT_OF_RANGE',
            reason: 'too_small',
            min: minA, max: maxA, actual: area,
            message: `Surface parcelle-mère ${Math.round(area)} m² < minimum ${minA} m² requis pour cette zone.`,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422 });
        }
        if (maxA && area > maxA) {
          return new Response(JSON.stringify({
            error: 'PARENT_AREA_OUT_OF_RANGE',
            reason: 'too_large',
            min: minA, max: maxA, actual: area,
            message: `Surface parcelle-mère ${Math.round(area)} m² > maximum ${maxA} m² ; procédure d'aménagement requise.`,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422 });
        }

        // === Per-road infrastructure constraints ===
        const roads = Array.isArray(body.roads) ? body.roads : [];
        const errs: string[] = [];
        const sideOk = (req: string | undefined, got: string | undefined) =>
          !req || req === 'any' || !got || req === got;

        if (matched.require_drainage_canal) {
          for (const r of roads) {
            const name = r?.name || 'Voie';
            const dc = r?.drainageCanal;
            if (!dc) { errs.push(`Canal d'évacuation manquant sur ${name}.`); continue; }
            if (matched.drainage_canal_min_width_m && Number(dc.widthM || 0) < Number(matched.drainage_canal_min_width_m))
              errs.push(`${name} : largeur canal ${dc.widthM} m < min ${matched.drainage_canal_min_width_m} m.`);
            if (matched.drainage_canal_min_depth_m && Number(dc.depthM || 0) < Number(matched.drainage_canal_min_depth_m))
              errs.push(`${name} : profondeur canal ${dc.depthM} m < min ${matched.drainage_canal_min_depth_m} m.`);
            if (Array.isArray(matched.drainage_canal_allowed_materials) && matched.drainage_canal_allowed_materials.length > 0
                && dc.material && !matched.drainage_canal_allowed_materials.includes(dc.material))
              errs.push(`${name} : matériau canal « ${dc.material} » non autorisé.`);
            if (Array.isArray(matched.drainage_canal_allowed_types) && matched.drainage_canal_allowed_types.length > 0
                && dc.type && !matched.drainage_canal_allowed_types.includes(dc.type))
              errs.push(`${name} : type canal « ${dc.type} » non autorisé.`);
            if (matched.drainage_canal_min_slope_pct && Number(dc.slopePct || 0) < Number(matched.drainage_canal_min_slope_pct))
              errs.push(`${name} : pente canal ${dc.slopePct ?? 0}% < min ${matched.drainage_canal_min_slope_pct}%.`);
            if (!sideOk(matched.drainage_canal_required_sides, dc.side))
              errs.push(`${name} : côté canal requis ${matched.drainage_canal_required_sides}, fourni ${dc.side}.`);
          }
        }

        if (matched.require_solar_lighting) {
          for (const r of roads) {
            const name = r?.name || 'Voie';
            const sl = r?.solarLighting;
            if (!sl) { errs.push(`Éclairage public solaire manquant sur ${name}.`); continue; }
            if (matched.solar_lighting_min_pole_height_m && Number(sl.poleHeightM || 0) < Number(matched.solar_lighting_min_pole_height_m))
              errs.push(`${name} : hauteur mât ${sl.poleHeightM} m < min ${matched.solar_lighting_min_pole_height_m} m.`);
            if (matched.solar_lighting_min_lumens && Number(sl.lumens || 0) < Number(matched.solar_lighting_min_lumens))
              errs.push(`${name} : lumens ${sl.lumens} < min ${matched.solar_lighting_min_lumens}.`);
            if (matched.solar_lighting_beam_angle_deg && sl.beamAngleDeg && Number(sl.beamAngleDeg) > Number(matched.solar_lighting_beam_angle_deg))
              errs.push(`${name} : faisceau ${sl.beamAngleDeg}° > max ${matched.solar_lighting_beam_angle_deg}°.`);
            if (matched.solar_lighting_max_spacing_m && sl.spacingM && Number(sl.spacingM) > Number(matched.solar_lighting_max_spacing_m))
              errs.push(`${name} : espacement ${sl.spacingM} m > max ${matched.solar_lighting_max_spacing_m} m.`);
            if (matched.solar_lighting_min_battery_hours && Number(sl.batteryHours || 0) < Number(matched.solar_lighting_min_battery_hours))
              errs.push(`${name} : autonomie ${sl.batteryHours} h < min ${matched.solar_lighting_min_battery_hours} h.`);
            if (!sideOk(matched.solar_lighting_required_sides, sl.side))
              errs.push(`${name} : côté éclairage requis ${matched.solar_lighting_required_sides}, fourni ${sl.side}.`);
          }
        }

        // === Per-road width constraint ===
        if (matched.min_road_width_m) {
          for (const r of roads) {
            const w = Number(r?.widthM || 0);
            if (w > 0 && w < Number(matched.min_road_width_m)) {
              errs.push(`${r?.name || 'Voie'} : largeur ${w} m < min ${matched.min_road_width_m} m.`);
            }
          }
        }

        // === Max lots per request ===
        if (matched.max_lots_per_request && Array.isArray(body.lots) && body.lots.length > Number(matched.max_lots_per_request)) {
          errs.push(`Nombre de lots ${body.lots.length} > maximum ${matched.max_lots_per_request} pour cette zone.`);
        }

        if (errs.length > 0) {
          return new Response(JSON.stringify({
            error: 'ROAD_INFRA_VIOLATIONS',
            violations: errs,
            message: errs.join(' '),
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422 });
        }
      }
    }

    // Fetch matching rate
    const { data: rates } = await supabase
      .from("subdivision_rate_config")
      .select("*")
      .eq("section_type", sectionType)
      .eq("is_active", true);

    const ratesData = (rates as any[]) || [];
    const fallbackRate = ratesData.find((r) => r.location_name === "*");
    const rate = fallbackRate || ratesData[0];

    // Aggregate roads + common spaces in meters using anisotropic GPS frame
    // (mirrors the client `metricFrame` so areas/lengths match user-facing values).
    const frame = buildMetricFrame(body.parent_parcel?.gpsCoordinates, Number(body.parent_parcel?.areaSqm) || 0);
    const aux = aggregateAuxiliaryMetrics(body.roads || [], body.commonSpaces || [], frame);

    // SECURITY: recompute each lot area server-side from vertices.
    // Clients must not be trusted with `lot.areaSqm` for billing.
    const recomputedLots = (body.lots || []).map((l: any) => {
      const verts = Array.isArray(l?.vertices) ? l.vertices : [];
      const serverArea = verts.length >= 3 ? polygonAreaSqm(verts, frame) : Number(l?.areaSqm) || 0;
      return { ...l, areaSqm: Math.round(serverArea * 100) / 100 };
    });

    let totalFee = 0;
    let feeBreakdown: any = null;
    if (rate) {
      const breakdown = computeSubdivisionFee(
        {
          lotsAreasSqm: recomputedLots.map((l: any) => Number(l?.areaSqm) || 0),
          roadLengthM: aux.roadLengthM,
          commonSpaceSqm: aux.commonSpaceSqm,
        },
        rate as any,
      );
      totalFee = breakdown.total;
      feeBreakdown = {
        lots_total: Math.round(breakdown.lotsTotal * 100) / 100,
        road_total: Math.round(breakdown.roadTotal * 100) / 100,
        common_total: Math.round(breakdown.commonTotal * 100) / 100,
        road_length_m: Math.round(aux.roadLengthM * 100) / 100,
        common_space_sqm: Math.round(aux.commonSpaceSqm * 100) / 100,
        rate_id: rate.id,
      };
    } else {
      // Safe fallback: 10$ per lot minimum
      totalFee = recomputedLots.length * 10;
    }

    // === Lot E — Server-side infrastructure surcharge ===
    let infrastructureFee = 0;
    const persistedInfrastructures: Array<{
      infrastructure_key: string;
      label: string;
      unit: string;
      quantity: number;
      rate_usd: number;
      subtotal_usd: number;
    }> = [];
    const selectedInfra = body.selected_infrastructures || {};
    const selectedKeys = Object.keys(selectedInfra).filter((k) => Number(selectedInfra[k]) > 0);
    if (selectedKeys.length > 0) {
      const { data: infraTariffs } = await supabase
        .from("subdivision_infrastructure_tariffs")
        .select("infrastructure_key,label,unit,rate_usd,is_active")
        .in("infrastructure_key", selectedKeys)
        .eq("is_active", true);
      for (const t of (infraTariffs as any[]) || []) {
        const qty = Math.max(0, Number(selectedInfra[t.infrastructure_key]) || 0);
        const subtotal = Math.round(qty * Number(t.rate_usd) * 100) / 100;
        if (subtotal <= 0) continue;
        infrastructureFee += subtotal;
        persistedInfrastructures.push({
          infrastructure_key: t.infrastructure_key,
          label: t.label,
          unit: t.unit,
          quantity: qty,
          rate_usd: Number(t.rate_usd),
          subtotal_usd: subtotal,
        });
      }
      infrastructureFee = Math.round(infrastructureFee * 100) / 100;
      totalFee = Math.round((totalFee + infrastructureFee) * 100) / 100;
      if (feeBreakdown) feeBreakdown.infrastructure_total = infrastructureFee;
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
      number_of_lots: recomputedLots.length,
      lots_data: recomputedLots,
      subdivision_plan_data: {
        lots: recomputedLots,
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
      // Lot E
      selected_infrastructures: persistedInfrastructures,
      infrastructure_fee_usd: infrastructureFee,
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
      fee_breakdown: feeBreakdown,
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
