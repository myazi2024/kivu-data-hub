import { StatusType } from '@/components/shared/StatusBadge';

export interface SubdivisionRequest {
  id: string;
  reference_number: string;
  user_id: string;
  parcel_number: string;
  parcel_id?: string;
  parent_parcel_area_sqm: number;
  parent_parcel_location?: string;
  parent_parcel_owner_name: string;
  parent_parcel_title_reference?: string;
  parent_parcel_title_type?: string;
  parent_parcel_gps_coordinates?: any;
  requester_first_name: string;
  requester_last_name: string;
  requester_middle_name?: string;
  requester_phone: string;
  requester_email?: string;
  requester_type?: string;
  requester_legal_status?: string | null;
  requester_gender?: string | null;
  requester_entity_type?: string | null;
  requester_entity_subtype?: string | null;
  requester_rccm_number?: string | null;
  requester_right_type?: string | null;
  requester_state_exploited_by?: string | null;
  requester_nationality?: string | null;
  number_of_lots: number;
  lots_data: any[];
  subdivision_plan_data?: any;
  purpose_of_subdivision?: string;
  submission_fee_usd: number;
  processing_fee_usd?: number;
  total_amount_usd: number;
  submission_payment_status?: string;
  status: string;
  rejection_reason?: string;
  processing_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  requester_id_document_url?: string | null;
  proof_of_ownership_url?: string | null;
  subdivision_sketch_url?: string | null;
  assigned_to?: string | null;
  assigned_at?: string | null;
  in_review_at?: string | null;
  estimated_processing_days?: number;
  escalated?: boolean;
  escalated_at?: string | null;
}

export type ActionType = 'approve' | 'reject' | 'return';

export const SUBDIVISION_STATUS_MAP: Record<string, StatusType> = {
  pending: 'pending',
  in_review: 'in_review',
  approved: 'approved',
  rejected: 'rejected',
  returned: 'returned',
  awaiting_payment: 'processing',
  completed: 'completed',
};

export const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  in_review: 'En examen',
  approved: 'Approuvé',
  rejected: 'Rejeté',
  returned: 'Renvoyé',
  awaiting_payment: 'Attente paiement',
  completed: 'Terminé',
};

export const PURPOSE_LABELS: Record<string, string> = {
  sale: 'Vente',
  inheritance: 'Succession / Héritage',
  investment: 'Investissement immobilier',
  construction: 'Construction de logements',
  donation: 'Donation',
  family: 'Partage familial',
  commercial: 'Projet commercial',
  other: 'Autre',
  family_distribution: 'Distribution familiale',
  development: 'Aménagement immobilier',
  Vente: 'Vente',
  'Succession / Héritage': 'Succession / Héritage',
  'Investissement immobilier': 'Investissement immobilier',
  'Construction de logements': 'Construction de logements',
  Donation: 'Donation',
  'Partage familial': 'Partage familial',
  'Projet commercial': 'Projet commercial',
  Autre: 'Autre',
};

export const REQUESTER_TYPE_LABELS: Record<string, string> = {
  owner: 'Propriétaire',
  mandatary: 'Mandataire',
  notary: 'Notaire',
  other: 'Autre',
};

export const USAGE_LABELS: Record<string, string> = {
  residential: 'Résidentiel',
  commercial: 'Commercial',
  industrial: 'Industriel',
  agricultural: 'Agricole',
  mixed: 'Mixte',
};

export const OPEN_STATUSES = ['pending', 'in_review', 'returned'];
