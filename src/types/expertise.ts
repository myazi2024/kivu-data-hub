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

  // Extended columns (previously stored as JSON in additional_notes)
  wall_material?: string;
  roof_material?: string;
  window_type?: string;
  floor_material?: string;
  has_plaster?: boolean;
  has_painting?: boolean;
  has_ceiling?: boolean;
  has_double_glazing?: boolean;
  building_position?: string;
  facade_orientation?: string;
  is_corner_plot?: boolean;
  // sound_environment and nearby_noise_sources removed — now in CCC/cadastral_parcels
  has_pool?: boolean;
  has_air_conditioning?: boolean;
  has_solar_panels?: boolean;
  has_generator?: boolean;
  has_water_tank?: boolean;
  has_borehole?: boolean;
  has_electric_fence?: boolean;
  has_garage?: boolean;
  has_cellar?: boolean;
  has_automatic_gate?: boolean;
  internet_provider?: string;
  number_of_rooms?: number;
  number_of_bedrooms?: number;
  number_of_bathrooms?: number;
  apartment_number?: string;
  floor_number?: string;
  total_building_floors?: number;
  accessibility?: string;
  monthly_charges?: number;
  has_common_areas?: boolean;
  nearby_amenities?: string;

  // Building permit columns
  has_building_permit?: boolean;
  building_permit_number?: string;
  building_permit_type?: string;
  building_permit_issue_date?: string;
  building_permit_issuing_service?: string;
  building_permit_document_url?: string;
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

  // Extended columns
  wall_material?: string;
  roof_material?: string;
  window_type?: string;
  floor_material?: string;
  has_plaster?: boolean;
  has_painting?: boolean;
  has_ceiling?: boolean;
  has_double_glazing?: boolean;
  building_position?: string;
  facade_orientation?: string;
  is_corner_plot?: boolean;
  // sound_environment and nearby_noise_sources removed — now in CCC/cadastral_parcels
  has_pool?: boolean;
  has_air_conditioning?: boolean;
  has_solar_panels?: boolean;
  has_generator?: boolean;
  has_water_tank?: boolean;
  has_borehole?: boolean;
  has_electric_fence?: boolean;
  has_garage?: boolean;
  has_cellar?: boolean;
  has_automatic_gate?: boolean;
  internet_provider?: string;
  number_of_rooms?: number;
  number_of_bedrooms?: number;
  number_of_bathrooms?: number;
  apartment_number?: string;
  floor_number?: string;
  total_building_floors?: number;
  accessibility?: string;
  monthly_charges?: number;
  has_common_areas?: boolean;
  nearby_amenities?: string;

  // Building permit columns
  has_building_permit?: boolean;
  building_permit_number?: string;
  building_permit_type?: string;
  building_permit_issue_date?: string;
  building_permit_issuing_service?: string;
  building_permit_document_url?: string;
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
