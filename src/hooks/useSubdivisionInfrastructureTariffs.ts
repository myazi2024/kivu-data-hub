/**
 * Hook pour les tarifs détaillés par type d'infrastructure (Lot D).
 * Cache 5 min, fallback hardcodé pour résilience offline/erreur.
 */
import { useEffect, useState, useCallback } from 'react';
import { untypedTables } from '@/integrations/supabase/untyped';

export type InfrastructureUnit = 'linear_m' | 'sqm' | 'unit' | 'lot';
export type InfrastructureCategory = 'voirie' | 'amenagement' | 'reseau' | 'equipement';

export type InfrastructureLinkedTo = 'road_surface' | 'drainage' | 'street_lighting' | null;

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
  linked_to: InfrastructureLinkedTo;
  metadata: Record<string, unknown>;
}

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
    console.warn('[useSubdivisionInfrastructureTariffs] fetch error:', e);
    return [];
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
