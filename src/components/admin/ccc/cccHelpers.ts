/**
 * Lecture compatible camelCase / snake_case sur un objet JSON.
 * Retourne la première clé non-null trouvée.
 */
export const readField = (obj: any, ...keys: string[]): any => {
  if (!obj) return null;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return null;
};

// ============================================================================
// Types narrow pour les entrées JSON imbriquées dans cadastral_contributions
// (évite les `as any` dans les boucles d'insertion d'historiques)
// ============================================================================

export interface OwnershipHistoryEntry {
  owner_name?: string | null;
  legal_status?: string | null;
  ownership_start_date?: string | null;
  ownership_end_date?: string | null;
  mutation_type?: string | null;
  ownership_document_url?: string | null;
}

export interface BoundaryHistoryEntry {
  pv_reference_number?: string | null;
  boundary_purpose?: string | null;
  surveyor_name?: string | null;
  survey_date?: string | null;
  boundary_document_url?: string | null;
}

export interface BuildingPermitEntry {
  permit_number?: string | null;
  issuing_service?: string | null;
  issue_date?: string | null;
  validity_period_months?: number | null;
  administrative_status?: string | null;
  is_current?: boolean | null;
  issuing_service_contact?: string | null;
  permit_document_url?: string | null;
}

export interface MortgageHistoryEntry {
  mortgage_amount_usd?: number;
  mortgageAmountUsd?: number;
  duration_months?: number;
  durationMonths?: number;
  creditor_name?: string;
  creditorName?: string;
  creditor_type?: string;
  creditorType?: string;
  contract_date?: string;
  contractDate?: string;
  mortgage_status?: string;
  mortgageStatus?: string;
}

export interface GpsCoordinate {
  lat?: number;
  latitude?: number;
  lng?: number;
  longitude?: number;
  borne?: number | string;
}
