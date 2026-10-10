/**
 * Shared utility functions for tax calculators.
 * Centralizes zone, usage, and construction detection logic
 * to avoid duplication across PropertyTax, BuildingTax, and IRL calculators.
 */

export const detectZoneType = (parcelNumber: string, parcelData?: any): 'urban' | 'rural' => {
  // Même règle que le formulaire CCC : préfixe SU/SR du numéro, puis type de parcelle.
  const num = String(parcelNumber || '').trim().toUpperCase();
  if (num.startsWith('SR')) return 'rural';
  if (num.startsWith('SU')) return 'urban';
  const t = String(parcelData?.parcel_type || '').trim().toUpperCase();
  if (t === 'SR' || t === 'RURAL' || t === 'RURALE') return 'rural';
  return 'urban';
};

export const isZoneAutoDetected = (parcelNumber: string): boolean => {
  const num = String(parcelNumber || '').trim().toUpperCase();
  return num.startsWith('SR') || num.startsWith('SU');
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

export const IRL_TAX_TYPE = 'Impôt sur les revenus locatifs';

/**
 * Insert a tax declaration contribution. The server trigger
 * `enforce_tax_declaration_insert` recomputes amounts, rejects duplicates
 * (parcel + tax type + year + construction) and creates the notification.
 * Returns the server-stored tax entry so the UI shows the authoritative amount.
 */
export const insertTaxContribution = async (
  supabase: any,
  row: Record<string, unknown>,
): Promise<{ entry: any | null; error: string | null }> => {
  const { data, error } = await supabase
    .from('cadastral_contributions')
    .insert(row)
    .select('tax_history')
    .single();
  if (error) {
    const msg = String(error.message || '');
    if (error.code === '23505' || msg.includes('existe déjà')) return { entry: null, error: msg };
    return { entry: null, error: 'Erreur lors de la soumission de la déclaration' };
  }
  const history = (data?.tax_history as any[]) || [];
  return { entry: history[0] ?? null, error: null };
};
