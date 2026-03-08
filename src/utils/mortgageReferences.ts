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

export const normalizeMortgageStatus = (status?: string | null): string => {
  const normalized = (status || '').toLowerCase().trim();

  if (['en défaut', 'en_defaut', 'defaulted'].includes(normalized)) return 'en_defaut';
  if (['paid', 'paid_off', 'soldée', 'soldee'].includes(normalized)) return 'paid';
  if (['renégociée', 'renegociee'].includes(normalized)) return 'renegociee';
  if (['active', 'en cours'].includes(normalized)) return 'active';

  return normalized;
};
