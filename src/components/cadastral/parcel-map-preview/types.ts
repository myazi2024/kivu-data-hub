import type { RoadSideInfo } from '../RoadBorderingSidesPanel';
import type { ServitudeInfo } from '../ParcelSidesDimensionsPanel';
import type { MapConfig } from '@/hooks/useMapConfig';

export interface Coordinate {
  borne: string;
  lat: string;
  lng: string;
}

export interface ConflictingParcel {
  parcelNumber: string;
  ownerName: string;
  location: string;
  coordinates: [number, number][];
  overlapArea?: number;
}

export interface ParcelSide {
  name: string;
  length: string;
}

// Type pour les formes géométriques (constructions) — tracé par sommets
export interface BuildingShape {
  id: string;
  vertices: { lat: number; lng: number }[];
  sides: { name: string; length: string }[];
  areaSqm: number;
  perimeterM: number;
  linkedIndex?: number; // 0 = construction principale, 1+ = additionnelles
  heightM?: number; // Hauteur de la construction en mètres
}

export interface ParcelMapPreviewProps {
  coordinates: Coordinate[];
  onCoordinatesUpdate: (coordinates: Coordinate[]) => void;
  config?: MapConfig;
  currentParcelNumber?: string;
  roadSides?: RoadSideInfo[];
  onRoadSidesChange?: (roadSides: RoadSideInfo[]) => void;
  parcelSides?: ParcelSide[];
  onParcelSidesUpdate?: (sides: ParcelSide[]) => void;
  enableDrawingMode?: boolean;
  onSurfaceChange?: (surface: number) => void;
  buildingShapes?: BuildingShape[];
  onBuildingShapesChange?: (shapes: BuildingShape[]) => void;
  servitude?: ServitudeInfo;
  onServitudeChange?: (servitude: ServitudeInfo) => void;
  isTerrainNu?: boolean;
  requiredBuildingCount?: number;
  constructionLabels?: string[];
  /** true = la hauteur se saisit dans le bloc Construction (CCC) : l'input du croquis est masqué. */
  heightInputExternal?: boolean;
}
