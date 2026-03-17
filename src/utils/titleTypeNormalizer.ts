/**
 * Normalizes legacy property_title_type values to the current simplified list.
 * Used for analytics display so old DB records align with the new CCC form types.
 */

const LEGACY_MAP: Record<string, string> = {
  // Old types → new mapping
  "Titre foncier (Ancien système)": "Certificat d'enregistrement",
  "Titre foncier": "Certificat d'enregistrement",
  "Titre de propriété": "Certificat d'enregistrement",
  "Concession perpétuelle": "Certificat d'enregistrement",
  "Concession ordinaire": "Contrat de location (Contrat d'occupation provisoire)",
  "Concession provisoire": "Contrat de location (Contrat d'occupation provisoire)",
  "Concession": "Contrat de location (Contrat d'occupation provisoire)",
  "Contrat de location (Concession provisoire)": "Contrat de location (Contrat d'occupation provisoire)",
  "Certificat de location": "Contrat de location (Contrat d'occupation provisoire)",
  "Bail emphytéotique": "Contrat de location (Contrat d'occupation provisoire)",
  "Permis d'occupation urbaine": "Fiche parcellaire",
  "Permis d'occupation rurale": "Fiche parcellaire",
  "Autorisation d'occupation provisoire": "Fiche parcellaire",
};

const KNOWN_TYPES = new Set([
  "Certificat d'enregistrement",
  "Contrat de location (Contrat d'occupation provisoire)",
  "Fiche parcellaire",
]);

export function normalizeTitleType(value: string | null | undefined): string {
  if (!value) return '(Non renseigné)';
  const trimmed = value.trim();
  if (KNOWN_TYPES.has(trimmed)) return trimmed;
  if (LEGACY_MAP[trimmed]) return LEGACY_MAP[trimmed];
  // Custom "Autre" values — keep as-is
  return trimmed;
}
