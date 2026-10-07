/**
 * Constantes partagées pour le système de mutation foncière.
 */

export const MUTATION_TYPES = [
  { value: 'vente', label: 'Vente', description: 'Transfert de propriété suite à une vente' },
  { value: 'donation', label: 'Donation', description: 'Transfert gratuit de propriété' },
  { value: 'succession', label: 'Succession', description: 'Transfert suite à un héritage' },
  { value: 'expropriation', label: 'Expropriation', description: 'Transfert par décision administrative' },
  { value: 'echange', label: 'Échange', description: 'Échange de propriétés' },
  { value: 'correction', label: 'Correction d\'erreur', description: 'Correction des données existantes' },
  { value: 'mise_a_jour', label: 'Mise à jour', description: 'Actualisation des informations' }
] as const;

export const MUTATION_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  MUTATION_TYPES.map(t => [t.value, t.label])
);

export const LEGAL_STATUS_OPTIONS = [
  { value: 'personne_physique', label: 'Personne physique' },
  { value: 'personne_morale', label: 'Personne morale' }
] as const;

export const REQUESTER_TYPES = [
  { value: 'proprietaire', label: 'Propriétaire actuel' },
  { value: 'mandataire', label: 'Mandataire/Représentant' }
] as const;

export const PROVIDER_LABELS: Record<string, string> = {
  airtel: 'Airtel Money',
  orange: 'Orange Money',
  mpesa: 'M-Pesa',
};

/** Types de mutation impliquant un transfert de propriété */
export const TRANSFER_MUTATION_TYPES = ['vente', 'donation', 'succession', 'expropriation', 'echange'];

/**
 * Types de mutation exemptés de frais de retard.
 * Note : 'echange' n'est PAS exempté car un échange implique un transfert
 * de propriété soumis au délai légal de 20 jours.
 */
export const NO_LATE_FEE_TYPES = ['correction', 'mise_a_jour', 'expropriation'];

export const isTransferMutation = (type: string) => TRANSFER_MUTATION_TYPES.includes(type);

/** Transferts exigeant un certificat d'expertise (l'expropriation en est exclue). */
export const CERTIFICATE_MUTATION_TYPES = ['vente', 'donation', 'succession', 'echange'];
export const requiresExpertiseCertificate = (type: string) => CERTIFICATE_MUTATION_TYPES.includes(type);
export const hasLateFees = (type: string) => !NO_LATE_FEE_TYPES.includes(type);

/**
 * Commission bancaire réglementaire (0.5%).
 * Applicable uniquement pour les titres de moins de 10 ans.
 * Pour les titres de 10 ans et plus, les frais bancaires sont exemptés
 * conformément à la circulaire n°0076/2023.
 */
export const BANK_FEE_PERCENTAGE = 0.005;

export const getMutationTypeLabel = (type: string): string =>
  MUTATION_TYPE_LABELS[type] || type.replace(/_/g, ' ');

/** Status labels for display */
export const MUTATION_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  in_review: 'En cours',
  approved: 'Approuvée',
  rejected: 'Rejetée',
  on_hold: 'Suspendue',
  cancelled: 'Annulée',
};

/**
 * Droits de mutation + commission bancaire (estimation affichée).
 * Miroir exact de `enforce_mutation_request_insert` côté serveur, qui fait foi.
 */
export function computeMutationDuties(value: number, titleAge: 'less_than_10' | '10_or_more' | null) {
  if (!Number.isFinite(value) || value < 10000) {
    return { mutationFee: 0, bankFee: 0, total: 0, applicable: false, percentage: 0 };
  }
  const isOld = titleAge === '10_or_more';
  const percentage = isOld ? 0.015 : 0.03;
  const mutationFee = Math.round(value * percentage * 100) / 100;
  const bankFee = isOld ? 0 : Math.round(value * BANK_FEE_PERCENTAGE * 100) / 100;
  return {
    mutationFee,
    bankFee,
    total: Math.round((mutationFee + bankFee) * 100) / 100,
    applicable: true,
    percentage: percentage * 100,
  };
}

/** Pénalités de retard : 0,45 $/jour après 20 jours, plafonnées à 500 $ (miroir serveur). */
export function computeLateFees(acquisitionDate: string | null, today: Date = new Date()) {
  if (!acquisitionDate) return { days: 0, fee: 0, applicable: false, capped: false };
  const acq = new Date(acquisitionDate);
  if (Number.isNaN(acq.getTime())) return { days: 0, fee: 0, applicable: false, capped: false };
  const elapsed = Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(acq.getFullYear(), acq.getMonth(), acq.getDate())) / 86_400_000);
  const days = Math.max(0, elapsed - 20);
  const raw = days * 0.45;
  return { days, fee: Math.round(Math.min(raw, 500) * 100) / 100, applicable: days > 0, capped: raw > 500 };
}
