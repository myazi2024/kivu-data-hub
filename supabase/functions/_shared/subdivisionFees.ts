// Shared subdivision fee calculator.
// Single source of truth: this module MUST mirror the admin preview formula
// (see AdminSubdivisionFeesConfig.tsx, fee preview block).
//
// Fee = Σ (per-lot fee with optional tier + min/max clamp)
//     + roadLengthM × road_fee_per_linear_m_usd
//     + commonSpaceSqm × common_space_fee_per_sqm_usd

export interface SubdivisionRateRow {
  id?: string;
  section_type: string;
  location_name?: string | null;
  rate_per_sqm_usd: number;
  min_fee_per_lot_usd?: number | null;
  max_fee_per_lot_usd?: number | null;
  tier_threshold_sqm?: number | null;
  tier_rate_per_sqm_usd?: number | null;
  road_fee_per_linear_m_usd?: number | null;
  common_space_fee_per_sqm_usd?: number | null;
  is_active?: boolean;
}

export interface FeeInputs {
  lotsAreasSqm: number[];      // area of each lot
  roadLengthM: number;         // total linear meters of roads
  commonSpaceSqm: number;      // total m² of common spaces
}

export interface FeeBreakdown {
  perLotFees: number[];
  lotsTotal: number;
  roadTotal: number;
  commonTotal: number;
  total: number;
}

/** Per-lot fee using tier + min/max clamps — mirrors the client preview exactly. */
export function feeForLot(areaSqm: number, rate: SubdivisionRateRow): number {
  const baseRate = Number(rate.rate_per_sqm_usd) || 0;
  const tierThr = rate.tier_threshold_sqm != null ? Number(rate.tier_threshold_sqm) : null;
  const tierRate = rate.tier_rate_per_sqm_usd != null ? Number(rate.tier_rate_per_sqm_usd) : null;

  let fee: number;
  if (tierThr && tierRate && areaSqm > tierThr) {
    fee = tierThr * baseRate + (areaSqm - tierThr) * tierRate;
  } else {
    fee = areaSqm * baseRate;
  }
  if (rate.min_fee_per_lot_usd != null) fee = Math.max(fee, Number(rate.min_fee_per_lot_usd));
  if (rate.max_fee_per_lot_usd != null) fee = Math.min(fee, Number(rate.max_fee_per_lot_usd));
  return fee;
}

export function computeSubdivisionFee(inputs: FeeInputs, rate: SubdivisionRateRow): FeeBreakdown {
  const perLotFees = inputs.lotsAreasSqm.map((a) => feeForLot(Math.max(0, Number(a) || 0), rate));
  const lotsTotal = perLotFees.reduce((s, f) => s + f, 0);
  const roadTotal = (Number(inputs.roadLengthM) || 0) * Number(rate.road_fee_per_linear_m_usd || 0);
  const commonTotal = (Number(inputs.commonSpaceSqm) || 0) * Number(rate.common_space_fee_per_sqm_usd || 0);
  const total = Math.round((lotsTotal + roadTotal + commonTotal) * 100) / 100;
  return { perLotFees, lotsTotal, roadTotal, commonTotal, total };
}

// ----- Geometry helpers (anisotropic GPS projection) -----
// Projects normalized (0..1) plan coordinates to meters using the parent
// parcel GPS bounding box. Mirrors the client `metricFrame`.

const EARTH_R = 6371000;
const toRad = (d: number) => (d * Math.PI) / 180;

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export interface MetricFrame {
  sxM: number;
  syM: number;
}

/** Builds the anisotropic frame. Falls back to √A if no GPS. */
export function buildMetricFrame(
  parentGps: { lat: number; lng: number }[] | null | undefined,
  parentAreaSqm: number,
): MetricFrame {
  if (Array.isArray(parentGps) && parentGps.length >= 3) {
    const lats = parentGps.map((p) => p.lat);
    const lngs = parentGps.map((p) => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const midLat = (minLat + maxLat) / 2;
    const sxM = haversineM(midLat, minLng, midLat, maxLng);
    const syM = haversineM(minLat, (minLng + maxLng) / 2, maxLat, (minLng + maxLng) / 2);
    if (sxM > 0 && syM > 0) return { sxM, syM };
  }
  const side = Math.sqrt(Math.max(1, parentAreaSqm || 0));
  return { sxM: side, syM: side };
}

/** Total linear length (meters) of a road path in normalized coords. */
export function pathLengthM(path: { x: number; y: number }[], frame: MetricFrame): number {
  if (!Array.isArray(path) || path.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = (path[i].x - path[i - 1].x) * frame.sxM;
    const dy = (path[i].y - path[i - 1].y) * frame.syM;
    total += Math.hypot(dx, dy);
  }
  return total;
}

/** Polygon area in m² using the shoelace formula in projected coords. */
export function polygonAreaSqm(vertices: { x: number; y: number }[], frame: MetricFrame): number {
  if (!Array.isArray(vertices) || vertices.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    s += (a.x * frame.sxM) * (b.y * frame.syM) - (b.x * frame.sxM) * (a.y * frame.syM);
  }
  return Math.abs(s) / 2;
}

/** Aggregate road and common-space measurements for fee computation. */
export function aggregateAuxiliaryMetrics(
  roads: any[],
  commonSpaces: any[],
  frame: MetricFrame,
): { roadLengthM: number; commonSpaceSqm: number } {
  let roadLengthM = 0;
  for (const r of roads ?? []) {
    if (Array.isArray(r?.path)) roadLengthM += pathLengthM(r.path, frame);
  }
  let commonSpaceSqm = 0;
  for (const cs of commonSpaces ?? []) {
    // Prefer accurate projected area; fall back to declared areaSqm if no vertices.
    if (Array.isArray(cs?.vertices) && cs.vertices.length >= 3) {
      commonSpaceSqm += polygonAreaSqm(cs.vertices, frame);
    } else if (typeof cs?.areaSqm === 'number') {
      commonSpaceSqm += cs.areaSqm;
    }
  }
  return { roadLengthM, commonSpaceSqm };
}
