// Helper to convert a zone (drawn polygon) between Lot / Road / CommonSpace.
// Geometry is preserved across conversions:
//  - Lot/CommonSpace store a polygon in `vertices`.
//  - Road stores a centerline polyline in `path`.
// When converting a polygon → road, we derive a centerline from the two longest
// opposite edges' midpoints. When converting road → polygon, we expand the path
// into a thin rectangle around the centerline.

import {
  SubdivisionLot,
  SubdivisionRoad,
  SubdivisionCommonSpace,
  Point2D,
  LOT_COLORS,
  COMMON_SPACE_COLORS,
} from '../types';
import { MetricFrame, polygonAreaSqmAccurate, polygonPerimeterM as polygonPerimeterMFrame, edgeLengthM } from './metrics';
import { genId } from './polygonOps';

export type ZoneType = 'lot' | 'road' | 'commonSpace';

/**
 * Déduit la largeur (m) d'une voie à partir d'un polygone "couloir".
 * largeur ≈ aire / longueur centerline, snap 0,5 m, borné [2, 30].
 */
export function inferRoadWidthFromPolygon(vertices: Point2D[], frame: MetricFrame): number | null {
  if (vertices.length < 3) return null;
  const areaM2 = polygonAreaSqmAccurate(vertices, frame);
  const center = polygonToCenterline(vertices);
  if (center.length < 2) return null;
  const lenM = edgeLengthM(center[0], center[1], frame);
  if (lenM <= 0 || areaM2 <= 0) return null;
  const w = areaM2 / lenM;
  return Math.min(30, Math.max(2, Math.round(w * 2) / 2));
}

function polygonToCenterline(vertices: Point2D[]): Point2D[] {
  if (vertices.length < 3) {
    return vertices.length === 2
      ? vertices
      : [{ x: 0, y: 0 }, { x: 1, y: 1 }];
  }
  // Find longest edge and its opposite — midpoints define the centerline.
  let longestIdx = 0;
  let longestDist = 0;
  for (let i = 0; i < vertices.length; i++) {
    const next = vertices[(i + 1) % vertices.length];
    const d = Math.hypot(next.x - vertices[i].x, next.y - vertices[i].y);
    if (d > longestDist) {
      longestDist = d;
      longestIdx = i;
    }
  }
  const oppositeIdx = (longestIdx + Math.floor(vertices.length / 2)) % vertices.length;
  const mid = (a: Point2D, b: Point2D) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const m1 = mid(vertices[longestIdx], vertices[(longestIdx + 1) % vertices.length]);
  const m2 = mid(vertices[oppositeIdx], vertices[(oppositeIdx + 1) % vertices.length]);
  return [m1, m2];
}

function centerlineToPolygon(path: Point2D[], widthNorm: number): Point2D[] {
  if (path.length < 2) return [];
  const a = path[0];
  const b = path[path.length - 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const half = widthNorm / 2;
  return [
    { x: a.x + nx * half, y: a.y + ny * half },
    { x: b.x + nx * half, y: b.y + ny * half },
    { x: b.x - nx * half, y: b.y - ny * half },
    { x: a.x - nx * half, y: a.y - ny * half },
  ];
}

// Legacy isotropic helpers — kept for backwards-compat callers that don't
// pass a MetricFrame. New code should use the MetricFrame-aware variants.
function polygonAreaSqmLegacy(vertices: Point2D[], parentAreaSqm: number, parentNormArea: number): number {
  if (vertices.length < 3 || parentNormArea <= 0) return 0;
  let a = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    a += vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
  }
  const norm = Math.abs(a) / 2;
  return Math.max(1, Math.round((norm / parentNormArea) * parentAreaSqm));
}

function polygonPerimeterMLegacy(vertices: Point2D[], sideLengthM: number): number {
  if (vertices.length < 2) return 0;
  let p = 0;
  for (let i = 0; i < vertices.length; i++) {
    const next = vertices[(i + 1) % vertices.length];
    p += Math.hypot((next.x - vertices[i].x) * sideLengthM, (next.y - vertices[i].y) * sideLengthM);
  }
  return Math.round(p);
}

export interface ConvertContext {
  parentAreaSqm: number;
  parentNormArea: number;
  /** sqrt(parentAreaSqm) used to convert normalized distance to meters (legacy). */
  sideLengthM: number;
  /** Anisotropic metric frame derived from GPS bounds — preferred when available. */
  metricFrame?: MetricFrame;
  /** Default road width in meters (from zoning rules later, fallback 6). */
  defaultRoadWidthM?: number;
  /** Next available lot/space number suffix. */
  nextNumber: number;
}

export interface ConvertedZone {
  lot?: SubdivisionLot;
  road?: SubdivisionRoad;
  commonSpace?: SubdivisionCommonSpace;
}

/**
 * Convert any zone object to a target type, preserving geometry.
 * Returns the new object on the matching key.
 */
export function convertZoneType(
  source: { lot?: SubdivisionLot; road?: SubdivisionRoad; commonSpace?: SubdivisionCommonSpace },
  toType: ZoneType,
  ctx: ConvertContext,
): ConvertedZone {
  const widthM = ctx.defaultRoadWidthM ?? 6;
  const widthNorm = widthM / Math.max(1, ctx.sideLengthM);

  // Extract a canonical polygon from whatever source we have.
  let polygon: Point2D[] = [];
  let centerline: Point2D[] = [];

  if (source.lot) {
    polygon = source.lot.vertices;
    centerline = polygonToCenterline(polygon);
  } else if (source.commonSpace) {
    polygon = source.commonSpace.vertices;
    centerline = polygonToCenterline(polygon);
  } else if (source.road) {
    centerline = source.road.path;
    polygon = centerlineToPolygon(centerline, (source.road.widthM / Math.max(1, ctx.sideLengthM)));
  }

  // Prefer accurate (anisotropic) area/perimeter when a metric frame is provided.
  const areaOf = (verts: Point2D[]) =>
    ctx.metricFrame
      ? Math.max(1, Math.round(polygonAreaSqmAccurate(verts, ctx.metricFrame)))
      : polygonAreaSqmLegacy(verts, ctx.parentAreaSqm, ctx.parentNormArea);
  const perimOf = (verts: Point2D[]) =>
    ctx.metricFrame
      ? Math.round(polygonPerimeterMFrame(verts, ctx.metricFrame))
      : polygonPerimeterMLegacy(verts, ctx.sideLengthM);

  if (toType === 'lot') {
    const verts = polygon.length >= 3 ? polygon : centerlineToPolygon(centerline, widthNorm);
    const lot: SubdivisionLot = {
      id: source.lot?.id ?? genId('lot'),
      lotNumber: source.lot?.lotNumber ?? String(ctx.nextNumber),
      vertices: verts,
      areaSqm: areaOf(verts),
      perimeterM: perimOf(verts),
      intendedUse: source.lot?.intendedUse ?? 'residential',
      ownerName: source.lot?.ownerName,
      isBuilt: source.lot?.isBuilt ?? false,
      hasFence: source.lot?.hasFence ?? false,
      fenceType: source.lot?.fenceType,
      constructionType: source.lot?.constructionType,
      notes: source.lot?.notes,
      color: source.lot?.color ?? LOT_COLORS[source.lot?.intendedUse ?? 'residential'],
      annotations: source.lot?.annotations,
      gpsCoordinates: source.lot?.gpsCoordinates,
    };
    return { lot };
  }

  if (toType === 'road') {
    const path = centerline.length >= 2 ? centerline : polygonToCenterline(polygon);
    const road: SubdivisionRoad = {
      id: source.road?.id ?? genId('road'),
      name: source.road?.name ?? `Voie ${ctx.nextNumber}`,
      widthM: source.road?.widthM ?? widthM,
      surfaceType: source.road?.surfaceType ?? 'planned',
      isExisting: false,
      path,
      affectedLotIds: [],
    };
    return { road };
  }

  // commonSpace
  const verts = polygon.length >= 3 ? polygon : centerlineToPolygon(centerline, widthNorm);
  const type = source.commonSpace?.type ?? 'green_space';
  const commonSpace: SubdivisionCommonSpace = {
    id: source.commonSpace?.id ?? genId('cs'),
    type,
    name: source.commonSpace?.name ?? `Espace ${ctx.nextNumber}`,
    vertices: verts,
    areaSqm: areaOf(verts),
    color: source.commonSpace?.color ?? COMMON_SPACE_COLORS[type],
  };
  return { commonSpace };
}
