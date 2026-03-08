import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TaxRate {
  id: string;
  tax_category: string;
  zone_type: string;
  usage_type: string;
  construction_type: string | null;
  rate_percentage: number;
  base_amount_usd: number;
  area_multiplier: number;
  description: string | null;
}

export interface PaymentFee {
  id: string;
  fee_name: string;
  fee_type: 'fixed' | 'percentage';
  amount_usd: number;
  percentage: number;
  description: string | null;
  is_mandatory: boolean;
}

export interface TaxExemption {
  id: string;
  exemption_type: string;
  label: string;
  description: string | null;
  duration_years: number | null;
  max_area_sqm: number | null;
}

// --- Province/Ville data for DRC fiscal rates ---
export const DRC_PROVINCES = [
  'Kinshasa', 'Nord-Kivu', 'Sud-Kivu', 'Haut-Katanga', 'Lualaba',
  'Kongo-Central', 'Équateur', 'Tshopo', 'Kasaï', 'Kasaï-Central',
  'Kasaï-Oriental', 'Lomami', 'Tanganyika', 'Haut-Lomami', 'Maniema',
  'Ituri', 'Bas-Uele', 'Haut-Uele', 'Mongala', 'Nord-Ubangi',
  'Sud-Ubangi', 'Tshuapa', 'Sankuru', 'Kwango', 'Kwilu', 'Mai-Ndombe',
] as const;

export const DRC_MAJOR_CITIES: Record<string, string[]> = {
  'Kinshasa': ['Kinshasa'],
  'Nord-Kivu': ['Goma', 'Beni', 'Butembo'],
  'Sud-Kivu': ['Bukavu', 'Uvira'],
  'Haut-Katanga': ['Lubumbashi', 'Likasi', 'Kolwezi'],
  'Lualaba': ['Kolwezi'],
  'Kongo-Central': ['Matadi', 'Boma'],
  'Équateur': ['Mbandaka'],
  'Tshopo': ['Kisangani'],
  'Kasaï-Central': ['Kananga'],
  'Kasaï-Oriental': ['Mbuji-Mayi'],
};

// Kinshasa has a higher multiplier, provincial capitals medium, rural lowest
export type FiscalZoneCategory = 'kinshasa' | 'capital_provinciale' | 'ville_secondaire' | 'rural';

export const getFiscalZoneCategory = (province: string, ville: string | null, zoneType: 'urban' | 'rural'): FiscalZoneCategory => {
  if (zoneType === 'rural') return 'rural';
  if (province === 'Kinshasa') return 'kinshasa';
  const cities = DRC_MAJOR_CITIES[province];
  if (cities && ville && cities.includes(ville)) return 'capital_provinciale';
  return 'ville_secondaire';
};

// Multipliers per fiscal zone (Kinshasa highest, rural lowest)
export const FISCAL_ZONE_MULTIPLIERS: Record<FiscalZoneCategory, number> = {
  kinshasa: 1.5,
  capital_provinciale: 1.2,
  ville_secondaire: 1.0,
  rural: 0.7,
};

export const FISCAL_ZONE_LABELS: Record<FiscalZoneCategory, string> = {
  kinshasa: 'Kinshasa (taux majoré)',
  capital_provinciale: 'Capitale provinciale',
  ville_secondaire: 'Ville secondaire',
  rural: 'Zone rurale (taux réduit)',
};

// --- Auto late payment calculation based on DRC fiscal calendar ---

// Impôt foncier: deadline March 31
export const calculatePropertyTaxMonthsLate = (fiscalYear: number): number => {
  const now = new Date();
  const deadline = new Date(fiscalYear, 2, 31); // March 31
  if (now <= deadline) return 0;
  const diffMs = now.getTime() - deadline.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44)));
};

// Taxe de bâtisse (provincial): deadline June 30
export const calculateBuildingTaxMonthsLate = (fiscalYear: number): number => {
  const now = new Date();
  const deadline = new Date(fiscalYear, 5, 30); // June 30
  if (now <= deadline) return 0;
  const diffMs = now.getTime() - deadline.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44)));
};

// IRL (Kinshasa/provincial): deadline February 28
export const calculateIRLMonthsLate = (fiscalYear: number): number => {
  const now = new Date();
  const deadline = new Date(fiscalYear, 1, 28); // February 28
  if (now <= deadline) return 0;
  const diffMs = now.getTime() - deadline.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44)));
};

// Backward-compatible alias
export const calculateMonthsLate = calculatePropertyTaxMonthsLate;

/**
 * #24 fix: Support 'building' tax type in getLatePenaltyInfo with June 30 deadline.
 */
export const getLatePenaltyInfo = (fiscalYear: number, taxType: 'property' | 'irl' | 'building' = 'property') => {
  let monthsLate: number;
  let deadlineStr: string;

  switch (taxType) {
    case 'irl':
      monthsLate = calculateIRLMonthsLate(fiscalYear);
      deadlineStr = `28 février ${fiscalYear}`;
      break;
    case 'building':
      monthsLate = calculateBuildingTaxMonthsLate(fiscalYear);
      deadlineStr = `30 juin ${fiscalYear}`;
      break;
    default:
      monthsLate = calculatePropertyTaxMonthsLate(fiscalYear);
      deadlineStr = `31 mars ${fiscalYear}`;
      break;
  }

  const isLate = monthsLate > 0;
  const penaltyRate = Math.min(monthsLate * 2, 24);
  const hasSurcharge = monthsLate > 3;
  return { monthsLate, deadlineStr, isLate, penaltyRate, hasSurcharge };
};

// --- Exemption types ---
export type ExemptionCheckType =
  | 'edifice_public'
  | 'edifice_religieux'
  | 'construction_moins_5ans'
  | 'surface_moins_50m2'
  | 'zone_economique_speciale';

export const EXEMPTION_DEFINITIONS: { type: ExemptionCheckType; label: string; description: string }[] = [
  { type: 'edifice_public', label: 'Édifice public ou d\'utilité publique', description: 'Bâtiments de l\'État, provinces, ETD, missions diplomatiques' },
  { type: 'edifice_religieux', label: 'Édifice cultuel ou religieux', description: 'Lieux de culte, couvents, séminaires' },
  { type: 'construction_moins_5ans', label: 'Construction de moins de 5 ans', description: 'Exonération temporaire pour nouvelles constructions (art. 8, Ord.-loi n°69-006)' },
  { type: 'surface_moins_50m2', label: 'Surface bâtie < 50 m²', description: 'Exonération pour petites surfaces habitées' },
  { type: 'zone_economique_speciale', label: 'Zone Économique Spéciale (ZES)', description: 'Régime fiscal dérogatoire applicable aux ZES' },
];

// --- Roofing types ---
export const ROOFING_TYPES = [
  { value: 'tole', label: 'Tôle ondulée' },
  { value: 'tuile', label: 'Tuile' },
  { value: 'beton', label: 'Dalle en béton' },
  { value: 'chaume', label: 'Chaume / Paille' },
  { value: 'autre', label: 'Autre' },
];

/**
 * #1 fix: Fallback rates when property_tax_rates_config is empty/missing.
 * Based on DRC fiscal legislation (Ord.-loi n°69-006).
 */
const FALLBACK_PROPERTY_TAX_RATES: TaxRate[] = [
  // Urban residential
  { id: 'fb-ur-dur', tax_category: 'impot_foncier', zone_type: 'urban', usage_type: 'residential', construction_type: 'en_dur', rate_percentage: 0, base_amount_usd: 5, area_multiplier: 0.05, description: 'Fallback' },
  { id: 'fb-ur-semi', tax_category: 'impot_foncier', zone_type: 'urban', usage_type: 'residential', construction_type: 'semi_dur', rate_percentage: 0, base_amount_usd: 3, area_multiplier: 0.03, description: 'Fallback' },
  { id: 'fb-ur-paille', tax_category: 'impot_foncier', zone_type: 'urban', usage_type: 'residential', construction_type: 'en_paille', rate_percentage: 0, base_amount_usd: 1, area_multiplier: 0.01, description: 'Fallback' },
  { id: 'fb-ur-null', tax_category: 'impot_foncier', zone_type: 'urban', usage_type: 'residential', construction_type: null, rate_percentage: 0, base_amount_usd: 2, area_multiplier: 0.02, description: 'Fallback terrain nu' },
  // Urban commercial
  { id: 'fb-uc-dur', tax_category: 'impot_foncier', zone_type: 'urban', usage_type: 'commercial', construction_type: 'en_dur', rate_percentage: 0, base_amount_usd: 10, area_multiplier: 0.10, description: 'Fallback' },
  { id: 'fb-uc-null', tax_category: 'impot_foncier', zone_type: 'urban', usage_type: 'commercial', construction_type: null, rate_percentage: 0, base_amount_usd: 5, area_multiplier: 0.05, description: 'Fallback' },
  // Rural residential
  { id: 'fb-rr-dur', tax_category: 'impot_foncier', zone_type: 'rural', usage_type: 'residential', construction_type: 'en_dur', rate_percentage: 0, base_amount_usd: 2, area_multiplier: 0.02, description: 'Fallback' },
  { id: 'fb-rr-semi', tax_category: 'impot_foncier', zone_type: 'rural', usage_type: 'residential', construction_type: 'semi_dur', rate_percentage: 0, base_amount_usd: 1.5, area_multiplier: 0.015, description: 'Fallback' },
  { id: 'fb-rr-paille', tax_category: 'impot_foncier', zone_type: 'rural', usage_type: 'residential', construction_type: 'en_paille', rate_percentage: 0, base_amount_usd: 0.5, area_multiplier: 0.005, description: 'Fallback' },
  { id: 'fb-rr-null', tax_category: 'impot_foncier', zone_type: 'rural', usage_type: 'residential', construction_type: null, rate_percentage: 0, base_amount_usd: 1, area_multiplier: 0.01, description: 'Fallback' },
  // IRL rates (22% standard)
  { id: 'fb-irl-urban', tax_category: 'impot_revenu_locatif', zone_type: 'urban', usage_type: 'residential', construction_type: null, rate_percentage: 22, base_amount_usd: 0, area_multiplier: 0, description: 'IRL 22%' },
  { id: 'fb-irl-rural', tax_category: 'impot_revenu_locatif', zone_type: 'rural', usage_type: 'residential', construction_type: null, rate_percentage: 22, base_amount_usd: 0, area_multiplier: 0, description: 'IRL 22%' },
  { id: 'fb-irl-urban-com', tax_category: 'impot_revenu_locatif', zone_type: 'urban', usage_type: 'commercial', construction_type: null, rate_percentage: 22, base_amount_usd: 0, area_multiplier: 0, description: 'IRL 22%' },
];

export interface TaxCalculationInput {
  zoneType: 'urban' | 'rural';
  usageType: 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'mixed';
  constructionType: 'en_dur' | 'semi_dur' | 'en_paille' | null;
  areaSqm: number;
  fiscalYear: number;
  province: string;
  ville: string;
  constructionYear: number | null;
  numberOfFloors: number;
  roofingType: string;
  selectedExemptions: ExemptionCheckType[];
  redevableIsDifferent: boolean;
  redevableNom: string;
  redevableNif: string;
  redevableQualite: string;
  // IRL fields
  isRented: boolean;
  monthlyRentUsd: number;
  occupancyMonths: number;
  applyDeduction30: boolean;
  /**
   * #9 fix: Direct annual rental income override.
   * When set, this is used instead of monthlyRentUsd * occupancyMonths.
   * Eliminates the occupancyMonths=1 hack in IRLCalculator.
   */
  annualRentalIncomeOverride?: number;
  // Late payment
  monthsLate: number; // auto-calculated, kept for backward compat
}

export interface TaxCalculationResult {
  fiscalZoneCategory: FiscalZoneCategory;
  fiscalZoneMultiplier: number;
  baseTax: number;
  areaComponent: number;
  zoneAdjustedTax: number;
  totalPropertyTax: number;
  isExempt: boolean;
  exemptionReasons: string[];
  annualRentalIncome: number;
  deduction30Amount: number;
  taxableRentalIncome: number;
  irlRate: number;
  irlAmount: number;
  penaltyRate: number;
  penaltyAmount: number;
  majorationAmount: number;
  totalPenalties: number;
  totalTax: number;
  fees: { name: string; amount: number; description: string | null }[];
  totalFees: number;
  grandTotal: number;
  matchedRate: TaxRate | null;
  matchedIrlRate: TaxRate | null;
  appliedExemptions: string[];
}

// Module-level cache with TTL (5 minutes)
let _cachedRates: TaxRate[] | null = null;
let _cachedFees: PaymentFee[] | null = null;
let _cachedExemptions: TaxExemption[] | null = null;
let _fetchPromise: Promise<void> | null = null;
let _cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

const isCacheValid = () => {
  return _cachedRates && _cachedFees !== null && _cachedExemptions !== null && (Date.now() - _cacheTimestamp < CACHE_TTL_MS);
};

export const invalidateTaxConfigCache = () => {
  _cachedRates = null;
  _cachedFees = null;
  _cachedExemptions = null;
  _fetchPromise = null;
  _cacheTimestamp = 0;
};

export const usePropertyTaxCalculator = () => {
  const [rates, setRates] = useState<TaxRate[]>(_cachedRates || []);
  const [fees, setFees] = useState<PaymentFee[]>(_cachedFees || []);
  const [exemptions, setExemptions] = useState<TaxExemption[]>(_cachedExemptions || []);
  const [loading, setLoading] = useState(!isCacheValid());

  useEffect(() => {
    if (isCacheValid()) {
      setRates(_cachedRates!);
      setFees(_cachedFees!);
      setExemptions(_cachedExemptions!);
      setLoading(false);
      return;
    }

    // Invalidate stale cache
    _fetchPromise = null;

    const fetchConfig = async () => {
      if (!_fetchPromise) {
        _fetchPromise = (async () => {
          /**
           * #2 fix: Query property_tax_rates_config; if empty/error, use fallback rates.
           * #3 fix: Don't query non-existent tables (tax_payment_fees_config, tax_exemptions_config).
           * Instead, query cadastral_contribution_config for fee/exemption settings.
           */
          const ratesRes = await supabase
            .from('property_tax_rates_config')
            .select('*')
            .eq('is_active', true)
            .order('display_order');

          if (ratesRes.error || !ratesRes.data || ratesRes.data.length === 0) {
            console.warn('⚠️ property_tax_rates_config empty or missing, using fallback rates');
            _cachedRates = FALLBACK_PROPERTY_TAX_RATES;
          } else {
            _cachedRates = ratesRes.data as any[];
          }

          // #3 fix: Fees and exemptions from cadastral_contribution_config (existing table)
          // instead of non-existent tax_payment_fees_config / tax_exemptions_config
          _cachedFees = [];
          _cachedExemptions = [];

          const configRes = await supabase
            .from('cadastral_contribution_config')
            .select('config_key, config_value')
            .in('config_key', ['tax_payment_fees', 'tax_exemptions'])
            .eq('is_active', true);

          if (configRes.data) {
            for (const row of configRes.data) {
              if (row.config_key === 'tax_payment_fees' && Array.isArray(row.config_value)) {
                _cachedFees = row.config_value as any[];
              }
              if (row.config_key === 'tax_exemptions' && Array.isArray(row.config_value)) {
                _cachedExemptions = row.config_value as any[];
              }
            }
          }

          _cacheTimestamp = Date.now();
        })();
      }
      await _fetchPromise;
      setRates(_cachedRates!);
      setFees(_cachedFees!);
      setExemptions(_cachedExemptions!);
      setLoading(false);
    };
    fetchConfig();
  }, []);

  const calculate = useCallback((input: TaxCalculationInput): TaxCalculationResult => {
    const round = (n: number) => Math.round(n * 100) / 100;

    // --- Fiscal zone ---
    const fiscalZoneCategory = getFiscalZoneCategory(input.province, input.ville || null, input.zoneType);
    const fiscalZoneMultiplier = FISCAL_ZONE_MULTIPLIERS[fiscalZoneCategory];

    // --- Exemptions check ---
    const exemptionReasons: string[] = [];
    let isExempt = false;

    if (input.selectedExemptions.includes('edifice_public')) {
      exemptionReasons.push('Édifice public ou d\'utilité publique');
      isExempt = true;
    }
    if (input.selectedExemptions.includes('edifice_religieux')) {
      exemptionReasons.push('Édifice cultuel ou religieux');
      isExempt = true;
    }
    if (input.selectedExemptions.includes('construction_moins_5ans')) {
      const currentYear = new Date().getFullYear();
      if (input.constructionYear && (currentYear - input.constructionYear) < 5) {
        exemptionReasons.push(`Construction récente (${input.constructionYear}) — exonération temporaire`);
        isExempt = true;
      }
    }
    if (input.selectedExemptions.includes('surface_moins_50m2')) {
      if (input.areaSqm > 0 && input.areaSqm < 50) {
        exemptionReasons.push('Surface bâtie inférieure à 50 m²');
        isExempt = true;
      }
    }
    if (input.selectedExemptions.includes('zone_economique_speciale')) {
      exemptionReasons.push('Zone Économique Spéciale (ZES)');
      isExempt = true;
    }

    // Also check DB exemptions
    const smallSurface = exemptions.find(e => e.exemption_type === 'petites_surfaces');
    if (smallSurface && smallSurface.max_area_sqm && input.areaSqm <= smallSurface.max_area_sqm) {
      if (!exemptionReasons.some(r => r.includes('50 m²'))) {
        exemptionReasons.push(smallSurface.label);
      }
    }

    // --- Impôt foncier ---
    const matchedRate = rates.find(r =>
      r.tax_category === 'impot_foncier' &&
      r.zone_type === input.zoneType &&
      r.usage_type === input.usageType &&
      (r.construction_type === input.constructionType || (r.construction_type === null && input.constructionType === null))
    ) || rates.find(r =>
      r.tax_category === 'impot_foncier' &&
      r.zone_type === input.zoneType &&
      r.usage_type === input.usageType &&
      r.construction_type === null
    ) || rates.find(r =>
      r.tax_category === 'impot_foncier' &&
      r.zone_type === input.zoneType &&
      r.construction_type === null
    ) || null;

    const baseTax = matchedRate?.base_amount_usd || 0;
    const areaComponent = (matchedRate?.area_multiplier || 0) * input.areaSqm;
    const rawPropertyTax = baseTax + areaComponent;
    const zoneAdjustedTax = round(rawPropertyTax * fiscalZoneMultiplier);
    const totalPropertyTax = isExempt ? 0 : zoneAdjustedTax;

    // --- Impôt sur le Revenu Locatif (IRL) ---
    let annualRentalIncome = 0;
    let deduction30Amount = 0;
    let taxableRentalIncome = 0;
    let irlRate = 0;
    let irlAmount = 0;
    let matchedIrlRate: TaxRate | null = null;

    if (input.isRented && (input.monthlyRentUsd > 0 || (input.annualRentalIncomeOverride && input.annualRentalIncomeOverride > 0))) {
      // #9 fix: Use annualRentalIncomeOverride if provided, otherwise compute from monthly
      annualRentalIncome = input.annualRentalIncomeOverride && input.annualRentalIncomeOverride > 0
        ? input.annualRentalIncomeOverride
        : input.monthlyRentUsd * (input.occupancyMonths || 12);

      // 30% flat deduction for maintenance costs (art. 13, Ord.-loi n°69-009)
      if (input.applyDeduction30) {
        deduction30Amount = round(annualRentalIncome * 0.30);
        taxableRentalIncome = annualRentalIncome - deduction30Amount;
      } else {
        taxableRentalIncome = annualRentalIncome;
      }

      matchedIrlRate = rates.find(r =>
        r.tax_category === 'impot_revenu_locatif' &&
        r.zone_type === input.zoneType &&
        r.usage_type === input.usageType
      ) || rates.find(r =>
        r.tax_category === 'impot_revenu_locatif' &&
        r.zone_type === input.zoneType
      ) || null;

      if (matchedIrlRate) {
        irlRate = matchedIrlRate.rate_percentage;
        irlAmount = round((irlRate / 100) * taxableRentalIncome);
      }
    }

    // --- Penalties (late payment) - Auto-calculated ---
    const propertyMonthsLate = calculatePropertyTaxMonthsLate(input.fiscalYear);
    const irlMonthsLate = calculateIRLMonthsLate(input.fiscalYear);

    let penaltyRate = 0;
    let penaltyAmount = 0;
    let majorationAmount = 0;
    let totalPenalties = 0;

    // Property tax penalties
    if (propertyMonthsLate > 0 && totalPropertyTax > 0) {
      const propPenaltyRate = Math.min(propertyMonthsLate * 2, 24);
      const propPenalty = round((propPenaltyRate / 100) * totalPropertyTax);
      const propMajoration = propertyMonthsLate > 3 ? round(0.25 * totalPropertyTax) : 0;
      penaltyRate = propPenaltyRate;
      penaltyAmount += propPenalty;
      majorationAmount += propMajoration;
    }

    // IRL penalties (separate deadline)
    if (irlMonthsLate > 0 && irlAmount > 0) {
      const irlPenaltyRate = Math.min(irlMonthsLate * 2, 24);
      const irlPenalty = round((irlPenaltyRate / 100) * irlAmount);
      const irlMajoration = irlMonthsLate > 3 ? round(0.25 * irlAmount) : 0;
      penaltyRate = Math.max(penaltyRate, irlPenaltyRate);
      penaltyAmount += irlPenalty;
      majorationAmount += irlMajoration;
    }

    totalPenalties = penaltyAmount + majorationAmount;

    // --- Combined ---
    const totalTax = totalPropertyTax + irlAmount;

    // Calculate fees on total
    const calculatedFees = fees.map(f => {
      const amount = f.fee_type === 'percentage'
        ? (f.percentage / 100) * totalTax
        : f.amount_usd;
      return { name: f.fee_name, amount: round(amount), description: f.description };
    });

    const totalFees = calculatedFees.reduce((sum, f) => sum + f.amount, 0);

    return {
      fiscalZoneCategory,
      fiscalZoneMultiplier,
      baseTax: round(baseTax),
      areaComponent: round(areaComponent),
      zoneAdjustedTax,
      totalPropertyTax: round(totalPropertyTax),
      isExempt,
      exemptionReasons,
      annualRentalIncome: round(annualRentalIncome),
      deduction30Amount,
      taxableRentalIncome: round(taxableRentalIncome),
      irlRate,
      irlAmount: round(irlAmount),
      penaltyRate,
      penaltyAmount,
      majorationAmount,
      totalPenalties,
      totalTax: round(totalTax),
      fees: calculatedFees,
      totalFees: round(totalFees),
      grandTotal: round(totalTax + totalFees + totalPenalties),
      matchedRate,
      matchedIrlRate,
      appliedExemptions: exemptionReasons,
    };
  }, [rates, fees, exemptions]);

  return { calculate, loading, rates, fees, exemptions };
};

export default usePropertyTaxCalculator;
