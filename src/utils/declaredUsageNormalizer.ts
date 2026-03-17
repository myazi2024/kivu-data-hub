/**
 * Normalizes legacy declared_usage values to the current CCC form picklist.
 * Source of truth: useCCCFormPicklists → picklist_declared_usage
 * Valid values: Habitation, Usage mixte, Commerce, Bureau, Entrepôt, Industrie, Agriculture, Terrain vacant, Parking
 */

const LEGACY_MAP: Record<string, string> = {
  // Résidentiel → Habitation
  "Résidentiel": "Habitation",
  "Résidentielle": "Habitation",
  "Logement": "Habitation",
  // Commercial → Commerce
  "Commercial": "Commerce",
  "Commerciale": "Commerce",
  // Industriel → Industrie
  "Industriel": "Industrie",
  "Industrielle": "Industrie",
  // Agricole → Agriculture
  "Agricole": "Agriculture",
  // Mixte → Usage mixte
  "Mixte": "Usage mixte",
  // Institutionnel — no CCC equivalent, keep as-is
  "Institutionnel": "Institutionnel",
};

const KNOWN_USAGES = new Set([
  "Habitation",
  "Usage mixte",
  "Commerce",
  "Bureau",
  "Entrepôt",
  "Industrie",
  "Agriculture",
  "Terrain vacant",
  "Parking",
]);

export function normalizeDeclaredUsage(value: string | null | undefined): string {
  if (!value) return '(Non renseigné)';
  const trimmed = value.trim();
  if (KNOWN_USAGES.has(trimmed)) return trimmed;
  if (LEGACY_MAP[trimmed]) return LEGACY_MAP[trimmed];
  return trimmed;
}
