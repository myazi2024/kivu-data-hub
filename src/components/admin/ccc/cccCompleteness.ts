/**
 * CCC contribution completeness score (0-100).
 * Base : 20 champs structurels communs à toutes les contributions.
 * Critères conditionnels : bloc locatif (si usage = location) et bloc valeur
 * marchande — comptés uniquement quand ils sont applicables, afin de ne pas
 * pénaliser les contributions auxquelles ils ne s'appliquent pas.
 */
export const calculateCCCCompleteness = (contribution: any): number => {
  let filled = 0;
  let total = 20;

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
  if (contribution.has_dispute !== null && contribution.has_dispute !== undefined) filled++;
  if (contribution.whatsapp_number) filled++;
  if (contribution.sound_environment) filled++;
  if (contribution.is_occupied !== null && contribution.is_occupied !== undefined) filled++;
  if (contribution.declared_usage) filled++;
  if (contribution.construction_nature || contribution.construction_materials) filled++;

  // ─── Bloc locatif (conditionnel : usage déclaré = location) ───
  if (contribution.declared_usage === 'location') {
    const units = Array.isArray(contribution.rental_units) ? contribution.rental_units : [];
    total += 3;
    if (contribution.rental_configuration) filled++;
    if (contribution.rental_configuration === 'multi') {
      if (units.length > 0) filled++;
      if (units.length > 0 && units.every((u: any) => Number(u?.monthly_rent_usd ?? u?.monthlyRentUsd) > 0)) filled++;
    } else {
      if (Number(contribution.monthly_rent_usd) > 0) filled++;
      if (contribution.rental_start_date) filled++;
    }
  }

  // ─── Bloc valeur marchande (conditionnel : question posée) ───
  if (contribution.would_sell_if_offered !== null && contribution.would_sell_if_offered !== undefined) {
    total += 2;
    filled++; // disposition renseignée
    if (contribution.would_sell_if_offered === true) {
      if (contribution.resale_price_usd) filled++;
    } else {
      filled++; // non applicable : ne pas pénaliser
    }
  }
  if (contribution.has_recent_appraisal === true) {
    total += 1;
    if (contribution.appraisal_date) filled++;
  }
  const listings = Array.isArray(contribution.market_listings) ? contribution.market_listings : [];
  if (listings.length > 0) {
    total += 1;
    const allWithCover = listings.every(
      (l: any) => Array.isArray(l?.coverImageUrls) && l.coverImageUrls.length > 0,
    );
    if (allWithCover) filled++;
  }

  return Math.min(100, Math.round((filled / total) * 100));
};
