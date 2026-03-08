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

/** Types de mutation qui ne doivent PAS avoir de frais de retard */
export const NO_LATE_FEE_TYPES = ['correction', 'mise_a_jour'];

export const isTransferMutation = (type: string) => TRANSFER_MUTATION_TYPES.includes(type);
export const hasLateFees = (type: string) => !NO_LATE_FEE_TYPES.includes(type);

export const getMutationTypeLabel = (type: string): string =>
  MUTATION_TYPE_LABELS[type] || type.replace(/_/g, ' ');
