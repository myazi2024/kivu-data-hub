/**
 * Shared types for Land Title Request across admin, user, and form views.
 */

export interface LandTitleRequestRow {
  id: string;
  reference_number: string;
  user_id: string;
  request_type: string | null;
  province: string;
  section_type: string;
  ville: string | null;
  commune: string | null;
  quartier: string | null;
  avenue: string | null;
  territoire: string | null;
  collectivite: string | null;
  groupement: string | null;
  village: string | null;
  circonscription_fonciere: string | null;
  area_sqm: number | null;
  gps_coordinates: any;
  parcel_sides: any;
  road_bordering_sides: any;
  requester_type: string;
  requester_first_name: string;
  requester_middle_name: string | null;
  requester_last_name: string;
  requester_phone: string;
  requester_email: string | null;
  requester_legal_status: string | null;
  requester_gender: string | null;
  requester_id_document_url: string | null;
  is_owner_same_as_requester: boolean;
  owner_first_name: string | null;
  owner_middle_name: string | null;
  owner_last_name: string | null;
  owner_phone: string | null;
  owner_legal_status: string | null;
  owner_gender: string | null;
  owner_id_document_url: string | null;
  proof_of_ownership_url: string | null;
  procuration_document_url: string | null;
  additional_documents: any;
  fee_items: any;
  total_amount_usd: number;
  payment_status: string;
  payment_id: string | null;
  paid_at: string | null;
  status: string;
  processing_notes: string | null;
  rejection_reason: string | null;
  estimated_processing_days: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  deduced_title_type: string | null;
  construction_type: string | null;
  construction_nature: string | null;
  construction_materials: string | null;
  declared_usage: string | null;
  nationality: string | null;
  occupation_duration: string | null;
  selected_parcel_number: string | null;
  // Joined from profiles (optional)
  profiles?: { full_name: string; email: string } | null;
}

/** Lightweight type for user list view (fewer fields) */
export type LandTitleRequestSummary = Pick<LandTitleRequestRow,
  'id' | 'reference_number' | 'status' | 'payment_status' | 'section_type' |
  'province' | 'ville' | 'commune' | 'quartier' | 'territoire' |
  'total_amount_usd' | 'created_at' | 'reviewed_at' | 'rejection_reason' |
  'requester_first_name' | 'requester_last_name' | 'area_sqm' | 'fee_items'
>;

/** Helper to build full name from a request */
export const getRequestFullName = (r: Pick<LandTitleRequestRow, 'requester_first_name' | 'requester_middle_name' | 'requester_last_name'>): string => {
  return [r.requester_first_name, r.requester_middle_name, r.requester_last_name].filter(Boolean).join(' ').trim();
};

/** Helper to build location string */
export const getRequestLocation = (r: Pick<LandTitleRequestRow, 'section_type' | 'quartier' | 'commune' | 'ville' | 'village' | 'groupement' | 'collectivite' | 'territoire'>): string => {
  if (r.section_type === 'urbaine') {
    return [r.quartier, r.commune, r.ville].filter(Boolean).join(', ');
  }
  return [r.village, r.groupement, r.collectivite, r.territoire].filter(Boolean).join(', ');
};

/** Columns for the admin list (avoids SELECT *) */
export const ADMIN_LIST_COLUMNS = `
  id, reference_number, user_id, request_type, province, section_type,
  ville, commune, quartier, territoire, collectivite, groupement, village,
  area_sqm, requester_type, requester_first_name, requester_middle_name,
  requester_last_name, requester_phone, requester_email,
  is_owner_same_as_requester, total_amount_usd, payment_status, status,
  created_at, updated_at, deduced_title_type, selected_parcel_number
` as const;

/** Columns for admin detail view (full) */
export const ADMIN_DETAIL_COLUMNS = '*' as const;

/** File validation helper for land title uploads */
export const validateLandTitleFile = (file: File): { valid: boolean; error?: string } => {
  const VALID_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  if (!VALID_TYPES.includes(file.type)) {
    return { valid: false, error: 'Format non supporté. Utilisez PDF, JPG, PNG ou WebP.' };
  }
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'Fichier trop volumineux (max 10 MB).' };
  }
  return { valid: true };
};
