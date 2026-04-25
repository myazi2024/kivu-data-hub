/**
 * Hook pour les tarifs détaillés par type d'infrastructure (Lot D).
 * Cache 5 min, fallback hardcodé pour résilience offline/erreur.
 */
import { useEffect, useState, useCallback } from 'react';
import { untypedTables } from '@/integrations/supabase/untyped';

export type InfrastructureUnit = 'linear_m' | 'sqm' | 'unit' | 'lot';
export type InfrastructureCategory = 'voirie' | 'amenagement' | 'reseau' | 'equipement';

export interface InfrastructureTariff {
  id: string;
  infrastructure_key: string;
  label: string;
  category: InfrastructureCategory;
  unit: InfrastructureUnit;
  rate_usd: number;
  section_type: string | null;
  min_total_usd: number | null;
  max_total_usd: number | null;
  is_required: boolean;
  is_active: boolean;
  display_order: number;
  description: string | null;
  metadata: Record<string, unknown>;
}

const FALLBACK: InfrastructureTariff[] = [
  { id: 'fb-road-primary', infrastructure_key: 'road_primary', label: 'Voirie principale (asphaltée)', category: 'voirie', unit: 'linear_m', rate_usd: 8, section_type: null, min_total_usd: null, max_total_usd: null, is_required: false, is_active: true, display_order: 10, description: null, metadata: {} },
  { id: 'fb-road-sec', infrastructure_key: 'road_secondary', label: 'Voirie secondaire (gravier)', category: 'voirie', unit: 'linear_m', rate_usd: 3.5, section_type: null, min_total_usd: null, max_total_usd: null, is_required: false, is_active: true, display_order: 20, description: null, metadata: {} },
  { id: 'fb-drainage', infrastructure_key: 'drainage', label: 'Caniveaux / drainage', category: 'reseau', unit: 'linear_m', rate_usd: 2, section_type: null, min_total_usd: null, max_total_usd: null, is_required: true, is_active: true, display_order: 40, description: null, metadata: {} },
];

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: InfrastructureTariff[]; ts: number } | null = null;

export async function fetchInfrastructureTariffsAsync(forceRefresh = false): Promise<InfrastructureTariff[]> {
  if (!forceRefresh && cache && Date.now() - cache.ts < CACHE_TTL) return cache.data;
  try {
    const { data, error } = await untypedTables
      .generic('subdivision_infrastructure_tariffs')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    if (error) throw error;
    const list = (data as InfrastructureTariff[]) ?? [];
    cache = { data: list, ts: Date.now() };
    return list;
  } catch (e) {
    console.warn('[useSubdivisionInfrastructureTariffs] fallback used:', e);
    return FALLBACK;
  }
}

export function invalidateInfrastructureTariffsCache() { cache = null; }

export function useSubdivisionInfrastructureTariffs(opts?: { sectionType?: 'urban' | 'rural' }) {
  const [tariffs, setTariffs] = useState<InfrastructureTariff[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    const list = await fetchInfrastructureTariffsAsync(force);
    const filtered = opts?.sectionType
      ? list.filter(t => t.section_type === null || t.section_type === opts.sectionType)
      : list;
    setTariffs(filtered);
    setLoading(false);
  }, [opts?.sectionType]);

  useEffect(() => { refresh(); }, [refresh]);

  return { tariffs, loading, refresh };
}
