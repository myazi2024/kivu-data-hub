/**
 * Règles d'affichage du service « Ajouter une autorisation ».
 * Miroir de `submit_building_permit_contribution` (le serveur fait foi).
 */
export const PERMIT_NUMBER_REGEX = /^[A-Z]{2,6}[-/.]\d{4}[-/.]\d{2,6}$/;
export const PERMIT_VALIDITY_OPTIONS = [6, 12, 24, 36] as const;

export const normalizePermitNumber = (value: string): string => value.trim().toUpperCase();

export const isValidPermitNumber = (value: string): boolean =>
  PERMIT_NUMBER_REGEX.test(normalizePermitNumber(value));

/** Date d'expiration = date de délivrance + durée choisie, ou null si incomplet. */
export const permitExpiryDate = (issueDate: string, validityMonths: number): Date | null => {
  if (!issueDate || !validityMonths) return null;
  const d = new Date(`${issueDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + validityMonths);
  return d;
};

/** Estimation du statut (le statut enregistré est calculé par le serveur). */
export const estimatePermitStatus = (
  issueDate: string,
  validityMonths: number,
  now: Date = new Date(),
): 'Valide' | 'Expiré' | 'En cours' => {
  const expiry = permitExpiryDate(issueDate, validityMonths);
  if (!expiry) return 'En cours';
  return expiry > now ? 'Valide' : 'Expiré';
};
