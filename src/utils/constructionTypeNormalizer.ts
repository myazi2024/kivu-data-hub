/**
 * Normalizes legacy construction_type values to the current CCC form picklist.
 * Source of truth: useCCCFormPicklists → picklist_construction_type
 * Valid values: see KNOWN_TYPES below (12 detailed categories + legacy simple ones)
 */

const LEGACY_MAP: Record<string, string> = {
  // Résidentielle variants → detailed subtypes
  "Résidentiel": "Résidentielle - Villa / Maison individuelle",
  "Résidentielle": "Résidentielle - Villa / Maison individuelle",
  "Villa": "Résidentielle - Villa / Maison individuelle",
  "Maison individuelle": "Résidentielle - Villa / Maison individuelle",
  "Maison": "Résidentielle - Villa / Maison individuelle",
  "Immeuble R+2": "Résidentielle - Immeuble / Bâtiment",
  "Immeuble": "Résidentielle - Immeuble / Bâtiment",
  // Commerciale variants
  "Commercial": "Commerciale - Local commercial",
  "Commerciale": "Commerciale - Local commercial",
  "Bâtiment commercial": "Commerciale - Local commercial",
  "Commerce": "Commerciale - Local commercial",
  "Bureau": "Commerciale - Bureau",
  "Usage mixte": "Commerciale - Local commercial",
  "Bâtiment": "Commerciale - Local commercial",
  // Industrielle variants
  "Industriel": "Industrielle - Entrepôt / Hangar",
  "Industrielle": "Industrielle - Entrepôt / Hangar",
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

export function normalizeConstructionType(value: string | null | undefined): string {
  if (!value) return '(Non renseigné)';
  const trimmed = value.trim();
  if (KNOWN_TYPES.has(trimmed)) return trimmed;
  if (LEGACY_MAP[trimmed]) return LEGACY_MAP[trimmed];
  return trimmed;
}
