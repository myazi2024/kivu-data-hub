export const generateReferenceSuffix = (length = 6): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID().replace(/-/g, '').slice(0, length).toUpperCase();
    }
  } catch {
    // fallback below
  }

  const randomFallback = Math.random().toString(36).slice(2, 2 + length).toUpperCase();
  return randomFallback.padEnd(length, 'X');
};

export const generateMortgageReference = (prefix: 'HYP' | 'RAD', suffixLength = 6): string => {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${generateReferenceSuffix(suffixLength)}`;
};

// Fix #6: Comprehensive status normalization with all known variants
export const normalizeMortgageStatus = (status?: string | null): string => {
  const normalized = (status || '').toLowerCase().trim();

  // Active statuses
  if (['active', 'en cours', 'en_cours'].includes(normalized)) return 'active';
  // Default statuses
  if (['en défaut', 'en_defaut', 'defaulted', 'default'].includes(normalized)) return 'en_defaut';
  // Paid/settled statuses
  if (['paid', 'paid_off', 'soldée', 'soldee', 'settled'].includes(normalized)) return 'paid';
  // Renegotiated statuses
  if (['renégociée', 'renegociee', 'renegotiated'].includes(normalized)) return 'renegociee';
  // Request statuses (admin workflow)
  if (['pending', 'en attente'].includes(normalized)) return 'pending';
  if (['approved', 'approuvé', 'approuve'].includes(normalized)) return 'approved';
  if (['rejected', 'rejeté', 'rejete'].includes(normalized)) return 'rejected';
  if (['returned', 'renvoyé', 'renvoye'].includes(normalized)) return 'returned';

  return normalized;
};

/** Strip File objects from form data for serialization (used by draft system) */
export const stripFileObjects = (formData: Record<string, any>): Record<string, any> => {
  const cleanData = { ...formData };
  // Remove all known File/FileList fields
  for (const key of Object.keys(cleanData)) {
    const val = cleanData[key];
    if (val instanceof File) {
      delete cleanData[key];
    } else if (Array.isArray(val) && val.length > 0 && val[0] instanceof File) {
      delete cleanData[key];
    }
  }
  return cleanData;
};
