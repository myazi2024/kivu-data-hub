/**
 * Normalizes legacy construction_nature values to the current CCC form picklist.
 * Source of truth: useCCCFormPicklists → picklist_construction_nature
 * Valid values: Durable, Semi-durable, Précaire, Non bâti
 */

const LEGACY_MAP: Record<string, string> = {
  // Old tax/permit values → CCC standard
  "En dur": "Durable",
  "Semi-dur": "Semi-durable",
  "En paille": "Précaire",
  "En paille/bois": "Précaire",
  "Bois": "Précaire",
  "Tôle": "Précaire",
  // Display labels → standard
  "Construction durable": "Durable",
  "Construction semi-durable": "Semi-durable",
  "Construction précaire": "Précaire",
};

const KNOWN_NATURES = new Set([
  "Durable",
  "Semi-durable",
  "Précaire",
  "Non bâti",
]);

export function normalizeConstructionNature(value: string | null | undefined): string {
  if (!value) return '(Non renseigné)';
  const trimmed = value.trim();
  if (KNOWN_NATURES.has(trimmed)) return trimmed;
  if (LEGACY_MAP[trimmed]) return LEGACY_MAP[trimmed];
  return trimmed;
}
