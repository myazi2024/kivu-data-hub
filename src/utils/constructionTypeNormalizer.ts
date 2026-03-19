/**
 * Normalizes legacy construction_type values to the current CCC form picklist.
 * Source of truth: useCCCFormPicklists → picklist_construction_type + picklist_construction_subtype
 * Valid categories: Résidentielle, Commerciale, Industrielle, Agricole, Terrain nu
 * Combined format: "Catégorie - Sous-type" (e.g. "Résidentielle - Villa / Maison individuelle")
 */

const LEGACY_MAP: Record<string, string> = {
  // Résidentielle variants
  "Résidentiel": "Résidentielle",
  "Villa": "Résidentielle",
  "Maison individuelle": "Résidentielle",
  "Immeuble R+2": "Résidentielle",
  "Immeuble": "Résidentielle",
  "Maison": "Résidentielle",
  // Commerciale variants
  "Commercial": "Commerciale",
  "Bâtiment commercial": "Commerciale",
  "Commerce": "Commerciale",
  "Bureau": "Commerciale",
  "Usage mixte": "Commerciale",
  "Bâtiment": "Commerciale",
  // Industrielle variants
  "Industriel": "Industrielle",
  "Hangar": "Industrielle",
  "Entrepôt": "Industrielle",
  "Usine": "Industrielle",
};

const KNOWN_CATEGORIES = new Set([
  "Résidentielle",
  "Commerciale",
  "Industrielle",
  "Agricole",
  "Terrain nu",
]);

export function normalizeConstructionType(value: string | null | undefined): string {
  if (!value) return '(Non renseigné)';
  const trimmed = value.trim();
  // Handle combined format "Catégorie - Sous-type"
  if (trimmed.includes(' - ')) {
    const category = trimmed.split(' - ')[0];
    if (KNOWN_CATEGORIES.has(category)) return trimmed;
  }
  if (KNOWN_CATEGORIES.has(trimmed)) return trimmed;
  if (LEGACY_MAP[trimmed]) return LEGACY_MAP[trimmed];
  return trimmed;
}

/** Extract category from a construction_type value */
export function extractConstructionCategory(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed.includes(' - ')) return trimmed.split(' - ')[0];
  if (KNOWN_CATEGORIES.has(trimmed)) return trimmed;
  if (LEGACY_MAP[trimmed]) return LEGACY_MAP[trimmed];
  return trimmed;
}
