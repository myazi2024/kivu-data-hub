/**
 * Normalizes legacy construction_type values to the current CCC form picklist.
 * Source of truth: useCCCFormPicklists → picklist_construction_type
 * Valid values: Résidentielle, Commerciale, Industrielle, Agricole, Terrain nu
 */

const LEGACY_MAP: Record<string, string> = {
  // Résidentielle variants
  "Résidentiel": "Résidentielle",
  "Villa": "Résidentielle",
  "Maison individuelle": "Résidentielle",
  "Immeuble R+2": "Résidentielle",
  "Immeuble": "Résidentielle",
  "Maison": "Résidentielle",
  "villa": "Résidentielle",
  "appartement": "Résidentielle",
  "immeuble": "Résidentielle",
  "duplex": "Résidentielle",
  "studio": "Résidentielle",
  // Commerciale variants
  "Commercial": "Commerciale",
  "Bâtiment commercial": "Commerciale",
  "Commerce": "Commerciale",
  "Bureau": "Commerciale",
  "Usage mixte": "Commerciale",
  "Bâtiment": "Commerciale",
  "commercial": "Commerciale",
  // Industrielle variants
  "Industriel": "Industrielle",
  "Hangar": "Industrielle",
  "Entrepôt": "Industrielle",
  "Usine": "Industrielle",
  "entrepot": "Industrielle",
  // Terrain nu variants
  "terrain_nu": "Terrain nu",
  "autre": "Terrain nu",
};

const KNOWN_TYPES = new Set([
  "Résidentielle",
  "Commerciale",
  "Industrielle",
  "Agricole",
  "Terrain nu",
]);

export function normalizeConstructionType(value: string | null | undefined): string {
  if (!value) return '(Non renseigné)';
  const trimmed = value.trim();
  if (KNOWN_TYPES.has(trimmed)) return trimmed;
  if (LEGACY_MAP[trimmed]) return LEGACY_MAP[trimmed];
  return trimmed;
}
