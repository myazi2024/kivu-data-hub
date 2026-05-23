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

// =====================================================================
// Infrastructure base × multiplier model
// =====================================================================
// Tarif de base par catégorie (`drainage`, `road_surface`, `street_lighting`)
// dans `subdivision_infrastructure_tariffs`, multiplié par les
// `price_multiplier` du catalogue (matériau de revêtement, matériau drainage,
// type drainage). Aucune clé composée n'est utilisée.

export interface CatalogEntry {
  key: string;
  label?: string | null;
  price_multiplier?: number | null;
  is_active?: boolean | null;
}

export interface InfraBaseTariff {
  infrastructure_key: string;
  label: string;
  unit: string;
  rate_usd: number;
  is_active?: boolean;
}

export interface InfraCatalogs {
  baseTariffs: Record<string, InfraBaseTariff | undefined>;
  roadSurfaceMaterials: Record<string, CatalogEntry>;
  drainageMaterials: Record<string, CatalogEntry>;
  drainageTypes: Record<string, CatalogEntry>;
}

const indexBy = <T extends { key: string }>(rows: T[]): Record<string, T> => {
  const out: Record<string, T> = {};
  for (const r of rows) if (r && r.key) out[r.key] = r;
  return out;
};

/** Charge les 3 tarifs base + 3 catalogues actifs en une seule passe. */
export async function loadInfraCatalogs(supabase: any): Promise<InfraCatalogs> {
  const [tariffsRes, roadRes, drainMatRes, drainTypeRes] = await Promise.all([
    supabase
      .from('subdivision_infrastructure_tariffs')
      .select('infrastructure_key,label,unit,rate_usd,is_active')
      .in('infrastructure_key', ['drainage', 'road_surface', 'street_lighting'])
      .eq('is_active', true),
    supabase
      .from('subdivision_road_surface_materials')
      .select('key,label,price_multiplier,is_active')
      .eq('is_active', true),
    supabase
      .from('subdivision_drainage_materials')
      .select('key,label,price_multiplier,is_active')
      .eq('is_active', true),
    supabase
      .from('subdivision_drainage_types')
      .select('key,label,price_multiplier,is_active')
      .eq('is_active', true),
  ]);
  const baseTariffs: Record<string, InfraBaseTariff | undefined> = {};
  for (const t of (tariffsRes.data as InfraBaseTariff[]) ?? []) {
    baseTariffs[t.infrastructure_key] = { ...t, rate_usd: Number(t.rate_usd) || 0 };
  }
  return {
    baseTariffs,
    roadSurfaceMaterials: indexBy(((roadRes.data as CatalogEntry[]) ?? [])),
    drainageMaterials: indexBy(((drainMatRes.data as CatalogEntry[]) ?? [])),
    drainageTypes: indexBy(((drainTypeRes.data as CatalogEntry[]) ?? [])),
  };
}

const mult = (e?: CatalogEntry) => {
  const v = e?.price_multiplier;
  return v == null || isNaN(Number(v)) ? 1 : Math.max(0, Number(v));
};
const sidesFactor = (side?: string) =>
  side === 'both' || side === 'alternating' ? 2 : 1;

export interface InfraLineItem {
  infrastructure_key: string;
  label: string;
  unit: string;
  quantity: number;
  rate_usd: number;
  subtotal_usd: number;
  road_id?: string;
  road_name?: string;
  base_rate_usd?: number;
  material_key?: string;
  material_multiplier?: number;
  type_key?: string;
  type_multiplier?: number;
}

export interface InfraComputation {
  items: InfraLineItem[];
  total: number;
  /** Longueur (m) de voie déjà facturée via road_surface — à déduire du fee générique. */
  roadLengthCoveredM: number;
}

/** Calcule les surcharges infrastructure par voie selon le modèle base × multiplicateurs. */
export function computeRoadInfrastructures(
  roads: any[],
  frame: MetricFrame,
  catalogs: InfraCatalogs,
): InfraComputation {
  const items: InfraLineItem[] = [];
  let total = 0;
  let roadLengthCoveredM = 0;
  const base = catalogs.baseTariffs;

  for (const road of roads ?? []) {
    const lengthM = Array.isArray(road?.path) ? pathLengthM(road.path, frame) : 0;
    if (lengthM <= 0) continue;
    const widthM = Number(road?.widthM) || 0;

    // Revêtement de voie : sqm × base.road_surface × material_mult
    const surfaceMatKey: string | undefined = road?.roadSurface?.material;
    const surfaceBase = base.road_surface;
    if (surfaceMatKey && surfaceBase && widthM > 0) {
      const mat = catalogs.roadSurfaceMaterials[surfaceMatKey];
      const m = mult(mat);
      const rate = Math.round(surfaceBase.rate_usd * m * 1000) / 1000;
      const qty = Math.round(lengthM * widthM * 100) / 100;
      const subtotal = Math.round(rate * qty * 100) / 100;
      if (subtotal > 0) {
        items.push({
          infrastructure_key: 'road_surface',
          label: `${surfaceBase.label} — ${mat?.label ?? surfaceMatKey}`,
          unit: surfaceBase.unit,
          quantity: qty,
          rate_usd: rate,
          subtotal_usd: subtotal,
          road_id: road.id,
          road_name: road.name,
          base_rate_usd: surfaceBase.rate_usd,
          material_key: surfaceMatKey,
          material_multiplier: m,
        });
        total += subtotal;
        roadLengthCoveredM += lengthM;
      }
    }

    // Drainage : linear_m × sides × base.drainage × material_mult × type_mult
    const dc = road?.drainageCanal;
    const drainageBase = base.drainage;
    if (dc && drainageBase) {
      const mat = dc.material ? catalogs.drainageMaterials[dc.material] : undefined;
      const typ = dc.type ? catalogs.drainageTypes[dc.type] : undefined;
      const mMat = mult(mat);
      const mTyp = mult(typ);
      const rate = Math.round(drainageBase.rate_usd * mMat * mTyp * 1000) / 1000;
      const qty = Math.round(lengthM * sidesFactor(dc.side) * 100) / 100;
      const subtotal = Math.round(rate * qty * 100) / 100;
      if (subtotal > 0) {
        items.push({
          infrastructure_key: 'drainage',
          label: `${drainageBase.label}${mat ? ` — ${mat.label}` : ''}${typ ? ` (${typ.label})` : ''}`,
          unit: drainageBase.unit,
          quantity: qty,
          rate_usd: rate,
          subtotal_usd: subtotal,
          road_id: road.id,
          road_name: road.name,
          base_rate_usd: drainageBase.rate_usd,
          material_key: dc.material,
          material_multiplier: mMat,
          type_key: dc.type,
          type_multiplier: mTyp,
        });
        total += subtotal;
      }
    }

    // Éclairage public : unit × base.street_lighting
    const lighting = road?.solarLighting;
    const lightingBase = base.street_lighting;
    if (lighting && lighting.spacingM > 0 && lightingBase) {
      const qty = Math.ceil(lengthM / Number(lighting.spacingM)) * sidesFactor(lighting.side);
      const rate = lightingBase.rate_usd;
      const subtotal = Math.round(rate * qty * 100) / 100;
      if (subtotal > 0) {
        items.push({
          infrastructure_key: 'street_lighting',
          label: lightingBase.label,
          unit: lightingBase.unit,
          quantity: qty,
          rate_usd: rate,
          subtotal_usd: subtotal,
          road_id: road.id,
          road_name: road.name,
          base_rate_usd: lightingBase.rate_usd,
        });
        total += subtotal;
      }
    }
  }

  return { items, total: Math.round(total * 100) / 100, roadLengthCoveredM };
}
