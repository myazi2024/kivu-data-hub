/**
 * Lot Layout Generator
 * Centralized logic for generating subdivision lot layouts
 */

import { LotData, SideDimension, ParentParcelData } from '@/components/cadastral/subdivision/types';
import { getRegularPolygonInteriorAngle } from './subdivisionCalculations';

export type LayoutType = 'grid' | 'horizontal' | 'vertical' | 'custom';
export type UsageType = 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'mixed';

export interface LayoutConfig {
  layoutType: LayoutType;
  numberOfLots: number;
  defaultUsage: UsageType;
  includeInternalRoads: boolean;
  internalRoadWidth: number;
  lotNumberPrefix: string;
  reserveCommonAreas: boolean;
  commonAreaPercent: number;
}

export interface LayoutOption {
  id: LayoutType;
  name: string;
  description: string;
  minLots: number;
  maxLots: number;
}

export const LAYOUT_OPTIONS: LayoutOption[] = [
  { 
    id: 'grid', 
    name: 'Grille', 
    description: 'Lots répartis en grille régulière',
    minLots: 4,
    maxLots: 100
  },
  { 
    id: 'horizontal', 
    name: 'Bandes horizontales', 
    description: 'Lots alignés horizontalement',
    minLots: 2,
    maxLots: 50
  },
  { 
    id: 'vertical', 
    name: 'Bandes verticales', 
    description: 'Lots alignés verticalement',
    minLots: 2,
    maxLots: 50
  },
  { 
    id: 'custom', 
    name: 'Personnalisé', 
    description: 'Définir manuellement chaque lot',
    minLots: 2,
    maxLots: 200
  }
];

export const USAGE_TYPES: { id: UsageType; name: string; color: string }[] = [
  { id: 'residential', name: 'Résidentiel', color: 'bg-green-500' },
  { id: 'commercial', name: 'Commercial', color: 'bg-blue-500' },
  { id: 'industrial', name: 'Industriel', color: 'bg-amber-500' },
  { id: 'agricultural', name: 'Agricole', color: 'bg-lime-500' },
  { id: 'mixed', name: 'Mixte', color: 'bg-purple-500' }
];

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  layoutType: 'grid',
  numberOfLots: 4,
  defaultUsage: 'residential',
  includeInternalRoads: true,
  internalRoadWidth: 6,
  lotNumberPrefix: 'LOT',
  reserveCommonAreas: false,
  commonAreaPercent: 10
};

/**
 * Minimum legal lot surface in m² (configurable by zone)
 */
export const MIN_LOT_SURFACE_SQM = 100;

/**
 * Calculate parent parcel dimensions from sides or area
 */
export const getParentDimensions = (parentParcel: ParentParcelData): {
  width: number;
  height: number;
  isEstimated: boolean;
} => {
  if (!parentParcel.sides || parentParcel.sides.length < 4) {
    const sideLength = Math.sqrt(parentParcel.area);
    return { width: sideLength, height: sideLength, isEstimated: true };
  }
  
  const sides = parentParcel.sides;
  const width = Math.max(sides[0]?.length || 0, sides[2]?.length || 0) || Math.sqrt(parentParcel.area);
  const height = Math.max(sides[1]?.length || 0, sides[3]?.length || 0) || Math.sqrt(parentParcel.area);
  
  return { width, height, isEstimated: false };
};

/**
 * Calculate available area after accounting for internal roads
 * Ensures result is never negative (minimum 70% of parent area)
 */
export const calculateAvailableArea = (
  parentArea: number,
  numberOfLots: number,
  parentWidth: number,
  parentHeight: number,
  includeRoads: boolean,
  roadWidth: number
): number => {
  if (!includeRoads || numberOfLots <= 1) return parentArea;
  
  const cols = Math.ceil(Math.sqrt(numberOfLots * (parentWidth / parentHeight)));
  const rows = Math.ceil(numberOfLots / cols);
  
  // Calculate road area
  const horizontalRoadArea = (rows - 1) * parentWidth * roadWidth;
  const verticalRoadArea = (cols - 1) * parentHeight * roadWidth;
  const intersectionArea = (rows - 1) * (cols - 1) * roadWidth * roadWidth;
  
  const roadArea = horizontalRoadArea + verticalRoadArea - intersectionArea;
  
  // Ensure minimum 70% available
  return Math.max(parentArea - roadArea, parentArea * 0.7);
};

/**
 * Calculate grid dimensions based on layout type
 */
export const calculateGridDimensions = (
  layoutType: LayoutType,
  numberOfLots: number,
  parentWidth: number,
  parentHeight: number
): { cols: number; rows: number } => {
  switch (layoutType) {
    case 'horizontal':
      return { cols: numberOfLots, rows: 1 };
    case 'vertical':
      return { cols: 1, rows: numberOfLots };
    case 'grid':
    default:
      const aspectRatio = parentWidth / parentHeight;
      const cols = Math.max(1, Math.round(Math.sqrt(numberOfLots * aspectRatio)));
      const rows = Math.ceil(numberOfLots / cols);
      return { cols, rows };
  }
};

/**
 * Determine road type for a side based on position
 */
const getRoadType = (
  isBorder: boolean, 
  hasAdjacentLot: boolean, 
  includeRoads: boolean
): 'existing' | 'created' | 'none' => {
  if (isBorder) return 'existing';
  if (hasAdjacentLot && includeRoads) return 'created';
  return 'none';
};

/**
 * Create side dimensions for a lot in the grid
 * Ensures logical consistency: a side cannot be both shared AND road bordering
 */
const createLotSides = (
  lotWidth: number,
  lotHeight: number,
  row: number,
  col: number,
  rows: number,
  cols: number,
  numberOfLots: number,
  lotIndex: number,
  includeInternalRoads: boolean,
  internalRoadWidth: number
): SideDimension[] => {
  const interiorAngle = getRegularPolygonInteriorAngle(4);
  
  // Determine border positions
  const isNorthBorder = row === 0;
  const isSouthBorder = row === rows - 1;
  const isEastBorder = col === cols - 1;
  const isWestBorder = col === 0;
  
  // Determine if adjacent lots exist
  const hasNorthNeighbor = row > 0;
  const hasSouthNeighbor = row < rows - 1 && ((row + 1) * cols + col) < numberOfLots;
  const hasEastNeighbor = col < cols - 1 && (lotIndex + 1) < numberOfLots;
  const hasWestNeighbor = col > 0;

  // Create sides with consistent logic:
  // - isShared: TRUE only if adjacent to another lot AND NO road between them
  // - isRoadBordering: TRUE if on border OR if road exists between lots
  const sides: SideDimension[] = [
    // Nord (index 0)
    {
      id: crypto.randomUUID(),
      length: lotWidth,
      angle: interiorAngle,
      // Shared only if neighbor exists and no road
      isShared: hasNorthNeighbor && !includeInternalRoads,
      isRoadBordering: isNorthBorder || (hasNorthNeighbor && includeInternalRoads),
      roadType: getRoadType(isNorthBorder, hasNorthNeighbor, includeInternalRoads),
      roadWidth: (hasNorthNeighbor && includeInternalRoads) ? internalRoadWidth : undefined,
      roadName: (hasNorthNeighbor && includeInternalRoads) ? `Voie H${row}` : undefined
    },
    // Est (index 1)
    {
      id: crypto.randomUUID(),
      length: lotHeight,
      angle: interiorAngle,
      isShared: hasEastNeighbor && !includeInternalRoads,
      isRoadBordering: isEastBorder || (hasEastNeighbor && includeInternalRoads),
      roadType: getRoadType(isEastBorder, hasEastNeighbor, includeInternalRoads),
      roadWidth: (hasEastNeighbor && includeInternalRoads) ? internalRoadWidth : undefined,
      roadName: (hasEastNeighbor && includeInternalRoads) ? `Voie V${col + 1}` : undefined
    },
    // Sud (index 2)
    {
      id: crypto.randomUUID(),
      length: lotWidth,
      angle: interiorAngle,
      isShared: hasSouthNeighbor && !includeInternalRoads,
      isRoadBordering: isSouthBorder || (hasSouthNeighbor && includeInternalRoads),
      roadType: getRoadType(isSouthBorder, hasSouthNeighbor, includeInternalRoads),
      roadWidth: (hasSouthNeighbor && includeInternalRoads) ? internalRoadWidth : undefined,
      roadName: (hasSouthNeighbor && includeInternalRoads) ? `Voie H${row + 1}` : undefined
    },
    // Ouest (index 3)
    {
      id: crypto.randomUUID(),
      length: lotHeight,
      angle: interiorAngle,
      isShared: hasWestNeighbor && !includeInternalRoads,
      isRoadBordering: isWestBorder || (hasWestNeighbor && includeInternalRoads),
      roadType: getRoadType(isWestBorder, hasWestNeighbor, includeInternalRoads),
      roadWidth: (hasWestNeighbor && includeInternalRoads) ? internalRoadWidth : undefined,
      roadName: (hasWestNeighbor && includeInternalRoads) ? `Voie V${col}` : undefined
    }
  ];

  return sides;
};

/**
 * Generate lot layout from configuration
 */
export const generateLotLayout = (
  parentParcel: ParentParcelData,
  config: LayoutConfig
): LotData[] => {
  const { 
    layoutType, 
    numberOfLots, 
    defaultUsage, 
    includeInternalRoads, 
    internalRoadWidth,
    lotNumberPrefix 
  } = config;
  
  const dimensions = getParentDimensions(parentParcel);
  const { width: parentWidth, height: parentHeight } = dimensions;
  
  const roadOffset = includeInternalRoads ? internalRoadWidth : 0;
  const { cols, rows } = calculateGridDimensions(layoutType, numberOfLots, parentWidth, parentHeight);
  
  // Calculate lot dimensions
  const lotWidth = (parentWidth - (cols - 1) * roadOffset) / cols;
  const lotHeight = (parentHeight - (rows - 1) * roadOffset) / rows;
  
  const lots: LotData[] = [];
  let lotIndex = 0;
  
  for (let row = 0; row < rows && lotIndex < numberOfLots; row++) {
    for (let col = 0; col < cols && lotIndex < numberOfLots; col++) {
      const lotNumber = `${lotNumberPrefix}-${String(lotIndex + 1).padStart(3, '0')}`;
      
      // Calculate position
      const x = col * (lotWidth + roadOffset) + lotWidth / 2;
      const y = row * (lotHeight + roadOffset) + lotHeight / 2;
      
      // Create sides
      const sides = createLotSides(
        lotWidth,
        lotHeight,
        row,
        col,
        rows,
        cols,
        numberOfLots,
        lotIndex,
        includeInternalRoads,
        internalRoadWidth
      );
      
      const lot: LotData = {
        id: crypto.randomUUID(),
        lotNumber,
        sides,
        numberOfSides: 4,
        position: { x, y },
        rotation: 0,
        areaSqm: Math.round(lotWidth * lotHeight),
        perimeter: Math.round(2 * (lotWidth + lotHeight)),
        isBuilt: false,
        hasFence: false,
        intendedUse: defaultUsage,
        color: USAGE_TYPES.find(u => u.id === defaultUsage)?.color
      };
      
      lots.push(lot);
      lotIndex++;
    }
  }
  
  return lots;
};

/**
 * Validate generated lots
 */
export interface LotValidationResult {
  isValid: boolean;
  hasRoadAccess: boolean;
  meetsMinSurface: boolean;
  totalAreaValid: boolean;
  issues: string[];
}

export const validateGeneratedLots = (
  lots: LotData[],
  parentArea: number,
  minSurfaceSqm: number = MIN_LOT_SURFACE_SQM,
  tolerancePercent: number = 5
): LotValidationResult => {
  const issues: string[] = [];
  
  // Check road access for all lots
  const lotsWithoutAccess = lots.filter(lot => 
    !lot.sides.some(side => side.isRoadBordering)
  );
  const hasRoadAccess = lotsWithoutAccess.length === 0;
  if (!hasRoadAccess) {
    issues.push(`${lotsWithoutAccess.length} lot(s) sans accès voirie`);
  }
  
  // Check minimum surface
  const lotsUnderMin = lots.filter(lot => lot.areaSqm < minSurfaceSqm);
  const meetsMinSurface = lotsUnderMin.length === 0;
  if (!meetsMinSurface) {
    issues.push(`${lotsUnderMin.length} lot(s) sous la surface minimum (${minSurfaceSqm} m²)`);
  }
  
  // Check total area
  const totalArea = lots.reduce((sum, lot) => sum + lot.areaSqm, 0);
  const areaDiff = Math.abs(totalArea - parentArea) / parentArea * 100;
  const totalAreaValid = areaDiff <= tolerancePercent;
  if (!totalAreaValid) {
    issues.push(`Écart de surface: ${areaDiff.toFixed(1)}% (tolérance: ${tolerancePercent}%)`);
  }
  
  return {
    isValid: hasRoadAccess && meetsMinSurface && totalAreaValid,
    hasRoadAccess,
    meetsMinSurface,
    totalAreaValid,
    issues
  };
};
