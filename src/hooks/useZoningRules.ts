import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ZoningRule {
  id: string;
  section_type: 'urban' | 'rural';
  location_name: string;
  min_lot_area_sqm: number;
  max_lot_area_sqm: number | null;
  min_road_width_m: number;
  recommended_road_width_m: number;
  min_common_space_pct: number;
  min_front_road_m: number;
  max_lots_per_request: number | null;
  notes: string | null;
  is_active: boolean;
}

/**
 * Récupère la règle de zonage applicable selon section + lieu.
 * Préfère la règle spécifique (location exact match) sinon fallback '*'.
 */
export const useZoningRules = (sectionType?: 'urban' | 'rural', locationName?: string) => {
  const [rule, setRule] = useState<ZoningRule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const section = sectionType ?? 'urban';

    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('subdivision_zoning_rules')
        .select('*')
        .eq('is_active', true)
        .eq('section_type', section)
        .in('location_name', locationName ? [locationName, '*'] : ['*']);

      if (cancelled) return;
      if (error || !data) {
        setRule(null);
      } else {
        const arr = data as ZoningRule[];
        const specific = arr.find(r => r.location_name !== '*');
        setRule(specific ?? arr.find(r => r.location_name === '*') ?? null);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [sectionType, locationName]);

  return { rule, loading };
};

export interface ValidationViolation {
  code: string;
  severity?: 'error' | 'warning';
  target?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  rule_id?: string;
  section_type?: string;
  lot_count?: number;
  road_count?: number;
  total_lot_area_sqm?: number;
  violations: ValidationViolation[];
}

export const validateSubdivisionAgainstRules = async (requestId: string): Promise<ValidationResult> => {
  const { data, error } = await (supabase as any).rpc('validate_subdivision_against_rules', { _request_id: requestId });
  if (error) {
    return { valid: false, violations: [{ code: 'RPC_ERROR', message: error.message }] };
  }
  return data as ValidationResult;
};
