// Static constants for the Land Title Request dialog and its sub-components.

export { PROPERTY_CATEGORY_OPTIONS, CATEGORY_TO_CONSTRUCTION_TYPES } from '@/lib/ccc/propertyCategories';

// Materials -> Nature auto-determination (aligned with CCC)
export const MATERIAL_TO_NATURE: Record<string, string> = {
  'Béton armé': 'Durable', 'Briques cuites': 'Durable', 'Parpaings': 'Durable', 'Pierre naturelle': 'Durable',
  'Semi-dur': 'Semi-durable', 'Briques adobes': 'Semi-durable', 'Bois': 'Semi-durable', 'Mixte': 'Semi-durable',
  'Tôles': 'Précaire', 'Paille': 'Précaire',
};

// Location-eligible combinations for "Location" usage
export const LOCATION_ELIGIBLE_KEYS = new Set([
  'Résidentielle_Durable', 'Résidentielle_Semi-durable',
  'Commerciale_Durable', 'Commerciale_Semi-durable',
  'Industrielle_Durable', 'Industrielle_Semi-durable',
]);
