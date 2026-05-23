import { useEffect, useState, useCallback } from 'react';
import { untypedTables } from '@/integrations/supabase/untyped';

export interface DrainageCatalogEntry {
  id: string;
  key: string;
  label: string;
  description: string | null;
  price_multiplier: number;
  is_active: boolean;
  display_order: number;
}

type TableName =
  | 'subdivision_drainage_materials'
  | 'subdivision_drainage_types';

function useCatalog(table: TableName, activeOnly = false) {
  const [items, setItems] = useState<DrainageCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let q = untypedTables.generic(table).select('*').order('display_order');
    if (activeOnly) q = q.eq('is_active', true);
    const { data } = await q;
    const list = ((data as DrainageCatalogEntry[]) ?? []);
    // Dédoublonnage défensif par clé (sécurité React).
    const dedup = Array.from(new Map(list.map(m => [m.key, m])).values());
    setItems(dedup);
    setLoading(false);
  }, [table, activeOnly]);

  useEffect(() => { fetch(); }, [fetch]);
  return { items, loading, refetch: fetch };
}

export const useDrainageMaterialsCatalog = (activeOnly = false) =>
  useCatalog('subdivision_drainage_materials', activeOnly);

export const useDrainageTypesCatalog = (activeOnly = false) =>
  useCatalog('subdivision_drainage_types', activeOnly);
