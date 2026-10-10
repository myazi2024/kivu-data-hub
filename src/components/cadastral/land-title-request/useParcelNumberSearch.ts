import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { applyTestFilter } from '@/hooks/useTestEnvironment';
import { escapeIlike } from '@/utils/escapeIlike';
import type { ParcelSearchResult } from './types';

/** Recherche (avec délai) d'un numéro de parcelle existant. */
export const useParcelNumberSearch = (query: string, enabled: boolean, isTestRoute: boolean) => {
  const [results, setResults] = useState<ParcelSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      let req = supabase.from('cadastral_parcels').select('parcel_number, id')
        .ilike('parcel_number', `%${escapeIlike(q)}%`).is('deleted_at', null).limit(10);
      req = applyTestFilter(req, 'parcel_number', isTestRoute);
      const { data, error } = await req;
      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      console.error('Error searching parcels:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [isTestRoute]);

  useEffect(() => {
    const timer = setTimeout(() => { if (query && enabled) search(query); }, 300);
    return () => clearTimeout(timer);
  }, [query, enabled, search]);

  return { results, setResults, loading };
};
