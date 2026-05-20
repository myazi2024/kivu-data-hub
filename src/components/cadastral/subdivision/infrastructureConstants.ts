// Shared constants for per-road infrastructures (drainage canal + solar lighting).

export const DRAINAGE_CANAL_MATERIALS = [
  'beton',
  'pvc',
  'maconnerie',
  'pierre',
  'metal',
  'composite',
] as const;
export type DrainageCanalMaterial = typeof DRAINAGE_CANAL_MATERIALS[number];

export const DRAINAGE_CANAL_MATERIAL_LABELS: Record<DrainageCanalMaterial, string> = {
  beton: 'Béton armé',
  pvc: 'PVC',
  maconnerie: 'Maçonnerie',
  pierre: 'Pierre / moellons',
  metal: 'Métal',
  composite: 'Composite',
};

export const DRAINAGE_CANAL_TYPES = ['ouvert', 'couvert', 'enterre'] as const;
export type DrainageCanalType = typeof DRAINAGE_CANAL_TYPES[number];

export const DRAINAGE_CANAL_TYPE_LABELS: Record<DrainageCanalType, string> = {
  ouvert: 'Ouvert',
  couvert: 'Couvert (avec dalles)',
  enterre: 'Enterré',
};

export const SIDE_OPTIONS = ['left', 'right', 'both', 'any'] as const;
export type CanalSide = typeof SIDE_OPTIONS[number];
export const SIDE_LABELS: Record<string, string> = {
  left: 'Gauche',
  right: 'Droite',
  both: 'Les deux côtés',
  any: 'Au choix',
  alternating: 'Alterné',
};

export const LIGHTING_SIDE_OPTIONS = ['left', 'right', 'both', 'alternating', 'any'] as const;
export type LightingSide = typeof LIGHTING_SIDE_OPTIONS[number];

export interface DrainageCanalSpec {
  widthM: number;
  depthM: number;
  material: DrainageCanalMaterial | string;
  type: DrainageCanalType | string;
  slopePct?: number;
  side: CanalSide | string;
  exutoire?: string;
}

export interface SolarLightingSpec {
  poleHeightM: number;
  lumens: number;
  beamAngleDeg: number;
  spacingM: number;
  batteryHours: number;
  side: LightingSide | string;
}

/**
 * Revêtement de voie — piloté par les règles admin de zonage
 * (`require_road_surface`, `road_surface_allowed_materials`,
 * `road_surface_min/max_thickness_cm`) et le catalogue
 * `subdivision_road_surface_materials`.
 */
export interface RoadSurfaceSpec {
  /** Clé matériau alignée sur `subdivision_road_surface_materials.key`. */
  material: string;
  /** Épaisseur en centimètres, bornée par la règle de zonage. */
  thicknessCm: number;
}

