export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  completeness_score: number;
}

export interface Contribution {
  id: string;
  user_id: string;
  parcel_number: string;
  parcel_type: string | null;
  status: string;
  is_suspicious: boolean;
  fraud_score: number;
  fraud_reason: string | null;
  rejection_reason: string | null;
  rejection_reasons: any;
  created_at: string;
  reviewed_at: string | null;
  property_title_type: string | null;
  lease_type: string | null;
  lease_years: number | null;
  is_title_in_current_owner_name: boolean | null;
  title_reference_number: string | null;
  title_issue_date: string | null;
  current_owner_name: string | null;
  current_owners_details: any;
  current_owner_legal_status: string | null;
  current_owner_since: string | null;
  area_sqm: number | null;
  parcel_sides: any;
  property_category: string | null;
  construction_type: string | null;
  construction_nature: string | null;
  construction_materials: string | null;
  construction_year: number | null;
  standing: string | null;
  declared_usage: string | null;
  apartment_number: string | null;
  floor_number: string | null;
  house_number: string | null;
  additional_constructions: any;
  province: string | null;
  ville: string | null;
  commune: string | null;
  quartier: string | null;
  avenue: string | null;
  territoire: string | null;
  collectivite: string | null;
  groupement: string | null;
  village: string | null;
  gps_coordinates: any;
  road_sides: any;
  servitude_data: any;
  building_shapes: any;
  has_dispute: boolean | null;
  dispute_data: any;
  ownership_history: any;
  boundary_history: any;
  tax_history: any;
  mortgage_history: any;
  building_permits: any;
  previous_permit_number: string | null;
  permit_request_data: any;
  whatsapp_number: string | null;
  owner_document_url: string | null;
  property_title_document_url: string | null;
  appeal_submitted: boolean | null;
  appeal_status: string | null;
  appeal_data: any;
  appeal_submission_date: string | null;
  contribution_type: string;
  original_parcel_id: string | null;
  changed_fields: any;
  change_justification: string | null;
}

export interface ContributionStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  suspicious: number;
}

export interface TestResult {
  test: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: unknown;
}
