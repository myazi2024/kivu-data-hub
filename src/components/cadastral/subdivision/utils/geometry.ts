import { Point2D, GpsPoint, SubdivisionLot, AutoSubdivideOptions, ParcelSideInfo } from '../types';

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
 * Based on parent parcel bounding box
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
  // Simple check: does any vertex of poly1 lie inside poly2 or vice versa
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
 * Interpolate a point along a polygon edge at parameter t (0-1)
 * between vertex indices i and i+1
 */
function lerpPoint(a: Point2D, b: Point2D, t: number): Point2D {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/**
 * Find intersection of a horizontal/vertical slice line with polygon edges.
 * Returns sorted intersection x or y values.
 */
function slicePolygon(
  polygon: Point2D[],
  axis: 'x' | 'y',
  value: number
): number[] {
  const intersections: number[] = [];
  const n = polygon.length;
  const other = axis === 'x' ? 'y' : 'x';

  for (let i = 0; i < n; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];
    const aVal = a[axis];
    const bVal = b[axis];

    if ((aVal <= value && bVal > value) || (bVal <= value && aVal > value)) {
      const t = (value - aVal) / (bVal - aVal);
      intersections.push(a[other] + (b[other] - a[other]) * t);
    }
  }
  return intersections.sort((a, b) => a - b);
}

/**
 * Clip a polygon by a half-plane defined by axis >= min and axis <= max.
 * Uses Sutherland-Hodgman algorithm for two parallel clip edges.
 */
function clipPolygonByBand(
  polygon: Point2D[],
  axis: 'x' | 'y',
  min: number,
  max: number
): Point2D[] {
  let result = clipByEdge(polygon, axis, min, true);
  result = clipByEdge(result, axis, max, false);
  return result;
}

function clipByEdge(
  polygon: Point2D[],
  axis: 'x' | 'y',
  threshold: number,
  keepAbove: boolean
): Point2D[] {
  if (polygon.length === 0) return [];
  const output: Point2D[] = [];
  const n = polygon.length;

  const isInside = (p: Point2D) => keepAbove ? p[axis] >= threshold - 1e-9 : p[axis] <= threshold + 1e-9;

  for (let i = 0; i < n; i++) {
    const current = polygon[i];
    const next = polygon[(i + 1) % n];
    const currIn = isInside(current);
    const nextIn = isInside(next);

    if (currIn) output.push(current);

    if (currIn !== nextIn) {
      // Compute intersection
      const t = (threshold - current[axis]) / (next[axis] - current[axis]);
      output.push(lerpPoint(current, next, t));
    }
  }
  return output;
}

/**
 * Get bounding box of a polygon
 */
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

/**
 * Auto-subdivide parent parcel into lots respecting actual polygon shape.
 * Slices the parent polygon along the chosen axis.
 */
export function autoSubdivide(
  options: AutoSubdivideOptions,
  parentAreaSqm: number,
  parentVertices?: Point2D[]
): SubdivisionLot[] {
  const { numberOfLots, direction, includeRoad, roadWidthM, equalSize } = options;
  const sideLength = Math.sqrt(parentAreaSqm);
  const roadProportion = includeRoad ? (roadWidthM / sideLength) : 0;

  // Use actual polygon or fallback to unit square
  const parentPoly: Point2D[] = parentVertices && parentVertices.length >= 3
    ? parentVertices
    : [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];

  const bounds = polyBounds(parentPoly);
  const parentNormArea = polygonArea(parentPoly);

  const lots: SubdivisionLot[] = [];

  if (direction === 'horizontal') {
    // Slice along X axis (vertical cuts → left-to-right lots)
    const totalWidth = bounds.maxX - bounds.minX;
    const totalRoadWidth = includeRoad && numberOfLots > 1 ? roadProportion * (numberOfLots - 1) : 0;
    const availableWidth = totalWidth - totalRoadWidth;
    const lotWidth = availableWidth / numberOfLots;
    const gapWidth = includeRoad ? roadProportion : 0;

    for (let i = 0; i < numberOfLots; i++) {
      const xMin = bounds.minX + i * (lotWidth + gapWidth);
      const xMax = xMin + lotWidth;
      const clipped = clipPolygonByBand(parentPoly, 'x', xMin, xMax);
      if (clipped.length < 3) continue;

      const normArea = polygonArea(clipped);
      lots.push({
        id: `lot-${i + 1}`,
        lotNumber: `${i + 1}`,
        vertices: clipped,
        areaSqm: Math.round((normArea / parentNormArea) * parentAreaSqm),
        perimeterM: Math.round(polygonPerimeter(clipped, sideLength)),
        intendedUse: 'residential',
        isBuilt: false,
        hasFence: false,
        color: '#22c55e',
      });
    }
  } else if (direction === 'vertical') {
    // Slice along Y axis (horizontal cuts → top-to-bottom lots)
    const totalHeight = bounds.maxY - bounds.minY;
    const totalRoadWidth = includeRoad && numberOfLots > 1 ? roadProportion * (numberOfLots - 1) : 0;
    const availableHeight = totalHeight - totalRoadWidth;
    const lotHeight = availableHeight / numberOfLots;
    const gapHeight = includeRoad ? roadProportion : 0;

    for (let i = 0; i < numberOfLots; i++) {
      const yMin = bounds.minY + i * (lotHeight + gapHeight);
      const yMax = yMin + lotHeight;
      const clipped = clipPolygonByBand(parentPoly, 'y', yMin, yMax);
      if (clipped.length < 3) continue;

      const normArea = polygonArea(clipped);
      lots.push({
        id: `lot-${i + 1}`,
        lotNumber: `${i + 1}`,
        vertices: clipped,
        areaSqm: Math.round((normArea / parentNormArea) * parentAreaSqm),
        perimeterM: Math.round(polygonPerimeter(clipped, sideLength)),
        intendedUse: 'residential',
        isBuilt: false,
        hasFence: false,
        color: '#22c55e',
      });
    }
  } else {
    // Grid layout
    const cols = Math.ceil(Math.sqrt(numberOfLots));
    const rows = Math.ceil(numberOfLots / cols);
    const totalHGap = includeRoad ? roadProportion * (cols - 1) : 0;
    const totalVGap = includeRoad ? roadProportion * (rows - 1) : 0;
    const cellW = ((bounds.maxX - bounds.minX) - totalHGap) / cols;
    const cellH = ((bounds.maxY - bounds.minY) - totalVGap) / rows;
    const hGap = includeRoad ? roadProportion : 0;
    const vGap = includeRoad ? roadProportion : 0;

    let lotIndex = 0;
    for (let row = 0; row < rows && lotIndex < numberOfLots; row++) {
      for (let col = 0; col < cols && lotIndex < numberOfLots; col++) {
        const xMin = bounds.minX + col * (cellW + hGap);
        const xMax = xMin + cellW;
        const yMin = bounds.minY + row * (cellH + vGap);
        const yMax = yMin + cellH;

        // Clip by both axes
        let clipped = clipPolygonByBand(parentPoly, 'x', xMin, xMax);
        clipped = clipPolygonByBand(clipped, 'y', yMin, yMax);
        if (clipped.length < 3) { lotIndex++; continue; }

        const normArea = polygonArea(clipped);
        lots.push({
          id: `lot-${lotIndex + 1}`,
          lotNumber: `${lotIndex + 1}`,
          vertices: clipped,
          areaSqm: Math.round((normArea / parentNormArea) * parentAreaSqm),
          perimeterM: Math.round(polygonPerimeter(clipped, sideLength)),
          intendedUse: 'residential',
          isBuilt: false,
          hasFence: false,
          color: '#22c55e',
        });
        lotIndex++;
      }
    }
  }

  return lots;
}

/**
 * Generate auto roads between lots (in gaps between sliced lots)
 */
export function generateRoads(
  lots: SubdivisionLot[], 
  direction: 'horizontal' | 'vertical' | 'grid',
  roadWidthM: number,
  parentAreaSqm: number,
  parentVertices?: Point2D[]
): { id: string; name: string; widthM: number; surfaceType: 'planned'; isExisting: false; path: Point2D[] }[] {
  const roads: any[] = [];
  if (lots.length < 2) return roads;

  const parentPoly = parentVertices && parentVertices.length >= 3
    ? parentVertices
    : [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
  const bounds = polyBounds(parentPoly);

  if (direction === 'horizontal') {
    // Roads run vertically between horizontally-arranged lots
    for (let i = 0; i < lots.length - 1; i++) {
      // Find the right-most x of lot i
      const lotBounds = polyBounds(lots[i].vertices);
      const midX = lotBounds.maxX; // Road sits at right edge of this lot
      roads.push({
        id: `road-${i + 1}`,
        name: `Voie ${i + 1}`,
        widthM: roadWidthM,
        surfaceType: 'planned' as const,
        isExisting: false,
        path: [
          { x: midX, y: bounds.minY },
          { x: midX, y: bounds.maxY },
        ],
      });
    }
  } else if (direction === 'vertical') {
    for (let i = 0; i < lots.length - 1; i++) {
      const lotBounds = polyBounds(lots[i].vertices);
      const midY = lotBounds.maxY;
      roads.push({
        id: `road-${i + 1}`,
        name: `Voie ${i + 1}`,
        widthM: roadWidthM,
        surfaceType: 'planned' as const,
        isExisting: false,
        path: [
          { x: bounds.minX, y: midY },
          { x: bounds.maxX, y: midY },
        ],
      });
    }
  }
  
  return roads;
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
  
  // Check total area
  const totalLotArea = lots.reduce((sum, lot) => sum + lot.areaSqm, 0);
  const tolerance = parentAreaSqm * 0.1; // 10% tolerance for roads/common spaces
  
  if (totalLotArea > parentAreaSqm + tolerance) {
    errors.push(`La superficie totale des lots (${totalLotArea} m²) dépasse celle de la parcelle mère (${parentAreaSqm} m²).`);
  }
  
  // Check individual lot minimum area (100 m²)
  for (const lot of lots) {
    if (lot.areaSqm < 100) {
      warnings.push(`Le lot ${lot.lotNumber} a une superficie inférieure à 100 m² (${lot.areaSqm} m²).`);
    }
  }
  
  // Check for overlapping lots
  for (let i = 0; i < lots.length; i++) {
    for (let j = i + 1; j < lots.length; j++) {
      if (doPolygonsOverlap(lots[i].vertices, lots[j].vertices)) {
        errors.push(`Les lots ${lots[i].lotNumber} et ${lots[j].lotNumber} se chevauchent.`);
      }
    }
  }
  
  // Check lot numbers are unique
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
