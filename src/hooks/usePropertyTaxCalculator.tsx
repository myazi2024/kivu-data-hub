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

export interface TaxCalculationInput {
  zoneType: 'urban' | 'rural';
  usageType: 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'mixed';
  constructionType: 'en_dur' | 'semi_dur' | 'en_paille' | null;
  areaSqm: number;
  fiscalYear: number;
  // IRL fields
  isRented: boolean;
  monthlyRentUsd: number;
  occupancyMonths: number; // months occupied per year (1-12)
}

export interface TaxCalculationResult {
  // Impôt foncier
  baseTax: number;
  areaComponent: number;
  totalPropertyTax: number;
  // IRL
  annualRentalIncome: number;
  irlRate: number;
  irlAmount: number;
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
    const totalPropertyTax = baseTax + areaComponent;

    // --- Impôt sur le Revenu Locatif (IRL) ---
    let annualRentalIncome = 0;
    let irlRate = 0;
    let irlAmount = 0;
    let matchedIrlRate: TaxRate | null = null;

    if (input.isRented && input.monthlyRentUsd > 0) {
      annualRentalIncome = input.monthlyRentUsd * (input.occupancyMonths || 12);

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
        irlAmount = (irlRate / 100) * annualRentalIncome;
      }
    }

    // --- Exemptions check ---
    const appliedExemptions: string[] = [];
    // Check small surface exemption
    const smallSurface = exemptions.find(e => e.exemption_type === 'petites_surfaces');
    if (smallSurface && smallSurface.max_area_sqm && input.areaSqm <= smallSurface.max_area_sqm) {
      appliedExemptions.push(smallSurface.label);
    }

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
      baseTax: round(baseTax),
      areaComponent: round(areaComponent),
      totalPropertyTax: round(totalPropertyTax),
      annualRentalIncome: round(annualRentalIncome),
      irlRate,
      irlAmount: round(irlAmount),
      totalTax: round(totalTax),
      fees: calculatedFees,
      totalFees: round(totalFees),
      grandTotal: round(totalTax + totalFees),
      matchedRate,
      matchedIrlRate,
      appliedExemptions,
    };
  }, [rates, fees, exemptions]);

  return { calculate, loading, rates, fees, exemptions };
};

export default usePropertyTaxCalculator;
