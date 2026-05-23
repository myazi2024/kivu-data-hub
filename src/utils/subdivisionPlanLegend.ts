/**
 * Légende auto : dérive depuis les éléments présents sur le plan et les
 * symboles configurés en admin (`subdivision_legend_symbols`).
 */
import { supabase } from '@/integrations/supabase/client';

export interface LegendItem {
  code: string;
  label: string;
  color: string;
  svg_icon: string;
  source_element_type: string | null;
}

export async function fetchLegendSymbols(): Promise<LegendItem[]> {
  try {
    const { data } = await (supabase as any)
      .from('subdivision_legend_symbols')
      .select('code, label, color, svg_icon, source_element_type, display_order, active')
      .eq('active', true)
      .order('display_order', { ascending: true });
    return (data || []) as LegendItem[];
  } catch {
    return [];
  }
}

/**
 * Filtre la légende sur les types d'éléments réellement présents
 * (matching sur `source_element_type` vs `presentTypes`).
 * Si `presentTypes` est vide, renvoie tous les symboles actifs.
 */
export function deriveLegend(symbols: LegendItem[], presentTypes: string[]): LegendItem[] {
  if (!presentTypes.length) return symbols;
  const set = new Set(presentTypes.map(t => t.toLowerCase()));
  return symbols.filter(s => !s.source_element_type || set.has(s.source_element_type.toLowerCase()));
}
