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

export const detectUsageType = (parcelData?: any): 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'mixed' => {
  switch (parcelData?.declared_usage) {
    case 'Commercial': return 'commercial';
    case 'Industriel': return 'industrial';
    case 'Agricole': return 'agricultural';
    default: return 'residential';
  }
};

export const detectConstructionType = (parcelData?: any): 'en_dur' | 'semi_dur' | 'en_paille' | null => {
  switch (parcelData?.construction_type) {
    case 'En dur': return 'en_dur';
    case 'Semi-dur': return 'semi_dur';
    case 'En paille': return 'en_paille';
    case 'Terrain nu': return null;
    default: return null;
  }
};

/** Check for duplicate tax submissions in cadastral_contributions */
export const checkDuplicateTaxSubmission = async (
  supabase: any,
  parcelNumber: string,
  userId: string,
  taxType: string,
  taxYear: number
): Promise<boolean> => {
  const { data } = await supabase
    .from('cadastral_contributions')
    .select('id, tax_history')
    .eq('parcel_number', parcelNumber)
    .eq('user_id', userId)
    .neq('status', 'rejected');

  if (!data || data.length === 0) return false;

  return data.some((c: any) => {
    const history = c.tax_history as any[];
    return history?.some((h: any) =>
      h.tax_type === taxType &&
      Number(h.tax_year) === taxYear
    );
  });
};
