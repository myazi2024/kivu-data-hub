export interface TaxDeclaration {
  id: string;
  parcel_number: string;
  original_parcel_id: string | null;
  user_id: string | null;
  status: string;
  province: string | null;
  ville: string | null;
  area_sqm: number | null;
  created_at: string;
  updated_at: string;
  tax_history: any[];
  current_owner_name?: string | null;
  profiles?: { full_name: string | null; email: string | null } | null;
}

export const TAX_TYPES = [
  'Impôt foncier annuel',
  'Taxe de bâtisse',
  'Impôt sur les revenus locatifs',
];

/** Resolve camelCase / snake_case keys (CCC vs tax services) */
export const resolveTaxKey = (obj: any, ...keys: string[]) => {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return null;
};

export interface TaxInfo {
  taxType: string;
  taxYear: string | number;
  amount: number;
  nif: string | null;
  isExempt: boolean;
  paymentStatus?: string;
  baseTax: number;
  penalties: number;
  fees: number;
  fiscalZone?: string | null;
  exemptions: string[];
}

export const getTaxInfo = (decl: TaxDeclaration): TaxInfo => {
  const entry = decl.tax_history?.[0];
  if (!entry) {
    return { taxType: '—', taxYear: '—', amount: 0, nif: null, isExempt: false, baseTax: 0, penalties: 0, fees: 0, exemptions: [] };
  }
  return {
    taxType: resolveTaxKey(entry, 'tax_type', 'taxType') || '—',
    taxYear: resolveTaxKey(entry, 'tax_year', 'taxYear') || '—',
    amount: Number(resolveTaxKey(entry, 'amount_usd', 'amountUsd', 'grand_total')) || 0,
    nif: resolveTaxKey(entry, 'nif'),
    isExempt: resolveTaxKey(entry, 'is_exempt', 'isExempt') || false,
    paymentStatus: resolveTaxKey(entry, 'payment_status', 'paymentStatus') || 'En attente',
    baseTax: Number(resolveTaxKey(entry, 'base_tax_usd', 'baseTaxUsd')) || 0,
    penalties: Number(resolveTaxKey(entry, 'penalty_amount_usd', 'penaltyAmountUsd')) || 0,
    fees: Number(resolveTaxKey(entry, 'fees_usd', 'feesUsd')) || 0,
    fiscalZone: resolveTaxKey(entry, 'fiscal_zone', 'fiscalZone'),
    exemptions: resolveTaxKey(entry, 'exemptions') || [],
  };
};
