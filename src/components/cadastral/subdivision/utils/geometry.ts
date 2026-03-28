import { Point2D, GpsPoint, SubdivisionLot } from '../types';

/**
 * Calculate polygon area using Shoelace formula
 * Works with normalized (0-1) coords - multiply by actual area for real sqm
 */
export function polygonArea(vertices: Point2D[]): number {
  const n = vertices.length;
  if (n < 3) return 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Calculate polygon perimeter
 */
export function polygonPerimeter(vertices: Point2D[], scaleFactor: number): number {
  let perimeter = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = (vertices[j].x - vertices[i].x) * scaleFactor;
    const dy = (vertices[j].y - vertices[i].y) * scaleFactor;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  return perimeter;
}

/**
 * Distance between two points
 */
export function distance(a: Point2D, b: Point2D): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

/**
 * Calculate distance between two GPS points in meters (Haversine formula)
 */
export function gpsDistance(a: GpsPoint, b: GpsPoint): number {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const aVal = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
}

/**
 * Get bounding box of parent parcel from GPS coordinates
 */
export function getBoundingBox(coords: GpsPoint[]) {
  const lats = coords.map(c => c.lat);
  const lngs = coords.map(c => c.lng);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

/**
 * Convert normalized coordinates (0-1) to GPS coordinates
 */
export function normalizedToGps(point: Point2D, parentGps: GpsPoint[]): GpsPoint {
  if (parentGps.length < 3) return { lat: 0, lng: 0 };
  const bb = getBoundingBox(parentGps);
  return {
    lat: bb.minLat + point.y * (bb.maxLat - bb.minLat),
    lng: bb.minLng + point.x * (bb.maxLng - bb.minLng),
  };
}

/**
 * Convert GPS coordinates to normalized (0-1)
 */
export function gpsToNormalized(gps: GpsPoint, parentGps: GpsPoint[]): Point2D {
  const bb = getBoundingBox(parentGps);
  const latRange = bb.maxLat - bb.minLat;
  const lngRange = bb.maxLng - bb.minLng;
  return {
    x: lngRange > 0 ? (gps.lng - bb.minLng) / lngRange : 0.5,
    y: latRange > 0 ? (gps.lat - bb.minLat) / latRange : 0.5,
  };
}

/**
 * Check if a point is inside a polygon (ray casting)
 */
export function isPointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    if (
      polygon[i].y > point.y !== polygon[j].y > point.y &&
      point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Check if two polygons overlap
 */
export function doPolygonsOverlap(poly1: Point2D[], poly2: Point2D[]): boolean {
  for (const p of poly1) {
    if (isPointInPolygon(p, poly2)) return true;
  }
  for (const p of poly2) {
    if (isPointInPolygon(p, poly1)) return true;
  }
  return false;
}

/**
 * Calculate the centroid of a polygon
 */
export function polygonCentroid(vertices: Point2D[]): Point2D {
  let cx = 0, cy = 0;
  for (const v of vertices) {
    cx += v.x;
    cy += v.y;
  }
  return { x: cx / vertices.length, y: cy / vertices.length };
}

/**
 * When a road is deleted, merge adjacent lots to fill the gap.
 */
export function mergeLotsThroughDeletedRoad(
  road: { path: Point2D[]; widthM: number },
  lots: SubdivisionLot[],
  parentAreaSqm: number,
  parentVertices?: Point2D[]
): SubdivisionLot[] {
  if (road.path.length < 2 || lots.length < 2) return lots;

  const sideLength = Math.sqrt(parentAreaSqm);
  const parentPoly = parentVertices && parentVertices.length >= 3
    ? parentVertices
    : [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
  const parentNormArea = polygonArea(parentPoly);

  const p0 = road.path[0];
  const p1 = road.path[road.path.length - 1];
  const dx = Math.abs(p1.x - p0.x);
  const dy = Math.abs(p1.y - p0.y);
  const isVerticalRoad = dy > dx;
  const axis: 'x' | 'y' = isVerticalRoad ? 'x' : 'y';
  const roadCenter = isVerticalRoad ? (p0.x + p1.x) / 2 : (p0.y + p1.y) / 2;
  const halfRoadNorm = (road.widthM / sideLength) / 2;

  function polyBounds(poly: Point2D[]) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of poly) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, maxX, minY, maxY };
  }

  return lots.map(lot => {
    const centroid = polygonCentroid(lot.vertices);
    const lotCenter = centroid[axis];
    const lotBnds = polyBounds(lot.vertices);
    const lotMin = axis === 'x' ? lotBnds.minX : lotBnds.minY;
    const lotMax = axis === 'x' ? lotBnds.maxX : lotBnds.maxY;
    const tolerance = halfRoadNorm * 2.5;

    if (lotCenter < roadCenter && Math.abs(lotMax - (roadCenter - halfRoadNorm)) < tolerance) {
      const newVertices = lot.vertices.map(v =>
        Math.abs(v[axis] - lotMax) < tolerance ? { ...v, [axis]: roadCenter } : v
      );
      const normArea = polygonArea(newVertices);
      return { ...lot, vertices: newVertices, areaSqm: Math.round((normArea / parentNormArea) * parentAreaSqm), perimeterM: Math.round(polygonPerimeter(newVertices, sideLength)) };
    } else if (lotCenter > roadCenter && Math.abs(lotMin - (roadCenter + halfRoadNorm)) < tolerance) {
      const newVertices = lot.vertices.map(v =>
        Math.abs(v[axis] - lotMin) < tolerance ? { ...v, [axis]: roadCenter } : v
      );
      const normArea = polygonArea(newVertices);
      return { ...lot, vertices: newVertices, areaSqm: Math.round((normArea / parentNormArea) * parentAreaSqm), perimeterM: Math.round(polygonPerimeter(newVertices, sideLength)) };
    }
    return lot;
  });
}

/**
 * Segment-segment intersection: both t and u must be in [0,1]
 */
export function segmentSegmentIntersection(
  p1: Point2D, p2: Point2D, p3: Point2D, p4: Point2D
): { point: Point2D; t: number; u: number } | null {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return {
    point: { x: p1.x + t * d1x, y: p1.y + t * d1y },
    t, u,
  };
}

/**
 * Find all intersection points between two road paths (segment-segment)
 */
export function findRoadIntersections(
  path1: Point2D[], path2: Point2D[]
): { point: Point2D; seg1Idx: number; t1: number; seg2Idx: number; t2: number }[] {
  const results: { point: Point2D; seg1Idx: number; t1: number; seg2Idx: number; t2: number }[] = [];
  for (let i = 0; i < path1.length - 1; i++) {
    for (let j = 0; j < path2.length - 1; j++) {
      const inter = segmentSegmentIntersection(path1[i], path1[i + 1], path2[j], path2[j + 1]);
      if (inter) {
        // Avoid duplicates at endpoints
        const isDup = results.some(r =>
          Math.abs(r.point.x - inter.point.x) < 1e-8 && Math.abs(r.point.y - inter.point.y) < 1e-8
        );
        if (!isDup) {
          results.push({ point: inter.point, seg1Idx: i, t1: inter.t, seg2Idx: j, t2: inter.u });
        }
      }
    }
  }
  return results;
}

/**
 * Insert a point into a path at a given segment index, maintaining order by t parameter
 */
export function insertPointInPath(path: Point2D[], point: Point2D, segIdx: number): Point2D[] {
  const newPath = [...path];
  newPath.splice(segIdx + 1, 0, point);
  return newPath;
}

/**
 * Insert all intersection points between a set of roads, mutating their paths.
 * Returns updated roads array with intersection points injected into paths.
 */
export function insertAllRoadIntersections(roads: { id: string; path: Point2D[]; [key: string]: any }[]): typeof roads {
  const updatedRoads = roads.map(r => ({ ...r, path: [...r.path] }));

  for (let a = 0; a < updatedRoads.length; a++) {
    for (let b = a + 1; b < updatedRoads.length; b++) {
      const intersections = findRoadIntersections(updatedRoads[a].path, updatedRoads[b].path);
      // Sort by seg index descending so insertions don't shift subsequent indices
      const sortedForA = [...intersections].sort((x, y) => y.seg1Idx - x.seg1Idx || y.t1 - x.t1);
      const sortedForB = [...intersections].sort((x, y) => y.seg2Idx - x.seg2Idx || y.t2 - x.t2);

      for (const inter of sortedForA) {
        const alreadyExists = updatedRoads[a].path.some(p =>
          Math.abs(p.x - inter.point.x) < 1e-8 && Math.abs(p.y - inter.point.y) < 1e-8
        );
        if (!alreadyExists) {
          updatedRoads[a].path = insertPointInPath(updatedRoads[a].path, inter.point, inter.seg1Idx);
        }
      }
      for (const inter of sortedForB) {
        const alreadyExists = updatedRoads[b].path.some(p =>
          Math.abs(p.x - inter.point.x) < 1e-8 && Math.abs(p.y - inter.point.y) < 1e-8
        );
        if (!alreadyExists) {
          updatedRoads[b].path = insertPointInPath(updatedRoads[b].path, inter.point, inter.seg2Idx);
        }
      }
    }
  }
  return updatedRoads;
}

/**
 * Compute all intersection points between all roads (for rendering markers)
 */
export function getAllRoadIntersectionPoints(roads: { path: Point2D[] }[]): Point2D[] {
  const points: Point2D[] = [];
  for (let a = 0; a < roads.length; a++) {
    for (let b = a + 1; b < roads.length; b++) {
      const inters = findRoadIntersections(roads[a].path, roads[b].path);
      for (const inter of inters) {
        const isDup = points.some(p =>
          Math.abs(p.x - inter.point.x) < 1e-6 && Math.abs(p.y - inter.point.y) < 1e-6
        );
        if (!isDup) points.push(inter.point);
      }
    }
  }
  return points;
}

/**
 * Validate subdivision plan
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSubdivision(
  lots: SubdivisionLot[],
  parentAreaSqm: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (lots.length < 2) {
    errors.push('Un lotissement doit contenir au moins 2 lots.');
  }
  
  const totalLotArea = lots.reduce((sum, lot) => sum + lot.areaSqm, 0);
  const tolerance = parentAreaSqm * 0.1;
  
  if (totalLotArea > parentAreaSqm + tolerance) {
    errors.push(`La superficie totale des lots (${totalLotArea} m²) dépasse celle de la parcelle mère (${parentAreaSqm} m²).`);
  }
  
  for (const lot of lots) {
    if (lot.areaSqm < 100) {
      warnings.push(`Le lot ${lot.lotNumber} a une superficie inférieure à 100 m² (${lot.areaSqm} m²).`);
    }
  }
  
  for (let i = 0; i < lots.length; i++) {
    for (let j = i + 1; j < lots.length; j++) {
      if (doPolygonsOverlap(lots[i].vertices, lots[j].vertices)) {
        errors.push(`Les lots ${lots[i].lotNumber} et ${lots[j].lotNumber} se chevauchent.`);
      }
    }
  }
  
  const lotNumbers = lots.map(l => l.lotNumber);
  const uniqueNumbers = new Set(lotNumbers);
  if (uniqueNumbers.size !== lotNumbers.length) {
    errors.push('Certains lots ont le même numéro.');
  }
  
  if (totalLotArea < parentAreaSqm * 0.5) {
    warnings.push(`La superficie totale des lots ne couvre que ${Math.round(totalLotArea / parentAreaSqm * 100)}% de la parcelle mère.`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
