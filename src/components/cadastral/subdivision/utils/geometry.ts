import { Point2D, GpsPoint, SubdivisionLot, AutoSubdivideOptions } from '../types';

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
 * Auto-subdivide parent parcel into lots
 * Returns normalized vertices for each lot (0-1 coordinate space)
 */
export function autoSubdivide(options: AutoSubdivideOptions, parentAreaSqm: number): SubdivisionLot[] {
  const { numberOfLots, direction, includeRoad, roadWidthM, equalSize } = options;
  const lots: SubdivisionLot[] = [];
  
  // Calculate road width as proportion of total area
  // Estimate: road is roughly sqrt(parentArea) long and roadWidthM wide
  const sideLength = Math.sqrt(parentAreaSqm);
  const roadProportion = includeRoad ? (roadWidthM / sideLength) : 0;
  
  if (direction === 'horizontal') {
    // Split horizontally (left to right)
    const availableWidth = 1 - (includeRoad && numberOfLots > 1 ? roadProportion : 0);
    const lotWidth = availableWidth / numberOfLots;
    
    for (let i = 0; i < numberOfLots; i++) {
      const x0 = i * lotWidth + (includeRoad && i > 0 ? roadProportion : 0);
      const x1 = x0 + lotWidth;
      
      const vertices: Point2D[] = [
        { x: x0, y: 0 },
        { x: x1, y: 0 },
        { x: x1, y: 1 },
        { x: x0, y: 1 },
      ];
      
      const normalizedArea = polygonArea(vertices);
      
      lots.push({
        id: `lot-${i + 1}`,
        lotNumber: `${i + 1}`,
        vertices,
        areaSqm: Math.round(normalizedArea * parentAreaSqm),
        perimeterM: 0, // Will be computed later
        intendedUse: 'residential',
        isBuilt: false,
        hasFence: false,
        color: '#22c55e',
      });
    }
  } else if (direction === 'vertical') {
    // Split vertically (top to bottom)
    const availableHeight = 1 - (includeRoad && numberOfLots > 1 ? roadProportion : 0);
    const lotHeight = availableHeight / numberOfLots;
    
    for (let i = 0; i < numberOfLots; i++) {
      const y0 = i * lotHeight + (includeRoad && i > 0 ? roadProportion : 0);
      const y1 = y0 + lotHeight;
      
      const vertices: Point2D[] = [
        { x: 0, y: y0 },
        { x: 1, y: y0 },
        { x: 1, y: y1 },
        { x: 0, y: y1 },
      ];
      
      const normalizedArea = polygonArea(vertices);
      
      lots.push({
        id: `lot-${i + 1}`,
        lotNumber: `${i + 1}`,
        vertices,
        areaSqm: Math.round(normalizedArea * parentAreaSqm),
        perimeterM: 0,
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
    const lotWidth = (1 - (includeRoad ? roadProportion * (cols - 1) : 0)) / cols;
    const lotHeight = (1 - (includeRoad ? roadProportion * (rows - 1) : 0)) / rows;
    
    let lotIndex = 0;
    for (let row = 0; row < rows && lotIndex < numberOfLots; row++) {
      for (let col = 0; col < cols && lotIndex < numberOfLots; col++) {
        const x0 = col * (lotWidth + (includeRoad ? roadProportion : 0));
        const y0 = row * (lotHeight + (includeRoad ? roadProportion : 0));
        
        const vertices: Point2D[] = [
          { x: x0, y: y0 },
          { x: x0 + lotWidth, y: y0 },
          { x: x0 + lotWidth, y: y0 + lotHeight },
          { x: x0, y: y0 + lotHeight },
        ];
        
        const normalizedArea = polygonArea(vertices);
        
        lots.push({
          id: `lot-${lotIndex + 1}`,
          lotNumber: `${lotIndex + 1}`,
          vertices,
          areaSqm: Math.round(normalizedArea * parentAreaSqm),
          perimeterM: 0,
          intendedUse: 'residential',
          isBuilt: false,
          hasFence: false,
          color: '#22c55e',
        });
        
        lotIndex++;
      }
    }
  }
  
  // Compute perimeters
  for (const lot of lots) {
    lot.perimeterM = Math.round(polygonPerimeter(lot.vertices, sideLength));
  }
  
  return lots;
}

/**
 * Generate auto roads between lots
 */
export function generateRoads(
  lots: SubdivisionLot[], 
  direction: 'horizontal' | 'vertical' | 'grid',
  roadWidthM: number,
  parentAreaSqm: number
): { id: string; name: string; widthM: number; surfaceType: 'planned'; isExisting: false; path: Point2D[] }[] {
  const roads: any[] = [];
  const sideLength = Math.sqrt(parentAreaSqm);
  const roadProportion = roadWidthM / sideLength;
  
  if (direction === 'horizontal' && lots.length > 1) {
    // Vertical roads between horizontal lots
    for (let i = 0; i < lots.length - 1; i++) {
      const rightEdge = lots[i].vertices[1].x;
      roads.push({
        id: `road-${i + 1}`,
        name: `Voie ${i + 1}`,
        widthM: roadWidthM,
        surfaceType: 'planned' as const,
        isExisting: false,
        path: [
          { x: rightEdge + roadProportion / 2, y: 0 },
          { x: rightEdge + roadProportion / 2, y: 1 },
        ],
      });
    }
  } else if (direction === 'vertical' && lots.length > 1) {
    for (let i = 0; i < lots.length - 1; i++) {
      const bottomEdge = lots[i].vertices[2].y;
      roads.push({
        id: `road-${i + 1}`,
        name: `Voie ${i + 1}`,
        widthM: roadWidthM,
        surfaceType: 'planned' as const,
        isExisting: false,
        path: [
          { x: 0, y: bottomEdge + roadProportion / 2 },
          { x: 1, y: bottomEdge + roadProportion / 2 },
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
