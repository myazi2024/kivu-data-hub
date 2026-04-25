import { useEffect, useMemo, useState, useCallback } from 'react';
import { untypedTables } from '@/integrations/supabase/untyped';

export type SubdivisionReferenceCategory =
  | 'purpose'
  | 'requester_type'
  | 'lot_use'
  | 'road_surface'
  | 'common_space_type'
  | 'servitude_type'
  | 'fence_type'
  | 'construction_type';

export interface SubdivisionReferenceEntry {
  id: string;
  category: SubdivisionReferenceCategory;
  key: string;
  label: string;
  color: string | null;
  applies_to_section: 'urban' | 'rural' | null;
  extra_cost_per_unit_usd: number | null;
  min_pct: number | null;
  min_width_m: number | null;
  is_required: boolean;
  ordering: number;
  is_active: boolean;
  notes: string | null;
}

// Fallback hardcoded values — used when the table is empty or unreachable,
// so the form keeps working exactly as before the admin-driven referentials existed.
const FALLBACK: Record<SubdivisionReferenceCategory, Array<Pick<SubdivisionReferenceEntry, 'key' | 'label' | 'color'>>> = {
  purpose: [
    { key: 'sale', label: 'Vente', color: null },
    { key: 'inheritance', label: 'Succession / Héritage', color: null },
    { key: 'investment', label: 'Investissement immobilier', color: null },
    { key: 'construction', label: 'Construction de logements', color: null },
    { key: 'donation', label: 'Donation', color: null },
    { key: 'family', label: 'Partage familial', color: null },
    { key: 'commercial', label: 'Projet commercial', color: null },
    { key: 'other', label: 'Autre', color: null },
  ],
  requester_type: [
    { key: 'owner', label: 'Propriétaire', color: null },
    { key: 'mandatary', label: 'Mandataire', color: null },
    { key: 'notary', label: 'Notaire', color: null },
    { key: 'other', label: 'Autre', color: null },
  ],
  lot_use: [
    { key: 'residential', label: 'Résidentiel', color: '#22c55e' },
    { key: 'commercial', label: 'Commercial', color: '#3b82f6' },
    { key: 'industrial', label: 'Industriel', color: '#f59e0b' },
    { key: 'agricultural', label: 'Agricole', color: '#84cc16' },
    { key: 'mixed', label: 'Mixte', color: '#8b5cf6' },
  ],
  road_surface: [
    { key: 'asphalt', label: 'Asphalte', color: null },
    { key: 'gravel', label: 'Gravier', color: null },
    { key: 'earth', label: 'Terre', color: null },
    { key: 'paved', label: 'Pavé', color: null },
    { key: 'planned', label: 'Planifié', color: null },
  ],
  common_space_type: [
    { key: 'green_space', label: 'Espace vert', color: '#16a34a' },
    { key: 'parking', label: 'Parking', color: '#6b7280' },
    { key: 'playground', label: 'Aire de jeux', color: '#f97316' },
    { key: 'market', label: 'Marché', color: '#ef4444' },
    { key: 'drainage', label: 'Drainage', color: '#06b6d4' },
    { key: 'other', label: 'Autre', color: '#a855f7' },
  ],
  servitude_type: [
    { key: 'passage', label: 'Passage', color: null },
    { key: 'drainage', label: 'Drainage', color: null },
    { key: 'utility', label: 'Utilité (eau/électricité)', color: null },
    { key: 'view', label: 'Vue', color: null },
    { key: 'other', label: 'Autre', color: null },
  ],
  fence_type: [
    { key: 'wall', label: 'Mur', color: null },
    { key: 'wire', label: 'Grillage', color: null },
    { key: 'hedge', label: 'Haie', color: null },
    { key: 'mixed', label: 'Mixte', color: null },
  ],
  construction_type: [
    { key: 'house', label: 'Maison', color: null },
    { key: 'building', label: 'Immeuble', color: null },
    { key: 'warehouse', label: 'Entrepôt', color: null },
    { key: 'other', label: 'Autre', color: null },
  ],
};

const buildFallback = (cat: SubdivisionReferenceCategory): SubdivisionReferenceEntry[] =>
  FALLBACK[cat].map((e, idx) => ({
    id: `fallback-${cat}-${e.key}`,
    category: cat,
    key: e.key,
    label: e.label,
    color: e.color,
    applies_to_section: null,
    extra_cost_per_unit_usd: null,
    min_pct: null,
    min_width_m: null,
    is_required: false,
    ordering: idx,
    is_active: true,
    notes: null,
  }));

// Module-level cache (5 min TTL) — referentials change rarely.
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { data: SubdivisionReferenceEntry[]; ts: number } | null = null;
let inflight: Promise<SubdivisionReferenceEntry[]> | null = null;

const fetchAll = async (): Promise<SubdivisionReferenceEntry[]> => {
  const { data, error } = await untypedTables
    .subdivision_reference_lists()
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('ordering');
  if (error || !data) return [];
  return data as SubdivisionReferenceEntry[];
};

export const invalidateSubdivisionReferencesCache = () => {
  cache = null;
  inflight = null;
};

/**
 * Fetch a category's entries (with sensible fallback to hardcoded defaults).
 * Pass `section` to filter entries restricted to a specific section type.
 */
export const useSubdivisionReferences = (
  category: SubdivisionReferenceCategory,
  section?: 'urban' | 'rural'
) => {
  const [all, setAll] = useState<SubdivisionReferenceEntry[] | null>(cache?.data ?? null);
  const [loading, setLoading] = useState(!cache);

  const load = useCallback(async () => {
    if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
      setAll(cache.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    inflight = inflight ?? fetchAll();
    const data = await inflight;
    inflight = null;
    cache = { data, ts: Date.now() };
    setAll(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const entries = useMemo<SubdivisionReferenceEntry[]>(() => {
    const list = all && all.length > 0
      ? all.filter(e => e.category === category)
      : buildFallback(category);
    if (section) {
      return list.filter(e => !e.applies_to_section || e.applies_to_section === section);
    }
    return list;
  }, [all, category, section]);

  const labels = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const e of entries) out[e.key] = e.label;
    return out;
  }, [entries]);

  const colors = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const e of entries) if (e.color) out[e.key] = e.color;
    return out;
  }, [entries]);

  return { entries, labels, colors, loading, reload: load };
};
