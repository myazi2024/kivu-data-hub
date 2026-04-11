/** Typed interfaces for all land analytics entities */

/** Base geo fields enriched from parcel lookups */
export interface GeoFields {
  province?: string | null;
  ville?: string | null;
  commune?: string | null;
  quartier?: string | null;
  avenue?: string | null;
  territoire?: string | null;
  collectivite?: string | null;
  groupement?: string | null;
  village?: string | null;
  parcel_type?: string | null;
  section_type?: string | null;
}

export interface ParcelRecord extends GeoFields {
  id: string;
  parcel_number: string;
  property_title_type: string;
  current_owner_legal_status?: string | null;
  declared_usage?: string | null;
  construction_type?: string | null;
  construction_nature?: string | null;
  construction_year?: number | null;
  area_sqm: number;
  gps_coordinates?: any;
  lease_type?: string | null;
  property_category?: string | null;
  construction_materials?: string | null;
  standing?: string | null;
  lease_years?: number | null;
  is_subdivided?: boolean | null;
  has_dispute?: boolean | null;
  created_at: string;
}

export interface ContributionRecord extends GeoFields {
  id: string;
  parcel_number: string;
  property_title_type?: string | null;
  current_owner_legal_status?: string | null;
  current_owners_details?: any;
  declared_usage?: string | null;
  construction_type?: string | null;
  construction_nature?: string | null;
  construction_year?: number | null;
  contribution_type: string;
  area_sqm?: number | null;
  is_suspicious?: boolean | null;
  fraud_score?: number | null;
  fraud_reason?: string | null;
  appeal_submitted?: boolean | null;
  appeal_status?: string | null;
  lease_type?: string | null;
  property_category?: string | null;
  construction_materials?: string | null;
  standing?: string | null;
  status: string;
  reviewed_at?: string | null;
  created_at: string;
  building_permits?: any;
  building_shapes?: any;
}

export interface TitleRequestRecord extends GeoFields {
  id: string;
  request_type?: string | null;
  requester_type: string;
  requester_gender?: string | null;
  owner_gender?: string | null;
  nationality?: string | null;
  section_type?: string | null;
  declared_usage?: string | null;
  construction_type?: string | null;
  construction_nature?: string | null;
  construction_materials?: string | null;
  standing?: string | null;
  construction_year?: number | null;
  floor_number?: string | null;
  owner_legal_status?: string | null;
  status: string;
  payment_status: string;
  total_amount_usd?: number | null;
  area_sqm?: number | null;
  deduced_title_type?: string | null;
  estimated_processing_days?: number | null;
  is_owner_same_as_requester?: boolean | null;
  created_at: string;
  reviewed_at?: string | null;
}

export interface BuildingPermitRecord extends GeoFields {
  id: string;
  parcel_id: string;
  permit_number: string;
  administrative_status: string;
  issue_date: string;
  validity_period_months: number;
  is_current: boolean;
  issuing_service: string;
  created_at: string;
}

export interface TaxHistoryRecord extends GeoFields {
  id: string;
  parcel_id: string;
  tax_year: number;
  payment_status: string;
  amount_usd: number;
  payment_date?: string | null;
  created_at: string;
}

export interface MortgageRecord extends GeoFields {
  id: string;
  parcel_id: string;
  creditor_type: string;
  duration_months: number;
  mortgage_status: string;
  mortgage_amount_usd: number;
  contract_date: string;
  created_at: string;
}

export interface ExpertiseRequestRecord extends GeoFields {
  id: string;
  parcel_number: string;
  parcel_id?: string | null;
  status: string;
  payment_status: string;
  market_value_usd?: number | null;
  property_condition?: string | null;
  construction_quality?: string | null;
  construction_year?: number | null;
  number_of_floors?: number | null;
  total_built_area_sqm?: number | null;
  road_access_type?: string | null;
  has_electricity?: boolean | null;
  has_water_supply?: boolean | null;
  has_internet?: boolean | null;
  has_sewage_system?: boolean | null;
  has_parking?: boolean | null;
  has_security_system?: boolean | null;
  has_garden?: boolean | null;
  garden_area_sqm?: number | null;
  flood_risk_zone?: boolean | null;
  erosion_risk_zone?: boolean | null;
  distance_to_main_road_m?: number | null;
  distance_to_market_km?: number | null;
  distance_to_school_km?: number | null;
  distance_to_hospital_km?: number | null;
  expertise_date?: string | null;
  assigned_at?: string | null;
  created_at: string;
}

export interface MutationRequestRecord extends GeoFields {
  id: string;
  parcel_number: string;
  parcel_id?: string | null;
  mutation_type?: string | null;
  requester_type?: string | null;
  status: string;
  payment_status?: string | null;
  total_amount_usd?: number | null;
  market_value_usd?: number | null;
  title_age?: number | null;
  late_fee_amount?: number | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface SubdivisionRequestRecord extends GeoFields {
  id: string;
  parcel_number: string;
  parcel_id?: string | null;
  status: string;
  number_of_lots?: number | null;
  purpose_of_subdivision?: string | null;
  requester_type?: string | null;
  submission_payment_status?: string | null;
  total_amount_usd?: number | null;
  parent_parcel_area_sqm?: number | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface DisputeRecord extends GeoFields {
  id: string;
  parcel_number: string;
  parcel_id?: string | null;
  dispute_nature: string;
  dispute_type: string;
  current_status: string;
  resolution_level?: string | null;
  lifting_status?: string | null;
  lifting_request_reference?: string | null;
  lifting_reason?: string | null;
  declarant_quality: string;
  dispute_start_date?: string | null;
  created_at: string;
}

export interface OwnershipHistoryRecord extends GeoFields {
  id: string;
  parcel_id: string;
  owner_name: string;
  legal_status?: string | null;
  mutation_type?: string | null;
  ownership_start_date: string;
  ownership_end_date?: string | null;
  created_at: string;
}

export interface CertificateRecord extends GeoFields {
  id: string;
  certificate_type: string;
  parcel_number: string;
  recipient_name: string;
  reference_number: string;
  status: string;
  generated_at: string;
}

export interface InvoiceRecord extends GeoFields {
  id: string;
  invoice_number: string;
  parcel_number: string;
  client_email: string;
  total_amount_usd: number;
  status: string;
  payment_method?: string | null;
  geographical_zone?: string | null;
  discount_amount_usd?: number | null;
  created_at: string;
}
