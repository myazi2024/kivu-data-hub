// Types pour le module de lotissement v2

export interface LotAnnotation {
  id: string;
  type: 'circle' | 'square' | 'rectangle' | 'trapeze' | 'polygon';
  position: Point2D; // relative to lot bounding box (0-1)
  scale?: number;
}

export const CLIPART_TYPES: { type: LotAnnotation['type']; label: string; icon: string }[] = [
  { type: 'circle', label: 'Cercle', icon: 'Circle' },
  { type: 'square', label: 'Carré', icon: 'Square' },
  { type: 'rectangle', label: 'Rectangle', icon: 'RectangleHorizontal' },
  { type: 'trapeze', label: 'Trapèze', icon: 'Triangle' },
  { type: 'polygon', label: 'Polygone', icon: 'Hexagon' },
];

export interface SubdivisionLot {
  id: string;
  lotNumber: string;
  // Polygon vertices relative to parent parcel (0-1 normalized coordinates)
  vertices: Point2D[];
  // Computed values
  areaSqm: number;
  perimeterM: number;
  // Properties
  intendedUse: 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'mixed';
  ownerName?: string;
  isBuilt: boolean;
  hasFence: boolean;
  fenceType?: 'wall' | 'wire' | 'hedge' | 'mixed';
  constructionType?: 'house' | 'building' | 'warehouse' | 'other';
  notes?: string;
  // Display
  color: string;
  // Annotations / cliparts placed on this lot
  annotations?: LotAnnotation[];
  // GPS coordinates (computed from parent parcel)
  gpsCoordinates?: GpsPoint[];
}

export interface Point2D {
  x: number;
  y: number;
}

export interface GpsPoint {
  lat: number;
  lng: number;
}

export interface SubdivisionRoad {
  id: string;
  name: string;
  widthM: number;
  surfaceType: 'asphalt' | 'gravel' | 'earth' | 'paved' | 'planned';
  isExisting: boolean;
  // Path as series of points (normalized 0-1)
  path: Point2D[];
}

export interface SubdivisionCommonSpace {
  id: string;
  type: 'green_space' | 'parking' | 'playground' | 'market' | 'drainage' | 'other';
  name: string;
  vertices: Point2D[];
  areaSqm: number;
  color: string;
}

export interface SubdivisionServitude {
  id: string;
  type: 'passage' | 'drainage' | 'utility' | 'view' | 'other';
  description: string;
  affectedLots: string[];
  widthM?: number;
  path?: Point2D[];
}

export interface PlanElements {
  showGrid: boolean;
  showNorthIndicator: boolean;
  showLegend: boolean;
  showDimensions: boolean;
  showLotNumbers: boolean;
  showAreas: boolean;
  showRoads: boolean;
  showCommonSpaces: boolean;
  showServitudes: boolean;
  showOwnerNames: boolean;
  showScale: boolean;
}

export const DEFAULT_PLAN_ELEMENTS: PlanElements = {
  showGrid: true,
  showNorthIndicator: true,
  showLegend: true,
  showDimensions: true,
  showLotNumbers: true,
  showAreas: true,
  showRoads: true,
  showCommonSpaces: true,
  showServitudes: true,
  showOwnerNames: false,
  showScale: true,
};

export interface SubdivisionPlanData {
  lots: SubdivisionLot[];
  roads: SubdivisionRoad[];
  commonSpaces: SubdivisionCommonSpace[];
  servitudes: SubdivisionServitude[];
  planElements: PlanElements;
}

export interface ParentParcelInfo {
  parcelNumber: string;
  areaSqm: number;
  location: string;
  ownerName: string;
  titleReference: string;
  titleType: string;
  titleIssueDate: string;
  gpsCoordinates: GpsPoint[];
  parcelSides?: any;
}

export interface RequesterInfo {
  firstName: string;
  lastName: string;
  middleName?: string;
  phone: string;
  email?: string;
  type: 'owner' | 'mandatary' | 'notary' | 'other';
  isOwner: boolean;
}

export type SubdivisionStep = 'parcel' | 'designer' | 'plan' | 'summary';

// Parcel side info
export interface ParcelSideInfo {
  borderType?: 'route' | 'mur_mitoyen';
  bordersRoad?: boolean;
  isConfirmed?: boolean;
  roadType?: string;
  roadName?: string;
  roadWidth?: number | string;
  orientation?: string;
  length?: number | string;
  [key: string]: any;
}

// Colors for lot usage types
export const LOT_COLORS: Record<SubdivisionLot['intendedUse'], string> = {
  residential: '#22c55e',
  commercial: '#3b82f6',
  industrial: '#f59e0b',
  agricultural: '#84cc16',
  mixed: '#8b5cf6',
};

export const USAGE_LABELS: Record<SubdivisionLot['intendedUse'], string> = {
  residential: 'Résidentiel',
  commercial: 'Commercial',
  industrial: 'Industriel',
  agricultural: 'Agricole',
  mixed: 'Mixte',
};

export const ROAD_SURFACE_LABELS: Record<SubdivisionRoad['surfaceType'], string> = {
  asphalt: 'Asphalte',
  gravel: 'Gravier',
  earth: 'Terre',
  paved: 'Pavé',
  planned: 'Planifié',
};

export const COMMON_SPACE_LABELS: Record<SubdivisionCommonSpace['type'], string> = {
  green_space: 'Espace vert',
  parking: 'Parking',
  playground: 'Aire de jeux',
  market: 'Marché',
  drainage: 'Drainage',
  other: 'Autre',
};

export const COMMON_SPACE_COLORS: Record<SubdivisionCommonSpace['type'], string> = {
  green_space: '#16a34a',
  parking: '#6b7280',
  playground: '#f97316',
  market: '#ef4444',
  drainage: '#06b6d4',
  other: '#a855f7',
};
