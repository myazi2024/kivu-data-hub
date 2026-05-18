/**
 * Validation pure (testable) du formulaire « Règle de zonage de lotissement ».
 * Renvoie des erreurs bloquantes et des avertissements non bloquants.
 */

export interface ZoningRuleFormInput {
  apply_to_default: boolean;
  section_type: 'urban' | 'rural';
  // niveau le plus précis (calculé en amont)
  location_name: string;
  min_lot_area_sqm: string;
  max_lot_area_sqm: string;
  min_road_width_m: string;
  recommended_road_width_m: string;
  min_common_space_pct: string;
  min_front_road_m: string;
  max_lots_per_request: string;
  parent_min_area_sqm: string;
  parent_max_area_sqm: string;
  min_title_age_years: string;
  min_gps_points: string;
  // Drainage
  require_drainage_canal: boolean;
  drainage_canal_min_width_m: string;
  drainage_canal_min_depth_m: string;
  drainage_canal_allowed_materials: string[];
  drainage_canal_allowed_types: string[];
  // Solar
  require_solar_lighting: boolean;
  solar_lighting_min_pole_height_m: string;
  solar_lighting_min_lumens: string;
  solar_lighting_max_spacing_m: string;
  // Road surface
  require_road_surface: boolean;
  road_surface_allowed_materials: string[];
  road_surface_min_thickness_cm: string;
  road_surface_max_thickness_cm: string;
}

export interface ValidationOutcome {
  errors: string[];
  warnings: string[];
}

const num = (s: string): number | null => {
  if (s === '' || s == null) return null;
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : null;
};

export function validateZoningRuleForm(
  f: ZoningRuleFormInput,
  ctx?: { knownRoadSurfaceTariffKeys?: Set<string> },
): ValidationOutcome {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!f.location_name) {
    errors.push("Sélectionnez au moins un niveau géographique ou cochez « Règle par défaut »");
  }

  const minLot = num(f.min_lot_area_sqm);
  const maxLot = num(f.max_lot_area_sqm);
  const minRoad = num(f.min_road_width_m);
  const recRoad = num(f.recommended_road_width_m);
  const minCommonPct = num(f.min_common_space_pct);
  const minFront = num(f.min_front_road_m);
  const parentMin = num(f.parent_min_area_sqm) ?? 0;
  const parentMax = num(f.parent_max_area_sqm);
  const minGps = num(f.min_gps_points);
  const titleAge = num(f.min_title_age_years);

  if (!(minLot && minLot > 0)) errors.push("Surface min lot doit être > 0");
  if (maxLot != null && minLot != null && maxLot < minLot) errors.push("Surface max lot < min");
  if (!(minRoad && minRoad > 0)) errors.push("Largeur min de voie doit être > 0");
  if (recRoad != null && minRoad != null && recRoad < minRoad) errors.push("Largeur recommandée < min");
  if (minCommonPct != null && (minCommonPct < 0 || minCommonPct > 100)) {
    errors.push("Pourcentage d'espaces communs doit être entre 0 et 100");
  }
  if (minFront != null && minFront < 0) errors.push("Front sur voie ne peut pas être négatif");
  if (minGps != null && minGps < 3) errors.push("Nombre min de points GPS doit être ≥ 3 (polygone)");
  if (titleAge != null && titleAge < 0) errors.push("Âge du titre ne peut pas être négatif");

  // Parcelle-mère
  if (parentMin > 0 && minLot && parentMin < minLot) {
    errors.push(`Surface min parcelle-mère (${parentMin} m²) doit être ≥ surface min d'un lot (${minLot} m²)`);
  }
  if (parentMax != null && parentMax < parentMin) {
    errors.push("Surface max parcelle-mère < min");
  }
  if (parentMin > 0 && minLot && parentMin < minLot * 2) {
    warnings.push(`Parcelle-mère minimale (${parentMin} m²) ne permet pas un vrai lotissement (< 2 lots de ${minLot} m²)`);
  }

  // Drainage
  if (f.require_drainage_canal) {
    const dw = num(f.drainage_canal_min_width_m);
    const dd = num(f.drainage_canal_min_depth_m);
    if (f.drainage_canal_allowed_materials.length === 0) {
      errors.push("Drainage : au moins un matériau autorisé requis");
    }
    if (f.drainage_canal_allowed_types.length === 0) {
      errors.push("Drainage : au moins un type autorisé requis");
    }
    if (!(dw && dw > 0) && !(dd && dd > 0)) {
      errors.push("Drainage : renseignez au moins largeur ou profondeur minimale");
    }
  }

  // Éclairage solaire
  if (f.require_solar_lighting) {
    const sh = num(f.solar_lighting_min_pole_height_m);
    const sl = num(f.solar_lighting_min_lumens);
    const ss = num(f.solar_lighting_max_spacing_m);
    if (!sh && !sl && !ss) {
      errors.push("Éclairage : renseignez au moins une dimension (hauteur, lumens ou espacement)");
    }
  }

  // Revêtement
  if (f.require_road_surface) {
    const rsMin = num(f.road_surface_min_thickness_cm);
    const rsMax = num(f.road_surface_max_thickness_cm);
    if (f.road_surface_allowed_materials.length === 0) {
      errors.push("Revêtement : sélectionnez au moins un matériau autorisé");
    }
    if (rsMin != null && rsMin <= 0) errors.push("Épaisseur min revêtement doit être > 0");
    if (rsMin != null && rsMax != null && rsMax < rsMin) {
      errors.push("Épaisseur max revêtement < min");
    }
    // Cohérence tarifs
    if (ctx?.knownRoadSurfaceTariffKeys) {
      const missing = f.road_surface_allowed_materials.filter(k => !ctx.knownRoadSurfaceTariffKeys!.has(k));
      if (missing.length > 0) {
        warnings.push(`Revêtement : aucun tarif configuré pour ${missing.join(', ')} — le frais sera 0`);
      }
    }
  }

  return { errors, warnings };
}
