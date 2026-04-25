import { useEffect, useMemo, useState, useCallback } from 'react';
import { untypedTables } from '@/integrations/supabase/untyped';

export interface SubdivisionPlanElement {
  id: string;
  element_key: string;
  label: string;
  description: string | null;
  category: string; // 'cartouche' | 'symboles' | 'cotation' | 'legende' | 'general'
  is_required: boolean;
  is_active: boolean;
  display_order: number;
  validation_rule: string | null;
  metadata: Record<string, unknown>;
}

// Fallback hardcodé — garde le générateur PDF & le validateur fonctionnels
// si la table est vide ou inaccessible.
const FALLBACK: SubdivisionPlanElement[] = [
  { id: 'fb-cartouche_titre', element_key: 'cartouche_titre', label: 'Cartouche / Titre du plan', description: null, category: 'cartouche', is_required: true, is_active: true, display_order: 10, validation_rule: 'has_title_block', metadata: {} },
  { id: 'fb-reference_demande', element_key: 'reference_demande', label: 'Référence de la demande', description: null, category: 'cartouche', is_required: true, is_active: true, display_order: 20, validation_rule: 'has_reference', metadata: {} },
  { id: 'fb-north_arrow', element_key: 'north_arrow', label: 'Flèche du Nord', description: null, category: 'symboles', is_required: true, is_active: true, display_order: 30, validation_rule: 'has_north_arrow', metadata: {} },
  { id: 'fb-echelle_graphique', element_key: 'echelle_graphique', label: 'Échelle graphique', description: null, category: 'symboles', is_required: true, is_active: true, display_order: 40, validation_rule: 'has_scale', metadata: {} },
  { id: 'fb-echelle_numerique', element_key: 'echelle_numerique', label: 'Échelle numérique', description: null, category: 'cartouche', is_required: true, is_active: true, display_order: 50, validation_rule: 'has_numeric_scale', metadata: {} },
  { id: 'fb-legende', element_key: 'legende', label: 'Légende', description: null, category: 'legende', is_required: true, is_active: true, display_order: 60, validation_rule: 'has_legend', metadata: {} },
  { id: 'fb-cotation_lots', element_key: 'cotation_lots', label: 'Cotation des lots', description: null, category: 'cotation', is_required: true, is_active: true, display_order: 70, validation_rule: 'has_lot_dimensions', metadata: {} },
  { id: 'fb-voies_acces', element_key: 'voies_acces', label: "Voies d'accès et largeurs", description: null, category: 'general', is_required: true, is_active: true, display_order: 90, validation_rule: 'has_roads', metadata: {} },
  { id: 'fb-parcelle_mere', element_key: 'parcelle_mere', label: 'Limites de la parcelle mère', description: null, category: 'general', is_required: true, is_active: true, display_order: 110, validation_rule: 'has_parent_parcel', metadata: {} },
  { id: 'fb-numerotation_lots', element_key: 'numerotation_lots', label: 'Numérotation des lots', description: null, category: 'general', is_required: true, is_active: true, display_order: 120, validation_rule: 'has_lot_numbers', metadata: {} },
  { id: 'fb-superficie_lots', element_key: 'superficie_lots', label: 'Superficie de chaque lot', description: null, category: 'cotation', is_required: true, is_active: true, display_order: 130, validation_rule: 'has_lot_areas', metadata: {} },
];

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { data: SubdivisionPlanElement[]; ts: number } | null = null;
let inflight: Promise<SubdivisionPlanElement[]> | null = null;

const fetchAll = async (): Promise<SubdivisionPlanElement[]> => {
  const { data, error } = await untypedTables
    .subdivision_plan_elements()
    .select('*')
    .order('display_order');
  if (error || !data) return [];
  return data as SubdivisionPlanElement[];
};

export const invalidateSubdivisionPlanElementsCache = () => {
  cache = null;
  inflight = null;
};

/**
 * Hook : retourne la liste des éléments de plan obligatoires/optionnels,
 * configurée par les admins. Utilise un cache 5 min + fallback hardcodé.
 *
 * Usage :
 *   const { elements, requiredElements, loading, refresh } = useSubdivisionPlanElements();
 */
export function useSubdivisionPlanElements(opts?: { onlyActive?: boolean }) {
  const onlyActive = opts?.onlyActive ?? true;
  const [data, setData] = useState<SubdivisionPlanElement[]>(() => {
    if (cache && Date.now() - cache.ts < CACHE_TTL_MS) return cache.data;
    return FALLBACK;
  });
  const [loading, setLoading] = useState<boolean>(!cache);

  const load = useCallback(async () => {
    if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
      setData(cache.data);
      setLoading(false);
      return;
    }
    if (!inflight) inflight = fetchAll();
    try {
      const res = await inflight;
      if (res.length > 0) {
        cache = { data: res, ts: Date.now() };
        setData(res);
      } else {
        // Garder le fallback si la table est vide
        setData(FALLBACK);
      }
    } finally {
      inflight = null;
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => onlyActive ? data.filter(e => e.is_active) : data,
    [data, onlyActive]
  );
  const requiredElements = useMemo(
    () => filtered.filter(e => e.is_required),
    [filtered]
  );

  return {
    elements: filtered,
    requiredElements,
    loading,
    refresh: () => { invalidateSubdivisionPlanElementsCache(); return load(); },
  };
}

/**
 * Helper non-React pour le générateur PDF : renvoie la liste avec cache.
 * Fallback automatique si la BD est inaccessible.
 */
export async function getSubdivisionPlanElementsAsync(): Promise<SubdivisionPlanElement[]> {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) return cache.data;
  try {
    const data = await fetchAll();
    if (data.length > 0) {
      cache = { data, ts: Date.now() };
      return data;
    }
  } catch { /* ignore */ }
  return FALLBACK;
}
