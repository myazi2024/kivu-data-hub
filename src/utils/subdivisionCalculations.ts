/**
 * Shared calculation utilities for subdivision forms
 * Centralizes area, perimeter, and validation calculations
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
    // Quadrilateral: Use average of opposite sides
    const side1 = sides[0].length || 0;
    const side2 = sides[1].length || 0;
    const side3 = sides[2].length || 0;
    const side4 = sides[3].length || 0;
    
    const avgLength = (side1 + side3) / 2;
    const avgWidth = (side2 + side4) / 2;
    
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
 * Create a default side with a unique ID
 */
export const createDefaultSide = (index: number, totalSides: number = 4): SideDimension => {
  // Interior angles of a regular polygon = (n-2) * 180 / n
  const interiorAngle = totalSides >= 3 ? ((totalSides - 2) * 180) / totalSides : 90;
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
  // Interior angles of a regular polygon = (n-2) * 180 / n
  const interiorAngle = numberOfSides >= 3 ? ((numberOfSides - 2) * 180) / numberOfSides : 90;
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
 * Get the label for a side based on index and total sides
 */
export const getSideLabel = (index: number, totalSides: number): string => {
  if (totalSides === 4) {
    return ['Nord', 'Est', 'Sud', 'Ouest'][index] || `Côté ${index + 1}`;
  }
  return `Côté ${index + 1}`;
};

/**
 * Generate a unique reference number for subdivision requests
 */
export const generateSubdivisionReference = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `LOT-${year}${month}-${random}`;
};

/**
 * Check if remaining area is valid (not negative and not exceeding a threshold)
 */
export const validateRemainingArea = (
  parentParcelArea: number, 
  totalLotsArea: number, 
  tolerancePercent: number = 5
): { isValid: boolean; remaining: number; message?: string } => {
  const remaining = parentParcelArea - totalLotsArea;
  const toleranceArea = (parentParcelArea * tolerancePercent) / 100;
  
  if (remaining < -toleranceArea) {
    return {
      isValid: false,
      remaining,
      message: `La surface totale dépasse la parcelle mère de ${Math.abs(remaining).toLocaleString()} m² (${Math.abs((remaining / parentParcelArea) * 100).toFixed(1)}%)`
    };
  }
  
  if (remaining > toleranceArea && remaining > 100) {
    return {
      isValid: true, // Valid but with warning
      remaining,
      message: `Surface non attribuée importante: ${remaining.toLocaleString()} m² (${((remaining / parentParcelArea) * 100).toFixed(1)}%)`
    };
  }
  
  return { isValid: true, remaining };
};
