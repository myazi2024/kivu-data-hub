import { createContext, ReactNode, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const accessKey = (tabKey: string, itemKey: string) => `${tabKey}::${itemKey}`;

export interface AnalyticsAccessState {
  /** true = profil non habilité : seuls les visuels achetés et valides sont visibles. */
  restricted: boolean;
  allowed: Set<string>;
}

const AnalyticsAccessContext = createContext<AnalyticsAccessState>({ restricted: false, allowed: new Set() });

export const AnalyticsAccessProvider = ({ value, children }: { value: AnalyticsAccessState; children: ReactNode }) => (
  <AnalyticsAccessContext.Provider value={value}>{children}</AnalyticsAccessContext.Provider>
);

export const useAnalyticsAccessContext = () => useContext(AnalyticsAccessContext);

export interface PurchasedVisual { tab_key: string; item_key: string; expires_at: string }

/** Accès achetés et encore valides (serveur : get_my_analytics_access). */
export function useMyAnalyticsAccess(enabled = true) {
  const query = useQuery({
    queryKey: ['my-analytics-access'],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<PurchasedVisual[]> => {
      const { data, error } = await (supabase as any).rpc('get_my_analytics_access');
      if (error) throw error;
      return (data ?? []) as PurchasedVisual[];
    },
  });
  const allowed = useMemo(
    () => new Set((query.data ?? []).map(a => accessKey(a.tab_key, a.item_key))),
    [query.data],
  );
  return { ...query, allowed };
}
