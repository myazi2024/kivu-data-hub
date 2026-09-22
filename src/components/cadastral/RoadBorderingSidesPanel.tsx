/**
 * Modèle et libellés des côtés de parcelle (limites, murs, routes).
 *
 * Historiquement ce fichier contenait aussi un panneau de saisie `RoadBorderingSidesPanel`,
 * remplacé depuis par `ParcelSidesDimensionsPanel`. Seuls le type et les libellés subsistent.
 */

export interface RoadSideInfo {
  sideIndex: number;
  bordersRoad: boolean;
  roadType?: string;
  roadName?: string;
  roadWidth?: number;
  /** Revêtement de la chaussée (accessibilité, viabilité). */
  roadSurface?: string;
  /** Éclairage public devant la parcelle sur ce côté. */
  hasStreetLighting?: boolean;
  /** Nombre de lampadaires bordant la parcelle sur ce côté. */
  streetLampCount?: number;
  /** Présence d'un caniveau le long de ce côté (assainissement). */
  hasGutter?: boolean;
  /** La parcelle est-elle raccordée au caniveau depuis ce côté ? */
  gutterConnected?: boolean;
  orientation?: string;
  length?: number;
  isConfirmed?: boolean;
  /** Type dominant (dérivé) : 'route' dès qu'une route est déclarée. */
  borderType?: 'route' | 'mur_mitoyen';
  /** Le côté est bordé par une route (cumulable avec un mur). */
  hasRoad?: boolean;
  /** Le côté est fermé par un mur (cumulable avec une route). */
  hasWall?: boolean;
  /** Nature de la limite non routière : mur ou simple limite de parcelle. */
  boundaryKind?: 'mur' | 'limite';
  wallHeight?: number;
  wallMaterial?: string;
}

/** Revêtements de chaussée usuels en RDC. */
export const ROAD_SURFACE_OPTIONS = [
  { value: 'asphalte', label: 'Asphalte / bitume' },
  { value: 'beton', label: 'Béton' },
  { value: 'paves', label: 'Pavés' },
  { value: 'gravier', label: 'Gravier / latérite' },
  { value: 'terre', label: 'Terre battue' },
  { value: 'non_revetue', label: 'Non revêtue' },
];

/** Libellé lisible d'un revêtement (valeur stockée ou libellé déjà humain). */
export const roadSurfaceLabel = (value?: string): string =>
  ROAD_SURFACE_OPTIONS.find(o => o.value === value)?.label || value || '—';
