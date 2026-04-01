import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePendingCount = (
  table: string,
  filter: Record<string, any>,
  enabled: boolean,
  refreshKey = 0
) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const fetchCount = async () => {
      try {
        let query = (supabase as any).from(table).select('*', { count: 'exact', head: true });
        if (filter.in) {
          for (const [col, vals] of Object.entries(filter.in)) {
            query = query.in(col, vals as string[]);
          }
        }
        if (filter.eq) {
          for (const [col, val] of Object.entries(filter.eq)) {
            query = query.eq(col, val);
          }
        }
        if (filter.not) {
          for (const [col, op, val] of filter.not as [string, string, any][]) {
            query = query.not(col, op, val);
          }
        }
        const { count: c, error } = await query;
        if (!error) setCount(c || 0);
      } catch {
        setCount(0);
      }
    };
    fetchCount();
  }, [enabled, table, refreshKey]);

  return count;
};
