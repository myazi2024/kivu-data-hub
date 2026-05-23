// Edge function: subdivision-request
// Creates a subdivision_requests row securely with SERVICE_ROLE.
// Server is the source of truth for: reference_number, submission_fee_usd, total_amount_usd, status.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildMetricFrame,
  aggregateAuxiliaryMetrics,
  computeSubdivisionFee,
  polygonAreaSqm,
  pathLengthM,
  loadInfraCatalogs,
  computeRoadInfrastructures,
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
    titleIssueDate?: string | null;
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
  // Note: `selected_infrastructures` (manuel) supprimé — désormais dérivé des voies serveur-side.
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
    // Requester validation per legal status (Personne physique / Personne morale / État)
    {
      const r = body.requester || ({} as any);
      if (!r.phone) {
        const e: any = new Error("Numéro de téléphone du demandeur requis");
        e.code = "REQUESTER_INVALID";
        throw e;
      }
      const status = r.legalStatus || "Personne physique";
      if (status === "Personne morale") {
        if (!r.lastName || !r.rccmNumber) {
          const e: any = new Error("Dénomination (raison sociale) et numéro RCCM/Arrêté requis pour une personne morale");
          e.code = "REQUESTER_INVALID";
          throw e;
        }
      } else if (status === "État") {
        if (!r.rightType || !r.stateExploitedBy) {
          const e: any = new Error("Type de droit et entité exploitante requis pour une parcelle d'État");
          e.code = "REQUESTER_INVALID";
          throw e;
        }
      } else {
        if (!r.firstName || !r.lastName) {
          const e: any = new Error("Nom et prénom requis pour une personne physique");
          e.code = "REQUESTER_INVALID";
          throw e;
        }
      }
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
    let matchedZoningRule: any = null;
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
      matchedZoningRule = matched;
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

    // Fetch matching rate. Priority: exact location (commune > ville > province)
    // > generic '*' > first available. Avoids ignoring an admin-configured
    // location-specific rate just because no '*' row exists.
    const { data: rates } = await supabase
      .from("subdivision_rate_config")
      .select("*")
      .eq("section_type", sectionType)
      .eq("is_active", true);

    const ratesData = (rates as any[]) || [];
    const locCandidates = [
      body.parent_parcel?.commune,
      body.parent_parcel?.ville,
      body.parent_parcel?.province,
    ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
     .map(v => v.trim().toLowerCase());
    const matchLocation = (name?: string | null) =>
      typeof name === 'string' && locCandidates.includes(name.trim().toLowerCase());
    const rate =
      ratesData.find((r) => matchLocation(r.location_name)) ??
      ratesData.find((r) => r.location_name === "*") ??
      ratesData[0];

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

    // === Per-lot zoning area constraints (server-side recomputed areas) ===
    if (matchedZoningRule) {
      const minLot = Number(matchedZoningRule.min_lot_area_sqm) || 0;
      const maxLot = matchedZoningRule.max_lot_area_sqm != null ? Number(matchedZoningRule.max_lot_area_sqm) : null;
      const lotErrs: string[] = [];
      for (const l of recomputedLots) {
        if (l.isParentBoundary) continue;
        const a = Number(l.areaSqm) || 0;
        const label = l.lotNumber ? `Lot ${l.lotNumber}` : (l.id || 'Lot');
        if (minLot > 0 && a < minLot) lotErrs.push(`${label} : ${Math.round(a)} m² < min ${minLot} m².`);
        if (maxLot && a > maxLot) lotErrs.push(`${label} : ${Math.round(a)} m² > max ${maxLot} m².`);
      }
      if (lotErrs.length > 0) {
        return new Response(JSON.stringify({
          error: 'LOT_AREA_OUT_OF_RANGE',
          violations: lotErrs,
          message: lotErrs.join(' '),
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422 });
      }
    }

    // === Lot E — Server-side infrastructure surcharge (derived from roads) ===
    // Derived FIRST so we can deduct covered road length from the generic
    // `road_fee_per_linear_m_usd` charge below and avoid double-billing voirie
    // when a road already produces a `road_surface_<material>` tariff item.
    let infrastructureFee = 0;
    let roadLengthCoveredM = 0;
    const persistedInfrastructures: Array<{
      infrastructure_key: string;
      label: string;
      unit: string;
      quantity: number;
      rate_usd: number;
      subtotal_usd: number;
      road_id?: string;
      road_name?: string;
    }> = [];
    const sidesFactor = (side?: string) =>
      side === "both" || side === "alternating" ? 2 : 1;
    const derivedKeys = new Set<string>();
    for (const road of (body.roads as any[]) ?? []) {
      if (road?.roadSurface?.material) derivedKeys.add(`road_surface_${road.roadSurface.material}`);
      if (road?.drainageCanal) {
        if (road.drainageCanal.material) derivedKeys.add(`drainage_${road.drainageCanal.material}`);
        derivedKeys.add("drainage"); // fallback
      }
      if (road?.solarLighting && (road.solarLighting.spacingM ?? 0) > 0) {
        derivedKeys.add("street_lighting_solar");
        derivedKeys.add("street_lighting"); // fallback
      }
    }
    if (derivedKeys.size > 0) {
      const { data: infraTariffs } = await supabase
        .from("subdivision_infrastructure_tariffs")
        .select("infrastructure_key,label,unit,rate_usd,section_type,is_active")
        .in("infrastructure_key", Array.from(derivedKeys))
        .eq("is_active", true);
      const tariffs = (infraTariffs as any[]) || [];
      const pickTariff = (key: string) => {
        const cands = tariffs.filter((t) => t.infrastructure_key === key);
        return cands.find((t) => t.section_type === sectionType)
          ?? cands.find((t) => t.section_type == null)
          ?? cands[0]
          ?? null;
      };
      const pickWithFallback = (preferred: string, fallback: string) =>
        pickTariff(preferred) ?? pickTariff(fallback);
      for (const road of (body.roads as any[]) ?? []) {
        const lengthM = Array.isArray(road?.path) ? pathLengthM(road.path, frame) : 0;
        if (lengthM <= 0) continue;
        const pushItem = (t: any, qty: number) => {
          if (!t || qty <= 0) return;
          const subtotal = Math.round(qty * Number(t.rate_usd) * 100) / 100;
          if (subtotal <= 0) return;
          infrastructureFee += subtotal;
          persistedInfrastructures.push({
            infrastructure_key: t.infrastructure_key,
            label: t.label,
            unit: t.unit,
            quantity: Math.round(qty * 100) / 100,
            rate_usd: Number(t.rate_usd),
            subtotal_usd: subtotal,
            road_id: road.id,
            road_name: road.name,
          });
        };
        if (road.roadSurface?.material) {
          const surfaceTariff = pickTariff(`road_surface_${road.roadSurface.material}`);
          if (surfaceTariff) {
            roadLengthCoveredM += lengthM;
            pushItem(surfaceTariff, lengthM * (road.widthM || 0));
          }
        }
        if (road.drainageCanal) {
          const key = road.drainageCanal.material ? `drainage_${road.drainageCanal.material}` : "drainage";
          pushItem(pickWithFallback(key, "drainage"), lengthM * sidesFactor(road.drainageCanal.side));
        }
        if (road.solarLighting && road.solarLighting.spacingM > 0) {
          pushItem(
            pickWithFallback("street_lighting_solar", "street_lighting"),
            Math.ceil(lengthM / Number(road.solarLighting.spacingM)) * sidesFactor(road.solarLighting.side),
          );
        }
      }
      infrastructureFee = Math.round(infrastructureFee * 100) / 100;
    }

    // Generic legacy fee (rate_config.road_fee_per_linear_m_usd) only applies
    // to roads NOT already billed via a road_surface_* infrastructure tariff.
    const billableRoadLengthM = Math.max(0, aux.roadLengthM - roadLengthCoveredM);

    let totalFee = 0;
    let feeBreakdown: any = null;
    if (rate) {
      const breakdown = computeSubdivisionFee(
        {
          lotsAreasSqm: recomputedLots.map((l: any) => Number(l?.areaSqm) || 0),
          roadLengthM: billableRoadLengthM,
          commonSpaceSqm: aux.commonSpaceSqm,
        },
        rate as any,
      );
      totalFee = Math.round((breakdown.total + infrastructureFee) * 100) / 100;
      feeBreakdown = {
        lots_total: Math.round(breakdown.lotsTotal * 100) / 100,
        road_total: Math.round(breakdown.roadTotal * 100) / 100,
        common_total: Math.round(breakdown.commonTotal * 100) / 100,
        road_length_m: Math.round(aux.roadLengthM * 100) / 100,
        road_length_billable_m: Math.round(billableRoadLengthM * 100) / 100,
        road_length_covered_by_infra_m: Math.round(roadLengthCoveredM * 100) / 100,
        common_space_sqm: Math.round(aux.commonSpaceSqm * 100) / 100,
        infrastructure_total: infrastructureFee,
        rate_id: rate.id,
      };
    } else {
      // Safe fallback: 10$ per lot minimum + infra fee if any
      totalFee = Math.round((recomputedLots.length * 10 + infrastructureFee) * 100) / 100;
      feeBreakdown = { infrastructure_total: infrastructureFee };
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
      parent_parcel_title_type: body.parent_parcel.propertyTitleType || null,
      parent_parcel_title_issue_date: (body as any).parent_parcel?.titleIssueDate || null,
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
      requester_entity_subtype_other: body.requester.entitySubTypeOther || null,
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
      idempotency_key: idempotencyKey,
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
    return new Response(
      JSON.stringify({
        error: error.code || "UNKNOWN_ERROR",
        message: error.message,
        violations: error.violations || null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
