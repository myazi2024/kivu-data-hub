/**
 * Shared types, constants and helpers for Land Dispute views (Admin, User, Forms)
 */
import React from 'react';

export interface LandDispute {
  id: string;
  parcel_number: string;
  reference_number: string;
  dispute_type: string;
  dispute_nature: string;
  dispute_description: string | null;
  current_status: string;
  resolution_level: string | null;
  resolution_details: string | null;
  declarant_name: string;
  declarant_phone: string | null;
  declarant_email: string | null;
  declarant_quality: string;
  dispute_start_date: string | null;
  parties_involved: any;
  supporting_documents: any;
  lifting_status: string | null;
  lifting_reason: string | null;
  lifting_request_reference: string | null;
  lifting_documents: any;
  reported_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Max number of parties a user can add */
export const MAX_PARTIES = 10;

/** Max description length */
export const MAX_DESCRIPTION_LENGTH = 2000;

// ============================================
// CENTRALIZED dispute natures (single source of truth)
// ============================================
export const DISPUTE_NATURES = [
  { value: 'succession', label: 'Litige successoral', description: "Conflit lié à l'héritage ou à la transmission du bien" },
  { value: 'delimitation', label: 'Conflit de délimitation', description: 'Contestation des limites de la parcelle avec un voisin' },
  { value: 'construction_anarchique', label: 'Construction anarchique', description: 'Empiétement ou construction non autorisée sur la parcelle' },
  { value: 'expropriation', label: 'Expropriation', description: "Procédure d'expropriation initiée par une autorité publique" },
  { value: 'double_vente', label: 'Double vente', description: 'La parcelle a été vendue à plusieurs acquéreurs' },
  { value: 'occupation_illegale', label: 'Occupation illégale', description: 'Occupation de la parcelle par un tiers sans droit' },
  { value: 'contestation_titre', label: 'Contestation de titre', description: 'Remise en cause de la validité du titre foncier' },
  { value: 'servitude', label: 'Litige de servitude', description: "Conflit lié à un droit de passage ou une servitude" },
  { value: 'autre', label: 'Autre', description: 'Autre type de litige foncier' },
] as const;

/** Quick lookup map: value → label */
export const DISPUTE_NATURES_MAP: Record<string, string> = Object.fromEntries(
  DISPUTE_NATURES.map(n => [n.value, n.label])
);

// ============================================
// CENTRALIZED lifting reasons (single source of truth)
// ============================================
export const LIFTING_REASONS = [
  { value: 'jugement_definitif', label: 'Jugement définitif', description: 'Le tribunal a rendu un jugement définitif et exécutoire' },
  { value: 'conciliation_reussie', label: 'Conciliation réussie', description: "Les parties ont trouvé un accord amiable" },
  { value: 'desistement', label: 'Désistement', description: "Le demandeur s'est désisté de sa réclamation" },
  { value: 'prescription', label: 'Prescription', description: "Le délai légal pour agir est expiré" },
  { value: 'transaction', label: 'Transaction / Accord transactionnel', description: 'Un accord financier ou compensatoire a été conclu' },
  { value: 'reconnaissance_droits', label: 'Reconnaissance de droits', description: 'Les droits du propriétaire ont été reconnus officiellement' },
  { value: 'erreur_materielle', label: 'Erreur matérielle', description: "Le litige a été enregistré par erreur" },
  { value: 'autre', label: 'Autre motif', description: 'Précisez dans les commentaires' },
] as const;

/** Quick lookup map: value → label */
export const LIFTING_REASONS_MAP: Record<string, string> = Object.fromEntries(
  LIFTING_REASONS.map(r => [r.value, r.label])
);

// ============================================
// CENTRALIZED resolution levels
// ============================================
export const RESOLUTION_LEVELS = [
  { value: 'familial', label: 'Niveau familial', description: 'Tentative de résolution au sein de la famille' },
  { value: 'conciliation_amiable', label: 'Conciliation amiable', description: 'Médiation ou arbitrage entre les parties' },
  { value: 'autorite_locale', label: 'Autorité locale', description: 'Le litige est soumis au chef de quartier ou de localité' },
  { value: 'arbitrage', label: "Instance d'arbitrage", description: "Le litige est devant une commission d'arbitrage" },
  { value: 'tribunal', label: 'Devant les tribunaux', description: "Le litige fait l'objet d'une procédure judiciaire" },
  { value: 'appel', label: 'En appel', description: "Le jugement a fait l'objet d'un appel" },
] as const;

// ============================================
// CENTRALIZED declarant qualities
// ============================================
export const DECLARANT_QUALITIES = [
  { value: 'proprietaire', label: 'Propriétaire' },
  { value: 'coproprietaire', label: 'Copropriétaire' },
  { value: 'heritier', label: 'Héritier' },
  { value: 'mandataire', label: 'Mandataire / Représentant légal' },
  { value: 'occupant', label: 'Occupant' },
  { value: 'voisin', label: 'Voisin' },
  { value: 'autre', label: 'Autre' },
] as const;

export const DECLARANT_QUALITIES_MAP: Record<string, string> = Object.fromEntries(
  DECLARANT_QUALITIES.map(q => [q.value, q.label])
);

// ============================================
// CENTRALIZED requester qualities (for lifting)
// ============================================
export const REQUESTER_QUALITIES = [
  { value: 'proprietaire', label: 'Propriétaire' },
  { value: 'coproprietaire', label: 'Copropriétaire' },
  { value: 'heritier', label: 'Héritier' },
  { value: 'mandataire', label: 'Mandataire / Représentant légal' },
  { value: 'avocat', label: 'Avocat' },
  { value: 'notaire', label: 'Notaire' },
] as const;

// ============================================
// CENTRALIZED party roles
// ============================================
export const PARTY_ROLES = [
  { value: 'demandeur', label: 'Demandeur' },
  { value: 'defendeur', label: 'Défendeur' },
  { value: 'tiers', label: 'Tiers concerné' },
  { value: 'temoin', label: 'Témoin' },
] as const;

export const PARTY_ROLES_MAP: Record<string, string> = Object.fromEntries(
  PARTY_ROLES.map(r => [r.value, r.label])
);

// ============================================
// CENTRALIZED status config
// ============================================
export const DISPUTE_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  en_cours: { label: 'En cours', variant: 'secondary' },
  resolu: { label: 'Résolu', variant: 'default' },
  familial: { label: 'Familial', variant: 'secondary' },
  conciliation_amiable: { label: 'Conciliation', variant: 'secondary' },
  autorite_locale: { label: 'Autorité locale', variant: 'secondary' },
  arbitrage: { label: 'Arbitrage', variant: 'outline' },
  tribunal: { label: 'Tribunal', variant: 'destructive' },
  appel: { label: 'En appel', variant: 'destructive' },
  demande_levee: { label: 'Demande de levée', variant: 'outline' },
  leve: { label: 'Levé', variant: 'default' },
};

/** Shared badge helper */
export const getStatusLabel = (status: string): string => {
  return DISPUTE_STATUS_CONFIG[status]?.label || status;
};

export const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  return DISPUTE_STATUS_CONFIG[status]?.variant || 'secondary';
};
