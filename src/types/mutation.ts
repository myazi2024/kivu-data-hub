/**
 * Types centralisés pour le système de mutation foncière.
 * Utilisés dans le hook, le formulaire, et l'admin.
 */

export interface MutationFee {
  id: string;
  fee_name: string;
  amount_usd: number;
  description: string | null;
  is_mandatory: boolean;
  is_active: boolean;
  display_order: number;
}

export interface MutationRequest {
  id: string;
  reference_number: string;
  user_id: string;
  parcel_number: string;
  parcel_id: string | null;
  mutation_type: string;
  requester_type: string;
  requester_name: string;
  requester_phone: string | null;
  requester_email: string | null;
  beneficiary_name: string | null;
  beneficiary_phone: string | null;
  beneficiary_id_document_url: string | null;
  requester_id_document_url: string | null;
  proposed_changes: Record<string, any>;
  justification: string | null;
  fee_items: any[];
  total_amount_usd: number;
  payment_status: string;
  payment_id: string | null;
  paid_at: string | null;
  status: string;
  processing_notes: string | null;
  rejection_reason: string | null;
  estimated_processing_days: number;
  supporting_documents: any[] | null;
  // New dedicated columns (previously in proposed_changes JSON)
  market_value_usd: number | null;
  expertise_certificate_url: string | null;
  expertise_certificate_date: string | null;
  title_age: string | null;
  mutation_fee_amount: number | null;
  bank_fee_amount: number | null;
  late_fee_amount: number | null;
  late_fee_days: number | null;
  // Certificate (private bucket; resolve via get_signed_mutation_certificate RPC)
  certificate_url: string | null;
  certificate_issued_at: string | null;
  // Workflow
  escalated?: boolean | null;
  escalated_at?: string | null;
  // Timestamps
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Extended type for admin views with profile join */
export interface MutationRequestWithProfile extends MutationRequest {
  profiles?: { full_name: string; email: string } | null;
}

/** Plafond légal pour les frais de retard (en USD) */
export const LATE_FEE_CAP_USD = 500;

/** Tarif journalier de retard */
export const DAILY_LATE_FEE_USD = 0.45;

/** Délai de grâce légal (jours) */
export const LEGAL_GRACE_PERIOD_DAYS = 20;
