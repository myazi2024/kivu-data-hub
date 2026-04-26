// Polygon operations dedicated to the subdivision designer.
//
// Provides robust helpers used by P0 fixes:
//  - genId: cryptographically unique IDs to avoid Date.now() collisions
//  - nextLotNumber: numbering robust to non-numeric lot names
//  - isPolygonInsidePolygon: every vertex of A is inside (or on edge of) B
//  - polygonsShareEdge: two polygons have a touching edge segment (within eps)
//  - lotTouchesRoad: a lot's edge intersects/runs along any road centerline buffered by widthM
//  - polygonUnionByRing: union of adjacent polygons through their shared edge
//    (no convex hull — preserves concavities, never swallows external area)

import { Point2D } from '../types';
import {
  isPointInPolygon,
  isPointOnPolygonEdge,
  pointToSegmentDistance,
  segmentSegmentIntersection,
  polygonArea,
} from './geometry';
import { MetricFrame, edgeLengthM } from './metrics';

/** Cryptographically unique id with a domain prefix. */
export function genId(prefix: string): string {
  // crypto.randomUUID exists in browsers and modern Node (Vite/SSR-safe via globalThis).
  const uuid =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${uuid}`;
}

/** Compute next numeric lot number, ignoring non-numeric names. */
export function nextLotNumber(existing: { lotNumber: string }[]): number {
  let max = 0;
  for (const l of existing) {
    const n = parseInt(String(l.lotNumber).replace(/[^\d]/g, ''), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

/**
 * True if every vertex of `inner` lies inside (or on the edge of) `outer`.
 * Used to ensure each lot stays within the parent parcel boundary.
 */
export function isPolygonInsidePolygon(
  inner: Point2D[],
  outer: Point2D[],
  epsilon = 1e-6,
): boolean {
  if (inner.length < 3 || outer.length < 3) return false;
  for (const p of inner) {
    if (isPointInPolygon(p, outer)) continue;
    if (isPointOnPolygonEdge(p, outer, epsilon)) continue;
    return false;
  }
  return true;
}

/**
 * True if polygons A and B share a common edge segment (touch along a line).
 * Heuristic: at least 2 vertices of A lie on B's perimeter (or vice versa).
 */
export function polygonsShareEdge(
  a: Point2D[],
  b: Point2D[],
  epsilon = 1e-4,
): boolean {
  let onB = 0;
  for (const p of a) if (isPointOnPolygonEdge(p, b, epsilon)) onB++;
  if (onB >= 2) return true;
  let onA = 0;
  for (const p of b) if (isPointOnPolygonEdge(p, a, epsilon)) onA++;
  return onA >= 2;
}

/**
 * True if any edge of `lot` runs within `widthNorm/2` of any road centerline,
 * OR intersects it. Used for the "enclavement" (landlocked) check.
 *
 * widthNorm = roadWidthM / sideLengthM (normalized space).
 */
export function lotTouchesRoad(
  lot: Point2D[],
  roads: { path: Point2D[]; widthM: number }[],
  frame: MetricFrame,
): boolean {
  if (lot.length < 3 || roads.length === 0) return false;
  const avgScale = (frame.sxM + frame.syM) / 2;
  for (const road of roads) {
    if (road.path.length < 2) continue;
    const halfWidthNorm = (road.widthM / 2) / Math.max(1, avgScale);
    for (let i = 0; i < lot.length; i++) {
      const a = lot[i];
      const b = lot[(i + 1) % lot.length];
      for (let k = 0; k < road.path.length - 1; k++) {
        const c = road.path[k];
        const d = road.path[k + 1];
        // Direct edge crossing → access guaranteed
        if (segmentSegmentIntersection(a, b, c, d)) return true;
        // Edge runs along the road buffer
        const midA = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (pointToSegmentDistance(midA, c, d) <= halfWidthNorm) return true;
        if (pointToSegmentDistance(a, c, d) <= halfWidthNorm) return true;
      }
    }
  }
  return false;
}

/**
 * Merge two polygons that share an edge by walking their rings.
 * No convex hull — the result preserves concavities and never includes
 * external area between non-adjacent lots.
 *
 * Strategy: for each pair, find the longest run of consecutive vertices of A
 * lying on B's perimeter; splice in B's complementary ring.
 *
 * Falls back to null when polygons are not adjacent — caller should refuse.
 */
export function polygonUnionAdjacent(
  a: Point2D[],
  b: Point2D[],
  epsilon = 1e-4,
): Point2D[] | null {
  if (!polygonsShareEdge(a, b, epsilon)) return null;

  // Find indices of A vertices that sit on B perimeter.
  const onB: boolean[] = a.map((p) => isPointOnPolygonEdge(p, b, epsilon));
  // Find the start/end of the longest contiguous "shared" run (cyclic).
  const n = a.length;
  let bestStart = -1;
  let bestLen = 0;
  for (let s = 0; s < n; s++) {
    if (!onB[s]) continue;
    let len = 0;
    while (len < n && onB[(s + len) % n]) len++;
    if (len > bestLen) {
      bestLen = len;
      bestStart = s;
    }
  }
  if (bestStart < 0 || bestLen < 2) return null;

  // The two A vertices bracketing the shared run on the "outside" side
  const sharedFirst = a[bestStart];
  const sharedLast = a[(bestStart + bestLen - 1) % n];

  // Locate matching vertices in B (closest)
  const findClosestIdx = (p: Point2D, ring: Point2D[]) => {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < ring.length; i++) {
      const dx = ring[i].x - p.x;
      const dy = ring[i].y - p.y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  };
  const bStart = findClosestIdx(sharedLast, b);
  const bEnd = findClosestIdx(sharedFirst, b);

  // Walk A from end-of-shared back to start-of-shared (the non-shared side)
  const result: Point2D[] = [];
  let i = (bestStart + bestLen - 1) % n;
  const target = bestStart;
  let safety = 2 * n;
  while (safety-- > 0) {
    result.push(a[i]);
    if (i === target) break;
    i = (i + 1) % n;
  }
  // Then walk B from bStart to bEnd around the non-shared side
  let j = bStart;
  const bn = b.length;
  safety = 2 * bn;
  while (safety-- > 0) {
    j = (j + 1) % bn;
    if (j === bEnd) {
      result.push(b[j]);
      break;
    }
    result.push(b[j]);
  }

  // Sanity: result must have a sensible area (>= max(area(a), area(b)))
  const area = polygonArea(result);
  if (area < Math.max(polygonArea(a), polygonArea(b)) * 0.9) return null;
  return result;
}

/**
 * Reduce: union of N adjacent polygons in any pairing order.
 * Returns null if at any step the polygons are not pairwise adjacent.
 */
export function polygonUnionMany(polys: Point2D[][]): Point2D[] | null {
  if (polys.length === 0) return null;
  if (polys.length === 1) return polys[0];
  let acc = polys[0];
  const rest = polys.slice(1);
  // Greedy: at each step pick a polygon that is adjacent to acc.
  while (rest.length > 0) {
    const idx = rest.findIndex((p) => polygonsShareEdge(acc, p));
    if (idx < 0) return null;
    const merged = polygonUnionAdjacent(acc, rest[idx]);
    if (!merged) return null;
    acc = merged;
    rest.splice(idx, 1);
  }
  return acc;
}
