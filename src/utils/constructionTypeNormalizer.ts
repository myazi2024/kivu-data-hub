/**
 * Normalizes legacy construction_type values to the current CCC form picklist.
 * Source of truth: useCCCFormPicklists → picklist_construction_type
 * Valid values (merged list):
 *   Résidentielle - Villa / Maison individuelle, Résidentielle - Appartement,
 *   Résidentielle - Immeuble / Bâtiment, Résidentielle - Duplex / Triplex,
 *   Résidentielle - Studio, Commerciale - Local commercial, Commerciale - Bureau,
 *   Industrielle - Entrepôt / Hangar, Industrielle - Usine, Agricole, Terrain nu, Autre
 */

const LEGACY_MAP: Record<string, string> = {
  // Old broad categories → default subtype
  "Résidentielle": "Résidentielle - Villa / Maison individuelle",
  "Résidentiel": "Résidentielle - Villa / Maison individuelle",
  "Commerciale": "Commerciale - Local commercial",
  "Commercial": "Commerciale - Local commercial",
  "Industrielle": "Industrielle - Entrepôt / Hangar",
  "Industriel": "Industrielle - Entrepôt / Hangar",

  // Expertise form legacy keys
  "villa": "Résidentielle - Villa / Maison individuelle",
  "appartement": "Résidentielle - Appartement",
  "immeuble": "Résidentielle - Immeuble / Bâtiment",
  "duplex": "Résidentielle - Duplex / Triplex",
  "studio": "Résidentielle - Studio",
  "commercial": "Commerciale - Local commercial",
  "entrepot": "Résidentielle - Immeuble / Bâtiment",
  "autre": "Autre",

  // Other legacy variants
  "Villa": "Résidentielle - Villa / Maison individuelle",
  "Maison individuelle": "Résidentielle - Villa / Maison individuelle",
  "Maison": "Résidentielle - Villa / Maison individuelle",
  "Appartement": "Résidentielle - Appartement",
  "Immeuble": "Résidentielle - Immeuble / Bâtiment",
  "Immeuble R+2": "Résidentielle - Immeuble / Bâtiment",
  "Duplex": "Résidentielle - Duplex / Triplex",
  "Studio": "Résidentielle - Studio",
  "Bâtiment commercial": "Commerciale - Local commercial",
  "Commerce": "Commerciale - Local commercial",
  "Bureau": "Commerciale - Bureau",
  "Usage mixte": "Commerciale - Local commercial",
  "Bâtiment": "Commerciale - Local commercial",
  "Hangar": "Industrielle - Entrepôt / Hangar",
  "Entrepôt": "Industrielle - Entrepôt / Hangar",
  "Usine": "Industrielle - Usine",
};

const KNOWN_TYPES = new Set([
  "Résidentielle - Villa / Maison individuelle",
  "Résidentielle - Appartement",
  "Résidentielle - Immeuble / Bâtiment",
  "Résidentielle - Duplex / Triplex",
  "Résidentielle - Studio",
  "Commerciale - Local commercial",
  "Commerciale - Bureau",
  "Industrielle - Entrepôt / Hangar",
  "Industrielle - Usine",
  "Agricole",
  "Terrain nu",
  "Autre",
]);

/**
 * Extract the broad category from a merged construction type.
 * e.g. "Résidentielle - Villa / Maison individuelle" → "Résidentielle"
 */
export function extractConstructionCategory(value: string | null | undefined): string {
  if (!value) return '(Non renseigné)';
  const trimmed = value.trim();
  const dashIndex = trimmed.indexOf(' - ');
  if (dashIndex > 0) return trimmed.substring(0, dashIndex);
  if (trimmed === 'Agricole' || trimmed === 'Terrain nu' || trimmed === 'Autre') return trimmed;
  return trimmed;
}

export function normalizeConstructionType(value: string | null | undefined): string {
  if (!value) return '(Non renseigné)';
  const trimmed = value.trim();
  if (KNOWN_TYPES.has(trimmed)) return trimmed;
  if (LEGACY_MAP[trimmed]) return LEGACY_MAP[trimmed];
  return trimmed;
}

/**
 * Check if a construction type represents bare land (terrain nu).
 * Use this instead of === 'Terrain nu' for consistent checks across the app.
 */
export function isTerrainNu(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.trim() === 'Terrain nu';
}
