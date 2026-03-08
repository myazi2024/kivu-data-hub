/**
 * Type centralisé pour les demandes d'expertise immobilière.
 * Utilisé dans le hook, l'admin, le tableau de bord utilisateur et le formulaire.
 */
export interface ExpertiseRequest {
  id: string;
  reference_number: string;
  user_id: string;
  parcel_id?: string;
  parcel_number: string;
  property_description?: string;
  construction_year?: number;
  construction_quality?: string;
  number_of_floors?: number;
  total_built_area_sqm?: number;
  property_condition?: string;
  has_water_supply: boolean;
  has_electricity: boolean;
  has_sewage_system: boolean;
  has_internet: boolean;
  has_security_system: boolean;
  has_parking: boolean;
  parking_spaces?: number;
  has_garden: boolean;
  garden_area_sqm?: number;
  road_access_type?: string;
  distance_to_main_road_m?: number;
  distance_to_hospital_km?: number;
  distance_to_school_km?: number;
  distance_to_market_km?: number;
  flood_risk_zone: boolean;
  erosion_risk_zone: boolean;
  additional_notes?: string;
  supporting_documents: string[];
  requester_name: string;
  requester_phone?: string;
  requester_email?: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'rejected';
  payment_status?: 'pending' | 'paid' | 'failed';
  assigned_to?: string;
  assigned_at?: string;
  market_value_usd?: number;
  expertise_date?: string;
  expertise_report_url?: string;
  certificate_url?: string;
  certificate_issue_date?: string;
  certificate_expiry_date?: string;
  processing_notes?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExpertiseRequestData {
  parcel_number: string;
  parcel_id?: string;
  property_description?: string;
  construction_year?: number;
  construction_quality?: string;
  number_of_floors?: number;
  total_built_area_sqm?: number;
  property_condition?: string;
  has_water_supply?: boolean;
  has_electricity?: boolean;
  has_sewage_system?: boolean;
  has_internet?: boolean;
  has_security_system?: boolean;
  has_parking?: boolean;
  parking_spaces?: number;
  has_garden?: boolean;
  garden_area_sqm?: number;
  road_access_type?: string;
  distance_to_main_road_m?: number;
  distance_to_hospital_km?: number;
  distance_to_school_km?: number;
  distance_to_market_km?: number;
  flood_risk_zone?: boolean;
  erosion_risk_zone?: boolean;
  additional_notes?: string;
  supporting_documents?: string[];
  requester_name: string;
  requester_phone?: string;
  requester_email?: string;
}

export interface ExpertiseFee {
  id: string;
  fee_name: string;
  amount_usd: number;
  description: string | null;
  is_mandatory: boolean;
  is_active: boolean;
  display_order: number;
}
