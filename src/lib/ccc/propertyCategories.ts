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

/** Tous les types de construction proposés (ordre stable). */
export const CONSTRUCTION_TYPE_OPTIONS: string[] = Array.from(
  new Set(Object.values(CATEGORY_TO_CONSTRUCTION_TYPES).flat()),
);

/** Catégories de bien compatibles avec un type de construction (correspondance inverse). */
export const getCategoriesForConstructionType = (
  type: string | undefined | null,
  categories: readonly string[] = PROPERTY_CATEGORY_OPTIONS,
): string[] => {
  if (!type) return [];
  return categories.filter((c) => (CATEGORY_TO_CONSTRUCTION_TYPES[c] || []).includes(type));
};
