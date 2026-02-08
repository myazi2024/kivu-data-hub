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

// IRL (Kinshasa/provincial): deadline February 28
// En 2026, l'échéance a été repoussée au 28 février par le gouvernement provincial
export const calculateIRLMonthsLate = (fiscalYear: number): number => {
  const now = new Date();
  const deadline = new Date(fiscalYear, 1, 28); // February 28
  if (now <= deadline) return 0;
  const diffMs = now.getTime() - deadline.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44)));
};

// Backward-compatible alias
export const calculateMonthsLate = calculatePropertyTaxMonthsLate;

export const getLatePenaltyInfo = (fiscalYear: number, taxType: 'property' | 'irl' = 'property') => {
  const monthsLate = taxType === 'irl'
    ? calculateIRLMonthsLate(fiscalYear)
    : calculatePropertyTaxMonthsLate(fiscalYear);
  const deadlineStr = taxType === 'irl'
    ? `28 février ${fiscalYear}`
    : `31 mars ${fiscalYear}`;
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

export interface TaxCalculationInput {
  zoneType: 'urban' | 'rural';
  usageType: 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'mixed';
  constructionType: 'en_dur' | 'semi_dur' | 'en_paille' | null;
  areaSqm: number;
  fiscalYear: number;
  // Province/ville for zone-specific rates
  province: string;
  ville: string;
  // Construction details
  constructionYear: number | null;
  numberOfFloors: number;
  roofingType: string;
  // Exemptions
  selectedExemptions: ExemptionCheckType[];
  // Contribuable / Redevable
  redevableIsDifferent: boolean;
  redevableNom: string;
  redevableNif: string;
  redevableQualite: string; // gérant, mandataire, locataire
  // IRL fields
  isRented: boolean;
  monthlyRentUsd: number;
  occupancyMonths: number;
  // IRL deduction
  applyDeduction30: boolean;
  // Late payment
  monthsLate: number; // auto-calculated, kept for backward compat
}

export interface TaxCalculationResult {
  // Fiscal zone
  fiscalZoneCategory: FiscalZoneCategory;
  fiscalZoneMultiplier: number;
  // Impôt foncier
  baseTax: number;
  areaComponent: number;
  zoneAdjustedTax: number;
  totalPropertyTax: number;
  // Exemptions
  isExempt: boolean;
  exemptionReasons: string[];
  // IRL
  annualRentalIncome: number;
  deduction30Amount: number;
  taxableRentalIncome: number;
  irlRate: number;
  irlAmount: number;
  // Penalties
  penaltyRate: number;
  penaltyAmount: number;
  majorationAmount: number;
  totalPenalties: number;
  // Combined
  totalTax: number;
  fees: { name: string; amount: number; description: string | null }[];
  totalFees: number;
  grandTotal: number;
  matchedRate: TaxRate | null;
  matchedIrlRate: TaxRate | null;
  appliedExemptions: string[];
}

export const usePropertyTaxCalculator = () => {
  const [rates, setRates] = useState<TaxRate[]>([]);
  const [fees, setFees] = useState<PaymentFee[]>([]);
  const [exemptions, setExemptions] = useState<TaxExemption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      const [ratesRes, feesRes, exemptionsRes] = await Promise.all([
        supabase.from('property_tax_rates_config').select('*').eq('is_active', true).order('display_order'),
        supabase.from('tax_payment_fees_config').select('*').eq('is_active', true).order('display_order'),
        supabase.from('tax_exemptions_config').select('*').eq('is_active', true).order('display_order'),
      ]);

      if (ratesRes.data) setRates(ratesRes.data as any[]);
      if (feesRes.data) setFees(feesRes.data as any[]);
      if (exemptionsRes.data) setExemptions(exemptionsRes.data as any[]);
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

    if (input.isRented && input.monthlyRentUsd > 0) {
      annualRentalIncome = input.monthlyRentUsd * (input.occupancyMonths || 12);

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
    // Use the correct deadline per tax type:
    // - Property tax only → property deadline (March 31)
    // - IRL only → IRL deadline (February 28)
    // - Both → apply each penalty to its own tax base
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
      // If both tax types are late, use the higher penalty rate for display
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
