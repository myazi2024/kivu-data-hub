import { useState, useEffect, useCallback, useMemo } from 'react';
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

export interface TaxCalculationInput {
  zoneType: 'urban' | 'rural';
  usageType: 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'mixed';
  constructionType: 'en_dur' | 'semi_dur' | 'en_paille' | null;
  areaSqm: number;
  fiscalYear: number;
}

export interface TaxCalculationResult {
  baseTax: number;
  areaComponent: number;
  totalTax: number;
  fees: { name: string; amount: number; description: string | null }[];
  totalFees: number;
  grandTotal: number;
  matchedRate: TaxRate | null;
}

export const usePropertyTaxCalculator = () => {
  const [rates, setRates] = useState<TaxRate[]>([]);
  const [fees, setFees] = useState<PaymentFee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      const [ratesRes, feesRes] = await Promise.all([
        supabase.from('property_tax_rates_config').select('*').eq('is_active', true).order('display_order'),
        supabase.from('tax_payment_fees_config').select('*').eq('is_active', true).order('display_order'),
      ]);

      if (ratesRes.data) setRates(ratesRes.data as any[]);
      if (feesRes.data) setFees(feesRes.data as any[]);
      setLoading(false);
    };
    fetchConfig();
  }, []);

  const calculate = useCallback((input: TaxCalculationInput): TaxCalculationResult => {
    // Find matching rate
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

    if (!matchedRate) {
      return { baseTax: 0, areaComponent: 0, totalTax: 0, fees: [], totalFees: 0, grandTotal: 0, matchedRate: null };
    }

    const baseTax = matchedRate.base_amount_usd;
    const areaComponent = (matchedRate.area_multiplier || 0) * input.areaSqm;
    const totalTax = baseTax + areaComponent;

    // Calculate fees
    const calculatedFees = fees.map(f => {
      const amount = f.fee_type === 'percentage'
        ? (f.percentage / 100) * totalTax
        : f.amount_usd;
      return { name: f.fee_name, amount: Math.round(amount * 100) / 100, description: f.description };
    });

    const totalFees = calculatedFees.reduce((sum, f) => sum + f.amount, 0);

    return {
      baseTax: Math.round(baseTax * 100) / 100,
      areaComponent: Math.round(areaComponent * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      fees: calculatedFees,
      totalFees: Math.round(totalFees * 100) / 100,
      grandTotal: Math.round((totalTax + totalFees) * 100) / 100,
      matchedRate
    };
  }, [rates, fees]);

  return { calculate, loading, rates, fees };
};

export default usePropertyTaxCalculator;
