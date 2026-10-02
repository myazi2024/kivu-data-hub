export { PROPERTY_CATEGORY_OPTIONS_NO_TERRAIN, CATEGORY_TO_CONSTRUCTION_TYPES } from '@/lib/ccc/propertyCategories';

export const MATERIALS_BY_NATURE_FALLBACK: Record<string, string[]> = {
  Durable: ['Béton armé', 'Briques cuites', 'Parpaings', 'Pierre naturelle'],
  'Semi-durable': ['Semi-dur', 'Briques adobes', 'Bois', 'Mixte'],
  Précaire: ['Tôles', 'Bois', 'Paille', 'Autre'],
};

export const STANDING_BY_NATURE_FALLBACK: Record<string, string[]> = {
  Durable: ['Haut standing', 'Moyen standing', 'Économique'],
  'Semi-durable': ['Moyen standing', 'Économique'],
  Précaire: ['Économique'],
};
