import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTestEnvironment, applyTestFilter } from '@/hooks/useTestEnvironment';

interface UseUserResourceListOptions {
  /** Supabase table name. */
  table: string;
  /** Column used to scope rows to the current user. Default: `user_id`. */
  userColumn?: string;
  /** Comma-separated select expression. Default: `*`. */
  select?: string;
  /** Column on which to apply the test-route filter (parcel_number, reference_number…). */
  testFilterColumn?: string;
  /** Optional ordering. Default: `created_at desc`. */
  orderBy?: { column: string; ascending?: boolean };
  /** Optional extra .eq filters applied to the query. */
  extraEq?: Record<string, string | boolean | number | null>;
  /** Cache key suffix for differentiating multiple uses on the same table. */
  cacheKey?: string;
  /** staleTime in ms. Default: 30s. */
  staleTime?: number;
}

/**
 * Generic, cached fetcher for "my X" lists in the user dashboard.
 * Replaces the duplicated useEffect/setLoading/applyTestFilter pattern in
 * 8 components. Uses react-query so users get instant cached views and a
 * single source of truth for invalidation.
 */
export function useUserResourceList<T = any>({
  table,
  userColumn = 'user_id',
  select = '*',
  testFilterColumn,
  orderBy = { column: 'created_at', ascending: false },
  extraEq,
  cacheKey,
  staleTime = 30 * 1000,
}: UseUserResourceListOptions) {
  const { user } = useAuth();
  const { isTestRoute } = useTestEnvironment();

  return useQuery<T[]>({
    queryKey: ['user-resource', table, cacheKey, user?.id, isTestRoute, extraEq],
    enabled: !!user?.id,
    staleTime,
    queryFn: async () => {
      if (!user?.id) return [];
      let q: any = supabase.from(table as any).select(select).eq(userColumn, user.id);
      if (extraEq) {
        for (const [k, v] of Object.entries(extraEq)) {
          q = q.eq(k, v);
        }
      }
      q = q.order(orderBy.column, { ascending: orderBy.ascending ?? false });
      if (testFilterColumn) q = applyTestFilter(q, testFilterColumn, isTestRoute);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}
