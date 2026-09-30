// Shared types for the Land Title Request dialog and its sub-components.

export interface ParcelSearchResult {
  parcel_number: string;
  id: string;
}

export interface ParcelOwnerData {
  legalStatus?: string;
  gender?: string;
  lastName?: string;
  firstName?: string;
  middleName?: string;
  phone?: string;
  email?: string;
}

export interface ParcelLocationData {
  province?: string;
  sectionType?: string;
  ville?: string;
  commune?: string;
  quartier?: string;
  avenue?: string;
  territoire?: string;
  collectivite?: string;
  groupement?: string;
  village?: string;
  parcelSides?: any[];
  gpsCoordinates?: any[];
}

export interface ParcelValorisationData {
  propertyCategory?: string;
  constructionType?: string;
  constructionNature?: string;
  constructionMaterials?: string;
  declaredUsage?: string;
  standing?: string;
  constructionYear?: number;
  floorNumber?: string;
}

export interface ParcelBuildingPermit {
  permit_number: string;
  administrative_status: string;
  issue_date: string;
  issuing_service: string;
  validity_period_months: number;
  is_current: boolean;
}

export interface GpsCoordinateEntry {
  borne: string;
  lat: string;
  lng: string;
}

export interface ParcelSideEntry {
  name: string;
  length: string;
}
