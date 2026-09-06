import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ExpertiseFeeQuoteItem {
  fee_name: string;
  amount_usd: number;
  base_amount_usd?: number;
  description?: string | null;
  is_mandatory?: boolean;
}

export interface ExpertiseFeeQuote {
  fee_items: ExpertiseFeeQuoteItem[];
  total_amount_usd: number;
}

/**
 * Devis serveur des frais d'expertise : le montant total est TOUJOURS calculé
 * par la RPC `calculate_expertise_fees` (jamais côté client).
 */
export function useExpertiseFeeQuote(
  scope: 'partial' | 'total',
  valuations: string[],
  enabled = true,
) {
  const sorted = [...valuations].sort();
  return useQuery({
    queryKey: ['expertise-fee-quote', scope, sorted.join(',')],
    enabled: enabled && sorted.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<ExpertiseFeeQuote | null> => {
      const { data, error } = await (supabase as any).rpc('calculate_expertise_fees', {
        p_scope: scope,
        p_valuations: sorted,
      });
      if (error) {
        console.error('calculate_expertise_fees error:', error);
        return null;
      }
      const raw = data as any;
      if (!raw) return null;
      return {
        fee_items: Array.isArray(raw.fee_items) ? raw.fee_items : [],
        total_amount_usd: Number(raw.total_amount_usd) || 0,
      };
    },
  });
}
