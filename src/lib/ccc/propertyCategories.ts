/** Catégories de bien et types de construction autorisés — source unique partagée par le CCC et les services. */
export const PROPERTY_CATEGORY_OPTIONS = [
  'Appartement', 'Villa', 'Maison', 'Maison basse', 'Local commercial',
  'Immeuble/Bâtiment', 'Entrepôt/Hangar', 'Terrain nu',
] as const;

export const PROPERTY_CATEGORY_OPTIONS_NO_TERRAIN = PROPERTY_CATEGORY_OPTIONS.filter(
  (c) => c !== 'Terrain nu' && c !== 'Appartement',
);

export const CATEGORY_TO_CONSTRUCTION_TYPES: Record<string, string[]> = {
  'Appartement': ['Résidentielle'], 'Villa': ['Résidentielle'], 'Maison': ['Résidentielle'],
  'Maison basse': ['Résidentielle'],
  'Local commercial': ['Commerciale'], 'Immeuble/Bâtiment': ['Résidentielle', 'Commerciale', 'Industrielle'],
  'Entrepôt/Hangar': ['Industrielle', 'Agricole'], 'Terrain nu': ['Terrain nu'],
};
