import {
  getAllProvinces, getVillesForProvince, getCommunesForVille, getQuartiersForCommune,
  getAvenuesForQuartier, getTerritoiresForProvince, getCollectivitesForTerritoire,
} from '@/lib/geographicData';

export const NONE = '__none__'; // marqueur "non sélectionné" (Radix Select n'autorise pas value="")

export interface ZoningRule {
  id: string;
  section_type: 'urban' | 'rural';
  location_name: string;
  min_lot_area_sqm: number;
  max_lot_area_sqm: number | null;
  min_road_width_m: number;
  recommended_road_width_m: number;
  min_common_space_pct: number;
  min_front_road_m: number;
  max_lots_per_request: number | null;
  // Contraintes parcelle-mère
  parent_min_area_sqm: number;
  parent_max_area_sqm: number | null;
  allow_if_active_dispute: boolean;
  allow_if_active_mortgage: boolean;
  require_registered_title: boolean;
  min_title_age_years: number;
  allow_if_pending_mutation: boolean;
  require_gps_coordinates: boolean;
  min_gps_points: number;
  allow_if_pending_subdivision: boolean;
  exclude_title_types: string[];
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Drainage canal (per road)
  require_drainage_canal?: boolean;
  drainage_canal_min_width_m?: number | null;
  drainage_canal_min_depth_m?: number | null;
  drainage_canal_allowed_materials?: string[];
  drainage_canal_allowed_types?: string[];
  drainage_canal_min_slope_pct?: number | null;
  drainage_canal_required_sides?: string;
  // Solar lighting (per road)
  require_solar_lighting?: boolean;
  solar_lighting_min_pole_height_m?: number | null;
  solar_lighting_min_lumens?: number | null;
  solar_lighting_beam_angle_deg?: number | null;
  solar_lighting_max_spacing_m?: number | null;
  solar_lighting_min_battery_hours?: number | null;
  solar_lighting_required_sides?: string;
  // Road surface (global per request)
  require_road_surface?: boolean;
  road_surface_allowed_materials?: string[];
  road_surface_min_thickness_cm?: number | null;
  road_surface_max_thickness_cm?: number | null;
}

export const emptyForm = {
  section_type: 'urban' as 'urban' | 'rural',
  // Géographie cascadée (urbain : province > ville > commune > quartier > avenue / rural : province > territoire > collectivité > groupement > village)
  province: '',
  ville: '',
  commune: '',
  quartier: '',
  avenue: '',
  territoire: '',
  collectivite: '',
  groupement: '',
  village: '',
  apply_to_default: false, // si coché => location_name = '*'
  min_lot_area_sqm: '200',
  max_lot_area_sqm: '5000',
  min_road_width_m: '6',
  recommended_road_width_m: '8',
  min_common_space_pct: '5',
  min_front_road_m: '10',
  max_lots_per_request: '50',
  // Contraintes parcelle-mère
  parent_min_area_sqm: '1000',
  parent_max_area_sqm: '',
  allow_if_active_dispute: false,
  allow_if_active_mortgage: false,
  require_registered_title: true,
  min_title_age_years: '0',
  allow_if_pending_mutation: false,
  require_gps_coordinates: true,
  min_gps_points: '3',
  allow_if_pending_subdivision: false,
  exclude_title_types: '' as string,
  notes: '',
  is_active: true,
  // Drainage canal
  require_drainage_canal: false,
  drainage_canal_min_width_m: '',
  drainage_canal_min_depth_m: '',
  drainage_canal_allowed_materials: [] as string[],
  drainage_canal_allowed_types: [] as string[],
  drainage_canal_min_slope_pct: '',
  drainage_canal_required_sides: 'any',
  // Solar lighting
  require_solar_lighting: false,
  solar_lighting_min_pole_height_m: '',
  solar_lighting_min_lumens: '',
  solar_lighting_beam_angle_deg: '',
  solar_lighting_max_spacing_m: '',
  solar_lighting_min_battery_hours: '',
  solar_lighting_required_sides: 'any',
  // Road surface
  require_road_surface: false,
  road_surface_allowed_materials: [] as string[],
  road_surface_min_thickness_cm: '',
  road_surface_max_thickness_cm: '',
};

/**
 * Reconstitue (au mieux) les niveaux géographiques d'une règle existante
 * à partir de son `location_name` (qui ne stocke que le nom du niveau le plus précis).
 * Recherche dans la base statique tous les chemins compatibles.
 */
export const reverseGeographicLookup = (
  sectionType: 'urban' | 'rural',
  locationName: string,
): Partial<typeof emptyForm> => {
  if (!locationName || locationName === '*') return { apply_to_default: true };
  const provinces = getAllProvinces();
  if (sectionType === 'urban') {
    for (const province of provinces) {
      // Ville ?
      const villes = getVillesForProvince(province);
      if (villes.includes(locationName)) return { province, ville: locationName };
      for (const ville of villes) {
        const communes = getCommunesForVille(province, ville);
        if (communes.includes(locationName)) return { province, ville, commune: locationName };
        for (const commune of communes) {
          const quartiers = getQuartiersForCommune(province, ville, commune);
          if (quartiers.includes(locationName)) return { province, ville, commune, quartier: locationName };
          for (const quartier of quartiers) {
            const avenues = getAvenuesForQuartier(province, ville, commune, quartier);
            if (avenues.includes(locationName)) return { province, ville, commune, quartier, avenue: locationName };
          }
        }
      }
    }
  } else {
    for (const province of provinces) {
      const territoires = getTerritoiresForProvince(province);
      if (territoires.includes(locationName)) return { province, territoire: locationName };
      for (const territoire of territoires) {
        const collectivites = getCollectivitesForTerritoire(province, territoire);
        if (collectivites.includes(locationName)) return { province, territoire, collectivite: locationName };
      }
    }
    // Groupement / village ne sont pas dans la base statique → restaure au moins le nom
    return { groupement: locationName };
  }
  return {};
};

/** Détermine le niveau le plus précis sélectionné — c'est cette valeur qui devient `location_name`. */
export const computeLocationName = (f: typeof emptyForm): string => {
  if (f.apply_to_default) return '*';
  if (f.section_type === 'urban') {
    return f.avenue || f.quartier || f.commune || f.ville || '';
  }
  return f.village || f.groupement || f.collectivite || f.territoire || '';
};

/** Fil d'Ariane lisible pour l'affichage dans la table. */
export const formatBreadcrumb = (r: ZoningRule): string => {
  if (r.location_name === '*') return 'Par défaut';
  const found = reverseGeographicLookup(r.section_type, r.location_name);
  const parts = r.section_type === 'urban'
    ? [found.province, found.ville, found.commune, found.quartier, found.avenue]
    : [found.province, found.territoire, found.collectivite, found.groupement, found.village];
  const trail = parts.filter(Boolean);
  return trail.length > 0 ? trail.join(' › ') : r.location_name;
};

export type FormState = typeof emptyForm;
export type FormSetter = import('react').Dispatch<import('react').SetStateAction<FormState>>;
