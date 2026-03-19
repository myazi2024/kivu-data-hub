import type { ExpertiseFee } from '@/types/expertise';

export interface ExpertiseFormState {
  // General
  propertyDescription: string;
  constructionType: string;
  constructionYear: string;
  constructionQuality: string;
  numberOfFloors: string;
  totalBuiltAreaSqm: string;
  propertyCondition: string;
  numberOfRooms: string;
  numberOfBedrooms: string;
  numberOfBathrooms: string;

  // Materials
  wallMaterial: string;
  roofMaterial: string;
  windowType: string;
  floorMaterial: string;
  hasPlaster: boolean;
  hasPainting: boolean;
  hasCeiling: boolean;

  // Position
  buildingPosition: string;
  facadeOrientation: string;
  distanceFromRoad: string;
  isCornerPlot: boolean;
  hasDirectStreetAccess: boolean;

  // Apartment
  floorNumber: string;
  totalBuildingFloors: string;
  accessibility: string;
  apartmentNumber: string;
  hasCommonAreas: boolean;
  monthlyCharges: string;

  // Sound
  soundEnvironment: string;
  nearbyNoiseSources: string[];
  hasDoubleGlazing: boolean;
  isOnSite: boolean | null;
  measuredDecibels: number | null;

  // Equipment
  hasWaterSupply: boolean;
  hasElectricity: boolean;
  hasSewageSystem: boolean;
  hasInternet: boolean;
  internetProvider: string;
  hasSecuritySystem: boolean;
  hasParking: boolean;
  parkingSpaces: string;
  hasGarden: boolean;
  gardenAreaSqm: string;
  hasPool: boolean;
  hasAirConditioning: boolean;
  hasSolarPanels: boolean;
  hasWaterTank: boolean;
  hasGenerator: boolean;
  hasBorehole: boolean;
  hasElectricFence: boolean;
  hasGarage: boolean;
  hasCellar: boolean;
  hasAutomaticGate: boolean;

  // Environment
  roadAccessType: string;
  distanceToMainRoad: string;
  distanceToHospital: string;
  distanceToSchool: string;
  distanceToMarket: string;
  floodRiskZone: boolean;
  erosionRiskZone: boolean;
  nearbyAmenities: string[];

  // Documents
  additionalNotes: string;
}

export const INITIAL_FORM_STATE: ExpertiseFormState = {
  propertyDescription: '',
  constructionType: 'villa',
  constructionYear: '',
  constructionQuality: 'standard',
  numberOfFloors: '1',
  totalBuiltAreaSqm: '',
  propertyCondition: 'bon',
  numberOfRooms: '',
  numberOfBedrooms: '',
  numberOfBathrooms: '',
  wallMaterial: 'parpaings',
  roofMaterial: 'tole_bac',
  windowType: 'aluminium',
  floorMaterial: 'carrelage',
  hasPlaster: true,
  hasPainting: true,
  hasCeiling: true,
  buildingPosition: 'premiere_position',
  facadeOrientation: '',
  distanceFromRoad: '',
  isCornerPlot: false,
  hasDirectStreetAccess: true,
  floorNumber: '',
  totalBuildingFloors: '',
  accessibility: 'escalier',
  apartmentNumber: '',
  hasCommonAreas: false,
  monthlyCharges: '',
  soundEnvironment: 'calme',
  nearbyNoiseSources: [],
  hasDoubleGlazing: false,
  isOnSite: null,
  measuredDecibels: null,
  hasWaterSupply: false,
  hasElectricity: false,
  hasSewageSystem: false,
  hasInternet: false,
  internetProvider: '',
  hasSecuritySystem: false,
  hasParking: false,
  parkingSpaces: '',
  hasGarden: false,
  gardenAreaSqm: '',
  hasPool: false,
  hasAirConditioning: false,
  hasSolarPanels: false,
  hasWaterTank: false,
  hasGenerator: false,
  hasBorehole: false,
  hasElectricFence: false,
  hasGarage: false,
  hasCellar: false,
  hasAutomaticGate: false,
  roadAccessType: 'asphalte',
  distanceToMainRoad: '',
  distanceToHospital: '',
  distanceToSchool: '',
  distanceToMarket: '',
  floodRiskZone: false,
  erosionRiskZone: false,
  nearbyAmenities: [],
  additionalNotes: '',
};

export type FormAction =
  | { type: 'SET_FIELD'; field: keyof ExpertiseFormState; value: any }
  | { type: 'SET_MULTIPLE'; fields: Partial<ExpertiseFormState> }
  | { type: 'RESET' };

export function formReducer(state: ExpertiseFormState, action: FormAction): ExpertiseFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_MULTIPLE':
      return { ...state, ...action.fields };
    case 'RESET':
      return INITIAL_FORM_STATE;
    default:
      return state;
  }
}

export interface ParcelData {
  province?: string;
  ville?: string;
  commune?: string;
  quartier?: string;
  area_sqm?: number;
  current_owner_name?: string;
  construction_type?: string;
  property_title_type?: string;
}

export interface ValidationError {
  label: string;
  tab: string;
  required: boolean;
}

export function getValidationErrors(state: ExpertiseFormState): ValidationError[] {
  const missing: ValidationError[] = [];
  const isTerrainNu = state.constructionType === 'terrain_nu';

  // Required
  if (!state.constructionType) {
    missing.push({ label: 'Type de construction', tab: 'general', required: true });
  }

  // Recommended (not required)
  if (!isTerrainNu) {
    if (!state.constructionYear) missing.push({ label: 'Année de construction', tab: 'general', required: false });
    if (!state.totalBuiltAreaSqm) missing.push({ label: 'Surface construite', tab: 'general', required: false });
    if (!state.numberOfRooms) missing.push({ label: 'Nombre de pièces', tab: 'general', required: false });
  }

  return missing;
}

export function getCompletionPercentage(state: ExpertiseFormState): number {
  const fields = [
    state.constructionType, state.constructionYear, state.constructionQuality,
    state.numberOfFloors, state.totalBuiltAreaSqm, state.propertyCondition,
    state.numberOfRooms, state.numberOfBedrooms, state.numberOfBathrooms,
    state.wallMaterial, state.roofMaterial, state.windowType, state.floorMaterial,
    state.buildingPosition, state.roadAccessType, state.soundEnvironment
  ].filter(Boolean).length;
  return Math.round((fields / 16) * 100);
}

export function getSelectedEquipments(state: ExpertiseFormState): string[] {
  return [
    state.hasWaterSupply && 'Eau courante',
    state.hasElectricity && 'Électricité',
    state.hasSewageSystem && 'Assainissement',
    state.hasInternet && `Internet${state.internetProvider ? ` (${state.internetProvider === 'vsat' ? 'V-Sat' : state.internetProvider.charAt(0).toUpperCase() + state.internetProvider.slice(1)})` : ''}`,
    state.hasSecuritySystem && 'Système de sécurité',
    state.hasParking && `Parking${state.parkingSpaces ? ` (${state.parkingSpaces} places)` : ''}`,
    state.hasGarden && `Jardin${state.gardenAreaSqm ? ` (${state.gardenAreaSqm} m²)` : ''}`,
    state.hasPool && 'Piscine',
    state.hasAirConditioning && 'Climatisation',
    state.hasSolarPanels && 'Panneaux solaires',
    state.hasWaterTank && 'Citerne d\'eau',
    state.hasGenerator && 'Groupe électrogène',
    state.hasBorehole && 'Forage',
    state.hasElectricFence && 'Clôture électrique',
    state.hasGarage && 'Garage',
    state.hasCellar && 'Cave',
    state.hasAutomaticGate && 'Portail automatique'
  ].filter(Boolean) as string[];
}

export function getSelectedFinishes(state: ExpertiseFormState): string[] {
  return [
    state.hasPlaster && 'Crépissage',
    state.hasPainting && 'Peinture',
    state.hasCeiling && 'Plafond',
    state.hasDoubleGlazing && 'Double vitrage'
  ].filter(Boolean) as string[];
}

export function getSelectedRisks(state: ExpertiseFormState): string[] {
  return [
    state.floodRiskZone && 'Zone inondable',
    state.erosionRiskZone && 'Zone d\'érosion'
  ].filter(Boolean) as string[];
}

export function buildFormSubmissionData(
  state: ExpertiseFormState,
  parcelNumber: string,
  parcelId?: string,
  profile?: { full_name?: string; email?: string } | null,
  userEmail?: string
) {
  const isTerrainNu = state.constructionType === 'terrain_nu';

  const extendedData = {
    construction_type: state.constructionType,
    number_of_rooms: state.numberOfRooms ? parseInt(state.numberOfRooms) : undefined,
    number_of_bedrooms: state.numberOfBedrooms ? parseInt(state.numberOfBedrooms) : undefined,
    number_of_bathrooms: state.numberOfBathrooms ? parseInt(state.numberOfBathrooms) : undefined,
    ...(!isTerrainNu ? {
      wall_material: state.wallMaterial,
      roof_material: state.roofMaterial,
      window_type: state.windowType,
      floor_material: state.floorMaterial,
      has_plaster: state.hasPlaster,
      has_painting: state.hasPainting,
      has_ceiling: state.hasCeiling,
    } : {}),
    building_position: state.buildingPosition,
    facade_orientation: state.facadeOrientation || undefined,
    distance_from_road: state.distanceFromRoad ? parseFloat(state.distanceFromRoad) : undefined,
    is_corner_plot: state.isCornerPlot,
    has_direct_street_access: state.hasDirectStreetAccess,
    floor_number: state.floorNumber ? parseInt(state.floorNumber) : undefined,
    total_building_floors: state.totalBuildingFloors ? parseInt(state.totalBuildingFloors) : undefined,
    accessibility: state.accessibility,
    apartment_number: state.apartmentNumber || undefined,
    has_common_areas: state.hasCommonAreas,
    monthly_charges: state.monthlyCharges ? parseFloat(state.monthlyCharges) : undefined,
    sound_environment: state.soundEnvironment,
    nearby_noise_sources: state.nearbyNoiseSources.length > 0 ? state.nearbyNoiseSources.join(', ') : undefined,
    has_double_glazing: state.hasDoubleGlazing,
    internet_provider: state.hasInternet && state.internetProvider ? state.internetProvider : undefined,
    has_pool: state.hasPool,
    has_air_conditioning: state.hasAirConditioning,
    has_solar_panels: state.hasSolarPanels,
    has_water_tank: state.hasWaterTank,
    has_generator: state.hasGenerator,
    has_borehole: state.hasBorehole,
    has_electric_fence: state.hasElectricFence,
    has_garage: state.hasGarage,
    has_cellar: state.hasCellar,
    has_automatic_gate: state.hasAutomaticGate,
    nearby_amenities: state.nearbyAmenities.length > 0 ? state.nearbyAmenities.join(', ') : undefined,
  };

  return {
    parcel_number: parcelNumber,
    parcel_id: parcelId,
    property_description: state.propertyDescription || undefined,
    construction_year: state.constructionYear ? parseInt(state.constructionYear) : undefined,
    construction_quality: state.constructionQuality,
    number_of_floors: state.numberOfFloors ? parseInt(state.numberOfFloors) : undefined,
    total_built_area_sqm: state.totalBuiltAreaSqm ? parseFloat(state.totalBuiltAreaSqm) : undefined,
    property_condition: state.propertyCondition,
    has_water_supply: state.hasWaterSupply,
    has_electricity: state.hasElectricity,
    has_sewage_system: state.hasSewageSystem,
    has_internet: state.hasInternet,
    has_security_system: state.hasSecuritySystem,
    has_parking: state.hasParking,
    parking_spaces: state.parkingSpaces ? parseInt(state.parkingSpaces) : undefined,
    has_garden: state.hasGarden,
    garden_area_sqm: state.gardenAreaSqm ? parseFloat(state.gardenAreaSqm) : undefined,
    road_access_type: state.roadAccessType,
    distance_to_main_road_m: state.distanceToMainRoad ? parseFloat(state.distanceToMainRoad) : undefined,
    distance_to_hospital_km: state.distanceToHospital ? parseFloat(state.distanceToHospital) : undefined,
    distance_to_school_km: state.distanceToSchool ? parseFloat(state.distanceToSchool) : undefined,
    distance_to_market_km: state.distanceToMarket ? parseFloat(state.distanceToMarket) : undefined,
    flood_risk_zone: state.floodRiskZone,
    erosion_risk_zone: state.erosionRiskZone,
    additional_notes: JSON.stringify({
      user_notes: state.additionalNotes,
      extended_data: extendedData,
    }),
    requester_name: profile?.full_name || userEmail || 'Utilisateur',
    requester_phone: undefined,
    requester_email: profile?.email || userEmail || undefined,
  };
}
