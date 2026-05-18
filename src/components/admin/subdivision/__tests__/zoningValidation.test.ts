import { describe, it, expect } from 'vitest';
import { validateZoningRuleForm, type ZoningRuleFormInput } from '../zoningValidation';

const base: ZoningRuleFormInput = {
  apply_to_default: true,
  section_type: 'urban',
  location_name: '*',
  min_lot_area_sqm: '200',
  max_lot_area_sqm: '5000',
  min_road_width_m: '6',
  recommended_road_width_m: '8',
  min_common_space_pct: '5',
  min_front_road_m: '10',
  max_lots_per_request: '50',
  parent_min_area_sqm: '1000',
  parent_max_area_sqm: '',
  min_title_age_years: '0',
  min_gps_points: '3',
  require_drainage_canal: false,
  drainage_canal_min_width_m: '',
  drainage_canal_min_depth_m: '',
  drainage_canal_allowed_materials: [],
  drainage_canal_allowed_types: [],
  require_solar_lighting: false,
  solar_lighting_min_pole_height_m: '',
  solar_lighting_min_lumens: '',
  solar_lighting_max_spacing_m: '',
  require_road_surface: false,
  road_surface_allowed_materials: [],
  road_surface_min_thickness_cm: '',
  road_surface_max_thickness_cm: '',
};

describe('validateZoningRuleForm', () => {
  it('valide un cas nominal', () => {
    const r = validateZoningRuleForm(base);
    expect(r.errors).toEqual([]);
  });

  it('rejette min_lot_area_sqm = 0', () => {
    const r = validateZoningRuleForm({ ...base, min_lot_area_sqm: '0' });
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('rejette pourcentage espaces communs > 100', () => {
    const r = validateZoningRuleForm({ ...base, min_common_space_pct: '120' });
    expect(r.errors.some(e => e.includes('espaces communs'))).toBe(true);
  });

  it('rejette min_gps_points < 3', () => {
    const r = validateZoningRuleForm({ ...base, min_gps_points: '2' });
    expect(r.errors.some(e => e.includes('GPS'))).toBe(true);
  });

  it('rejette drainage activé sans matériau ni type', () => {
    const r = validateZoningRuleForm({ ...base, require_drainage_canal: true, drainage_canal_min_width_m: '0.5' });
    expect(r.errors.some(e => e.includes('matériau'))).toBe(true);
    expect(r.errors.some(e => e.includes('type'))).toBe(true);
  });

  it('rejette revêtement activé sans matériau', () => {
    const r = validateZoningRuleForm({ ...base, require_road_surface: true });
    expect(r.errors.some(e => e.toLowerCase().includes('matériau'))).toBe(true);
  });

  it('warn si matériau revêtement sans tarif', () => {
    const r = validateZoningRuleForm(
      { ...base, require_road_surface: true, road_surface_allowed_materials: ['bitume', 'inconnu'] },
      { knownRoadSurfaceTariffKeys: new Set(['bitume']) },
    );
    expect(r.warnings.some(w => w.includes('inconnu'))).toBe(true);
  });

  it('warn parcelle-mère < 2× lot min', () => {
    const r = validateZoningRuleForm({ ...base, parent_min_area_sqm: '300', min_lot_area_sqm: '200' });
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('rejette parent_min < min_lot', () => {
    const r = validateZoningRuleForm({ ...base, parent_min_area_sqm: '100', min_lot_area_sqm: '200' });
    expect(r.errors.some(e => e.includes('parcelle-mère'))).toBe(true);
  });
});
