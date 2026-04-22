import type { ExpertiseRequest } from '@/types/expertise';

/**
 * Helper to get extended data — reads from DB columns first,
 * falls back to legacy JSON in additional_notes.
 */
export const getExtendedData = (
  req: ExpertiseRequest
): { userNotes: string; extendedData: Record<string, any> } => {
  let legacyNotes = '';
  let legacyExtended: Record<string, any> = {};
  if (req.additional_notes) {
    try {
      const parsed = JSON.parse(req.additional_notes);
      legacyNotes = parsed.user_notes || '';
      legacyExtended = parsed.extended_data || {};
    } catch {
      legacyNotes = req.additional_notes;
    }
  }

  const extendedData: Record<string, any> = {
    construction_type: legacyExtended.construction_type,
    wall_material: req.wall_material || legacyExtended.wall_material,
    roof_material: req.roof_material || legacyExtended.roof_material,
    window_type: req.window_type || legacyExtended.window_type,
    floor_material: req.floor_material || legacyExtended.floor_material,
    has_plaster: req.has_plaster ?? legacyExtended.has_plaster,
    has_painting: req.has_painting ?? legacyExtended.has_painting,
    has_ceiling: req.has_ceiling ?? legacyExtended.has_ceiling,
    has_double_glazing: req.has_double_glazing ?? legacyExtended.has_double_glazing,
    building_position: req.building_position || legacyExtended.building_position,
    facade_orientation: req.facade_orientation || legacyExtended.facade_orientation,
    is_corner_plot: req.is_corner_plot ?? legacyExtended.is_corner_plot,
    has_pool: req.has_pool ?? legacyExtended.has_pool,
    has_air_conditioning: req.has_air_conditioning ?? legacyExtended.has_air_conditioning,
    has_solar_panels: req.has_solar_panels ?? legacyExtended.has_solar_panels,
    has_generator: req.has_generator ?? legacyExtended.has_generator,
    has_water_tank: req.has_water_tank ?? legacyExtended.has_water_tank,
    has_borehole: req.has_borehole ?? legacyExtended.has_borehole,
    has_electric_fence: req.has_electric_fence ?? legacyExtended.has_electric_fence,
    has_garage: req.has_garage ?? legacyExtended.has_garage,
    has_cellar: req.has_cellar ?? legacyExtended.has_cellar,
    has_automatic_gate: req.has_automatic_gate ?? legacyExtended.has_automatic_gate,
    internet_provider: req.internet_provider || legacyExtended.internet_provider,
    number_of_rooms: req.number_of_rooms ?? legacyExtended.number_of_rooms,
    number_of_bedrooms: req.number_of_bedrooms ?? legacyExtended.number_of_bedrooms,
    number_of_bathrooms: req.number_of_bathrooms ?? legacyExtended.number_of_bathrooms,
    apartment_number: req.apartment_number || legacyExtended.apartment_number,
    floor_number: req.floor_number || legacyExtended.floor_number,
    total_building_floors: req.total_building_floors ?? legacyExtended.total_building_floors,
    accessibility: req.accessibility || legacyExtended.accessibility,
    monthly_charges: req.monthly_charges ?? legacyExtended.monthly_charges,
    has_common_areas: req.has_common_areas ?? legacyExtended.has_common_areas,
    has_direct_street_access: legacyExtended.has_direct_street_access,
    nearby_amenities: req.nearby_amenities || legacyExtended.nearby_amenities,
  };

  return { userNotes: legacyNotes, extendedData };
};
