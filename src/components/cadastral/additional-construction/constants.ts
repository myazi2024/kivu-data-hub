export const PROPERTY_CATEGORY_OPTIONS_NO_TERRAIN = [
  'Villa', 'Maison', 'Maison basse', 'Local commercial',
  'Immeuble/Bâtiment', 'Entrepôt/Hangar',
];

export const CATEGORY_TO_CONSTRUCTION_TYPES: Record<string, string[]> = {
  'Appartement': ['Résidentielle'],
  'Villa': ['Résidentielle'],
  'Maison': ['Résidentielle'],
  'Maison basse': ['Résidentielle'],
  'Local commercial': ['Commerciale'],
  'Immeuble/Bâtiment': ['Résidentielle', 'Commerciale', 'Industrielle'],
  'Entrepôt/Hangar': ['Industrielle', 'Agricole'],
};

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
