// Types pour le formulaire de lotissement amélioré

export interface PolygonPoint {
  x: number;
  y: number;
  lat?: number;
  lng?: number;
}

export interface SideDimension {
  id: string;
  length: number;
  angle: number; // Angle au début de ce côté
  isShared: boolean;
  adjacentLotNumber?: string;
  isRoadBordering: boolean;
  roadType: 'existing' | 'created' | 'none';
  roadName?: string;
  roadWidth?: number;
  surfaceType?: 'asphalt' | 'gravel' | 'earth' | 'paved';
  notes?: string;
}

export interface LotData {
  id: string;
  lotNumber: string;
  // Géométrie polygonale (3-8 côtés)
  sides: SideDimension[];
  numberOfSides: number;
  // Position pour le croquis
  position: { x: number; y: number };
  rotation: number; // Rotation en degrés
  // Calculs automatiques
  areaSqm: number;
  perimeter: number;
  // Caractéristiques
  isBuilt: boolean;
  hasFence: boolean;
  fenceType?: 'wall' | 'wire' | 'hedge' | 'mixed';
  constructionType?: 'house' | 'building' | 'warehouse' | 'other';
  intendedUse: 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'mixed';
  notes?: string;
  // Points GPS pour chaque coin (optionnel)
  gpsPoints?: PolygonPoint[];
  // Couleur pour le croquis
  color?: string;
}

export interface InternalRoad {
  id: string;
  name: string;
  width: number;
  surfaceType: 'asphalt' | 'gravel' | 'earth' | 'paved' | 'planned';
  isExisting: boolean;
  // Points du tracé
  points: { x: number; y: number }[];
  // Lots bordés
  borderingLots: string[];
}

export interface EnvironmentFeature {
  id: string;
  type: 'lake' | 'river' | 'mountain' | 'forest' | 'marsh' | 'cliff' | 'building' | 'road' | 'powerline' | 'other';
  name?: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  direction?: 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';
  distance?: number; // Distance par rapport à la parcelle
  notes?: string;
  color?: string;
}

export interface ParentParcelData {
  area: number;
  location: string;
  owner: string;
  titleRef: string;
  titleType: string;
  titleIssueDate: string;
  gps: { lat: string; lng: string };
  sides: SideDimension[];
  numberOfSides: number;
}

export interface SketchSettings {
  showGrid: boolean;
  gridSize: number;
  showScale: boolean;
  showNorthIndicator: boolean;
  showLegend: boolean;
  showDimensions: boolean;
  showRoads: boolean;
  showEnvironment: boolean;
  backgroundColor: string;
  lotColors: {
    residential: string;
    commercial: string;
    industrial: string;
    agricultural: string;
    mixed: string;
  };
}

export const DEFAULT_SKETCH_SETTINGS: SketchSettings = {
  showGrid: true,
  gridSize: 10,
  showScale: true,
  showNorthIndicator: true,
  showLegend: true,
  showDimensions: true,
  showRoads: true,
  showEnvironment: true,
  backgroundColor: '#ffffff',
  lotColors: {
    residential: '#22c55e',
    commercial: '#3b82f6',
    industrial: '#f59e0b',
    agricultural: '#84cc16',
    mixed: '#8b5cf6'
  }
};

export const ENVIRONMENT_ICONS: Record<EnvironmentFeature['type'], string> = {
  lake: '🌊',
  river: '🏞️',
  mountain: '⛰️',
  forest: '🌲',
  marsh: '🌿',
  cliff: '🪨',
  building: '🏢',
  road: '🛤️',
  powerline: '⚡',
  other: '📍'
};

export const FENCE_TYPES = [
  { value: 'wall', label: 'Mur', icon: '🧱' },
  { value: 'wire', label: 'Grillage', icon: '🔗' },
  { value: 'hedge', label: 'Haie', icon: '🌿' },
  { value: 'mixed', label: 'Mixte', icon: '🏗️' }
];

export const SURFACE_TYPES = [
  { value: 'asphalt', label: 'Asphalte', color: '#374151' },
  { value: 'gravel', label: 'Gravier', color: '#9ca3af' },
  { value: 'earth', label: 'Terre', color: '#92400e' },
  { value: 'paved', label: 'Pavé', color: '#6b7280' },
  { value: 'planned', label: 'Planifié', color: '#ddd' }
];
