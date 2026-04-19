/**
 * CCC contribution completeness score (0-100).
 * Counts 16 key fields filled in the contribution payload.
 */
export const calculateCCCCompleteness = (contribution: any): number => {
  let filled = 0;
  const total = 16;

  if (contribution.property_title_type) filled++;
  if (contribution.current_owner_name || contribution.current_owners_details) filled++;
  if (contribution.area_sqm && contribution.area_sqm > 0) filled++;
  if (contribution.province) filled++;
  if (contribution.property_category) filled++;
  if (contribution.construction_type) filled++;
  if (contribution.ownership_history && Array.isArray(contribution.ownership_history) && contribution.ownership_history.length > 0) filled++;
  if (contribution.boundary_history && Array.isArray(contribution.boundary_history) && contribution.boundary_history.length > 0) filled++;
  if (contribution.tax_history && Array.isArray(contribution.tax_history) && contribution.tax_history.length > 0) filled++;
  if (contribution.gps_coordinates && Array.isArray(contribution.gps_coordinates) && contribution.gps_coordinates.length > 0) filled++;
  if (contribution.owner_document_url) filled++;
  if (contribution.property_title_document_url) filled++;
  if (contribution.building_shapes && Array.isArray(contribution.building_shapes) && contribution.building_shapes.length > 0) filled++;
  if (contribution.road_sides && Array.isArray(contribution.road_sides) && contribution.road_sides.length > 0) filled++;
  if (contribution.has_dispute !== null) filled++;
  if (contribution.whatsapp_number) filled++;

  return Math.round((filled / total) * 100);
};
