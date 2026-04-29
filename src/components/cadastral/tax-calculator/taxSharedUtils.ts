/**
 * Shared utility functions for tax calculators.
 * Centralizes zone, usage, and construction detection logic
 * to avoid duplication across PropertyTax, BuildingTax, and IRL calculators.
 */

export const detectZoneType = (parcelNumber: string, parcelData?: any): 'urban' | 'rural' => {
  if (parcelNumber?.startsWith('SR')) return 'rural';
  if (parcelNumber?.startsWith('SU')) return 'urban';
  if (parcelData?.parcel_type === 'rural') return 'rural';
  return 'urban';
};

export const isZoneAutoDetected = (parcelNumber: string): boolean => {
  return parcelNumber?.startsWith('SR') || parcelNumber?.startsWith('SU');
};

/**
 * Maps DB declared_usage values to internal tax usage categories.
 * Source of truth for DB values: useCCCFormPicklists → picklist_declared_usage
 * If CCC picklist labels change, update these switch cases accordingly.
 */
export const detectUsageType = (parcelData?: any): 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'mixed' => {
  switch (parcelData?.declared_usage) {
    // CCC picklist values (source of truth)
    case 'Habitation':
    case 'Location':
      return 'residential';
    case 'Commerce':
    case 'Bureau':
    case 'Entrepôt':
      return 'commercial';
    case 'Industrie':
      return 'industrial';
    case 'Agriculture':
    case 'Terrain vacant':
    case 'Parking':
      return 'agricultural';
    case 'Usage mixte':
      return 'mixed';
    // Legacy values (backward compat)
    case 'Commercial': return 'commercial';
    case 'Industriel': return 'industrial';
    case 'Agricole': return 'agricultural';
    default: return 'residential';
  }
};

/**
 * Maps DB construction_nature values to internal tax construction categories.
 * Source of truth for DB values: useCCCFormPicklists → picklist_construction_nature
 * If CCC picklist labels change, update these switch cases accordingly.
 */
export const detectConstructionType = (parcelData?: any): 'en_dur' | 'semi_dur' | 'en_paille' | null => {
  const nature = parcelData?.construction_nature;
  switch (nature) {
    // CCC picklist values (source of truth)
    case 'Durable':
      return 'en_dur';
    case 'Semi-durable':
      return 'semi_dur';
    case 'Précaire':
      return 'en_paille';
    case 'Non bâti':
      return null;
    // Legacy values (backward compat)
    case 'En dur': return 'en_dur';
    case 'Semi-dur': return 'semi_dur';
    case 'En paille': return 'en_paille';
    // Also check construction_type for Terrain nu
    default:
      if (parcelData?.construction_type === 'Terrain nu') return null;
      return null;
  }
};

/**
 * Check for duplicate tax submissions in cadastral_contributions.
 * #6 fix: Filters by contribution_type = 'update' to avoid false positives
 *         from 'new' contributions that happen to contain tax_history.
 * Multi-construction fix: Optionally scope by `constructionRef` so that the
 *         same taxType/year can be declared for two different buildings on
 *         the same parcel. When `constructionRef` is undefined, falls back to
 *         legacy behaviour (parcel-wide uniqueness).
 */
export const checkDuplicateTaxSubmission = async (
  supabase: any,
  parcelNumber: string,
  userId: string,
  taxType: string,
  taxYear: number,
  constructionRef?: string,
): Promise<boolean> => {
  const { data } = await supabase
    .from('cadastral_contributions')
    .select('id, tax_history')
    .eq('parcel_number', parcelNumber)
    .eq('user_id', userId)
    .eq('contribution_type', 'update') // #6: Only check 'update' type contributions
    .neq('status', 'rejected')
    .neq('status', 'returned');

  if (!data || data.length === 0) return false;

  return data.some((c: any) => {
    const history = c.tax_history as any[];
    return history?.some((h: any) => {
      if (h.tax_type !== taxType) return false;
      if (Number(h.tax_year) !== taxYear) return false;
      if (constructionRef !== undefined) {
        const existingRef = h.construction_ref ?? h.constructionRef ?? 'main';
        return existingRef === constructionRef;
      }
      return true;
    });
  });
};
