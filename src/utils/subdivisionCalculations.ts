/**
 * Shared calculation utilities for subdivision forms
 * Centralizes area, perimeter, and validation calculations
 * 
 * Formulas:
 * - Triangle: Heron's formula with triangle inequality validation
 * - Quadrilateral: Bretschneider's formula (general case) with fallback to average sides
 * - Regular n-gon: A = (n * s²) / (4 * tan(π/n))
 * - Interior angles: (n-2) * 180° / n for regular polygons
 */

import { SideDimension, LotData } from '@/components/cadastral/subdivision/types';

/**
 * Calculate the area of a polygon from its sides
 * Uses appropriate formulas based on the number of sides
 */
export const calculatePolygonArea = (sides: SideDimension[]): number => {
  if (!sides || sides.length < 3) return 0;
  
  const n = sides.length;
  
  if (n === 3) {
    // Triangle: Heron's formula with validation
    const a = sides[0].length || 0;
    const b = sides[1].length || 0;
    const c = sides[2].length || 0;
    
    // Validate triangle inequality
    if (a <= 0 || b <= 0 || c <= 0) return 0;
    if (a + b <= c || b + c <= a || a + c <= b) return 0;
    
    const s = (a + b + c) / 2;
    const areaSquared = s * (s - a) * (s - b) * (s - c);
    
    // Protect against negative values (floating point errors)
    return areaSquared > 0 ? Math.sqrt(areaSquared) : 0;
  }
  
  if (n === 4) {
    // Quadrilateral: Use Bretschneider's formula when angles are available
    // Otherwise fallback to average of opposite sides
    const a = sides[0].length || 0;
    const b = sides[1].length || 0;
    const c = sides[2].length || 0;
    const d = sides[3].length || 0;
    
    if (a <= 0 || b <= 0 || c <= 0 || d <= 0) return 0;
    
    // Check if we have valid angles (sum should be ~360°)
    const angleSum = sides.reduce((sum, s) => sum + (s.angle || 0), 0);
    const hasValidAngles = Math.abs(angleSum - 360) < 5;
    
    if (hasValidAngles) {
      // Bretschneider's formula: K = sqrt((s-a)(s-b)(s-c)(s-d) - abcd*cos²((A+C)/2))
      const s = (a + b + c + d) / 2;
      const angleA = (sides[0].angle || 90) * Math.PI / 180;
      const angleC = (sides[2].angle || 90) * Math.PI / 180;
      const cosHalfSumAC = Math.cos((angleA + angleC) / 2);
      
      const term1 = (s - a) * (s - b) * (s - c) * (s - d);
      const term2 = a * b * c * d * cosHalfSumAC * cosHalfSumAC;
      const areaSquared = term1 - term2;
      
      if (areaSquared > 0) {
        return Math.sqrt(areaSquared);
      }
    }
    
    // Fallback: Average of opposite sides (works well for near-rectangular shapes)
    const avgLength = (a + c) / 2;
    const avgWidth = (b + d) / 2;
    return avgLength * avgWidth;
  }
  
  // Regular polygon approximation for n > 4 sides
  const perimeter = sides.reduce((sum, s) => sum + (s.length || 0), 0);
  if (perimeter <= 0) return 0;
  
  const sideLength = perimeter / n;
  return (n * sideLength * sideLength) / (4 * Math.tan(Math.PI / n));
};

/**
 * Calculate the perimeter from sides
 */
export const calculatePerimeter = (sides: SideDimension[]): number => {
  if (!sides || sides.length === 0) return 0;
  return sides.reduce((sum, side) => sum + (side.length || 0), 0);
};

/**
 * Calculate the interior angle of a regular polygon
 * Formula: (n-2) * 180 / n
 */
export const getRegularPolygonInteriorAngle = (numberOfSides: number): number => {
  if (numberOfSides < 3) return 90;
  return ((numberOfSides - 2) * 180) / numberOfSides;
};

/**
 * Create a default side with a unique ID
 */
export const createDefaultSide = (index: number, totalSides: number = 4): SideDimension => {
  const interiorAngle = getRegularPolygonInteriorAngle(totalSides);
  return {
    id: crypto.randomUUID(),
    length: 0,
    angle: Math.round(interiorAngle * 10) / 10,
    isShared: false,
    isRoadBordering: false,
    roadType: 'none'
  };
};

/**
 * Create an array of default sides for a polygon
 */
export const createDefaultSides = (numberOfSides: number = 4): SideDimension[] => {
  const interiorAngle = getRegularPolygonInteriorAngle(numberOfSides);
  const roundedAngle = Math.round(interiorAngle * 10) / 10;
  
  return Array.from({ length: numberOfSides }, (_, i) => ({
    id: crypto.randomUUID(),
    length: 0,
    angle: roundedAngle,
    isShared: false,
    isRoadBordering: false,
    roadType: 'none' as const
  }));
};

/**
 * Recalculate angles for all sides when changing the number of sides
 * Preserves lengths and other properties
 */
export const updateSidesForNewPolygon = (
  currentSides: SideDimension[], 
  newSideCount: number
): SideDimension[] => {
  const interiorAngle = getRegularPolygonInteriorAngle(newSideCount);
  const roundedAngle = Math.round(interiorAngle * 10) / 10;
  
  const newSides: SideDimension[] = [];
  
  for (let i = 0; i < newSideCount; i++) {
    if (i < currentSides.length) {
      // Keep existing side but update angle
      newSides.push({ ...currentSides[i], angle: roundedAngle });
    } else {
      // Create new side
      newSides.push(createDefaultSide(i, newSideCount));
    }
  }
  
  return newSides;
};

/**
 * Calculate and update a lot's computed properties (area, perimeter)
 */
export const calculateLotProperties = (lot: LotData): LotData => {
  return {
    ...lot,
    areaSqm: calculatePolygonArea(lot.sides),
    perimeter: calculatePerimeter(lot.sides)
  };
};

/**
 * Validate that lot sides are properly defined
 * Returns true if at least 3 sides have valid lengths
 */
export const validateLotSides = (lot: LotData): boolean => {
  if (!lot.sides || lot.sides.length < 3) return false;
  
  const validSides = lot.sides.filter(side => side.length > 0);
  return validSides.length >= 3;
};

/**
 * Check if a lot has road access (at least one side borders a road)
 */
export const lotHasRoadAccess = (lot: LotData): boolean => {
  return lot.sides.some(side => side.isRoadBordering);
};

/**
 * Calculate the sum of interior angles for a valid polygon
 * A valid n-sided polygon has sum of interior angles = (n-2) * 180°
 */
export const getExpectedAnglesSum = (numberOfSides: number): number => {
  return (numberOfSides - 2) * 180;
};

/**
 * Validate polygon angles (sum should match expected value)
 */
export const validatePolygonAngles = (sides: SideDimension[], tolerance: number = 5): boolean => {
  if (sides.length < 3) return false;
  
  const actualSum = sides.reduce((sum, s) => sum + (s.angle || 0), 0);
  const expectedSum = getExpectedAnglesSum(sides.length);
  
  return Math.abs(actualSum - expectedSum) <= tolerance;
};

/**
 * Get side labels based on the polygon type
 */
export const getSideLabel = (index: number, totalSides: number): string => {
  const CARDINAL_LABELS = ['Nord', 'Est', 'Sud', 'Ouest'];
  const EXTENDED_LABELS = ['Nord', 'Est', 'Sud', 'Ouest', 'Nord-Est', 'Sud-Est', 'Sud-Ouest', 'Nord-Ouest'];
  
  if (totalSides === 4) {
    return CARDINAL_LABELS[index] || `Côté ${index + 1}`;
  } else if (totalSides <= 8) {
    return EXTENDED_LABELS[index] || `Côté ${index + 1}`;
  }
  return `Côté ${index + 1}`;
};

/**
 * Generate a unique subdivision reference
 */
export const generateSubdivisionReference = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LOT-${year}${month}-${random}`;
};

/**
 * Validate remaining area with configurable tolerance
 * @param parentParcelArea - Total area of parent parcel in m²
 * @param totalLotsArea - Sum of all lots areas in m²
 * @param tolerancePercent - Allowed tolerance (default 2%)
 * @returns Validation result with remaining area and status
 */
export const validateRemainingArea = (
  parentParcelArea: number,
  totalLotsArea: number,
  tolerancePercent: number = 2
): { isValid: boolean; remaining: number; percentDiff: number; message?: string } => {
  if (parentParcelArea <= 0) {
    return { 
      isValid: false, 
      remaining: 0, 
      percentDiff: 0,
      message: 'Surface de la parcelle mère invalide' 
    };
  }
  
  const remaining = parentParcelArea - totalLotsArea;
  const percentDiff = Math.abs(remaining / parentParcelArea) * 100;
  
  if (totalLotsArea > parentParcelArea) {
    return {
      isValid: false,
      remaining,
      percentDiff,
      message: `La surface totale des lots (${totalLotsArea.toLocaleString()} m²) dépasse la parcelle mère de ${Math.abs(remaining).toLocaleString()} m²`
    };
  }
  
  if (percentDiff > tolerancePercent) {
    return {
      isValid: false,
      remaining,
      percentDiff,
      message: `Écart de ${percentDiff.toFixed(1)}% - ${remaining.toLocaleString()} m² non attribués (tolérance: ${tolerancePercent}%)`
    };
  }
  
  return {
    isValid: true,
    remaining,
    percentDiff,
    message: percentDiff > 0 
      ? `Surface correcte (écart: ${percentDiff.toFixed(2)}%)`
      : 'Surface parfaitement attribuée'
  };
};

/**
 * Calculate internal roads area based on lot layout
 * @param numberOfLots - Number of lots in subdivision
 * @param parentWidth - Width of parent parcel in meters
 * @param parentHeight - Height of parent parcel in meters  
 * @param roadWidth - Width of internal roads in meters
 */
export const calculateInternalRoadsArea = (
  numberOfLots: number,
  parentWidth: number,
  parentHeight: number,
  roadWidth: number = 6
): number => {
  if (numberOfLots <= 1) return 0;
  
  // Estimate number of road segments based on grid layout
  const cols = Math.ceil(Math.sqrt(numberOfLots));
  const rows = Math.ceil(numberOfLots / cols);
  
  // Horizontal roads (cols - 1 segments across the width)
  const horizontalRoadArea = (rows - 1) * parentWidth * roadWidth;
  
  // Vertical roads (rows - 1 segments across the height)
  const verticalRoadArea = (cols - 1) * parentHeight * roadWidth;
  
  // Subtract intersections counted twice
  const intersectionArea = (rows - 1) * (cols - 1) * roadWidth * roadWidth;
  
  return Math.max(0, horizontalRoadArea + verticalRoadArea - intersectionArea);
};

/**
 * Duplicate a lot with proper ID regeneration
 */
export const duplicateLot = (lot: LotData, newLotNumber: string): LotData => {
  return {
    ...lot,
    id: crypto.randomUUID(),
    lotNumber: newLotNumber,
    sides: lot.sides.map(side => ({
      ...side,
      id: crypto.randomUUID(),
      // Reset sharing info since it's a new lot
      isShared: false,
      adjacentLotNumber: undefined
    })),
    // Offset position slightly
    position: {
      x: lot.position.x + 10,
      y: lot.position.y + 10
    }
  };
};

/**
 * Generate multiple duplicates of a lot
 */
export const duplicateLotMultiple = (
  lot: LotData, 
  count: number, 
  startingNumber: number
): LotData[] => {
  const duplicates: LotData[] = [];
  
  for (let i = 0; i < count; i++) {
    const newNumber = startingNumber + i;
    const newLotNumber = `LOT-${String(newNumber).padStart(3, '0')}`;
    
    duplicates.push({
      ...lot,
      id: crypto.randomUUID(),
      lotNumber: newLotNumber,
      sides: lot.sides.map(side => ({
        ...side,
        id: crypto.randomUUID(),
        isShared: false,
        adjacentLotNumber: undefined
      })),
      position: {
        x: lot.position.x + (i % 3 + 1) * 50,
        y: lot.position.y + Math.floor(i / 3) * 50
      }
    });
  }
  
  return duplicates;
};
