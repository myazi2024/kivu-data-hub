export interface ParcelData {
  id: string;
  parcel_number: string;
  current_owner_name: string;
  current_owner_legal_status?: string;
  property_title_type?: string;
  title_reference_number?: string;
  province?: string;
  ville?: string;
  commune?: string;
  quartier?: string;
  avenue?: string;
  area_sqm?: number;
}

export interface MortgageData {
  id: string;
  reference_number: string;
  creditor_name: string;
  creditor_type: string;
  mortgage_amount_usd: number;
  contract_date: string;
  duration_months: number;
  mortgage_status: string;
}

export interface CancellationRequest {
  mortgageReferenceNumber: string;
  reason: string;
  cancellationDate: string;
  settlementAmount: string;
  requesterName: string;
  requesterPhone: string;
  requesterEmail: string;
  requesterIdNumber: string;
  requesterQuality: string;
  creditorAccord: boolean;
  supportingDocuments: File[];
  comments: string;
}

export type Step = 'form' | 'review' | 'payment' | 'confirmation';

export const CANCELLATION_REASONS = [
  { value: 'remboursement_integral', label: 'Remboursement intégral du prêt', description: 'La dette hypothécaire a été entièrement remboursée' },
  { value: 'refinancement', label: 'Refinancement', description: 'Transfert de la dette vers un autre créancier' },
  { value: 'accord_amiable', label: 'Accord amiable', description: 'Accord négocié avec le créancier' },
  { value: 'prescription', label: 'Prescription extinctive', description: "L'hypothèque est prescrite (30 ans)" },
  { value: 'renonciation', label: 'Renonciation du créancier', description: 'Le créancier renonce à son droit' },
  { value: 'autre', label: 'Autre motif', description: 'Précisez dans les commentaires' }
];

export const REQUESTER_QUALITIES = [
  { value: 'proprietaire', label: 'Propriétaire du bien' },
  { value: 'debiteur', label: 'Débiteur' },
  { value: 'mandataire', label: 'Mandataire/Représentant légal' },
  { value: 'heritier', label: 'Héritier' },
  { value: 'notaire', label: 'Notaire' }
];

export const PHONE_REGEX_DRC = /^(\+?243|0)(8[1-9]|9[0-9])\d{7}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const ACTIVE_MORTGAGE_STATUSES = ['active', 'en_defaut', 'renegociee'];
export const MAX_DOCUMENTS = 5;

export interface MortgageFee {
  id: string;
  name: string;
  amount_usd: number;
  description?: string;
  is_mandatory: boolean;
}
