import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DisputeMortgageOverlap {
  parcel_number: string;
  parcel_id: string;
  active_mortgages_count: number;
  total_mortgage_amount_usd: number | null;
  active_disputes_count: number;
  dispute_references: string[] | null;
  mortgage_references: string[] | null;
  risk_level: 'low' | 'medium' | 'high';
}

export const useDisputeMortgageOverlaps = () => {
  const [rows, setRows] = useState<DisputeMortgageOverlap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc('list_dispute_mortgage_overlaps');
      if (rpcErr) throw rpcErr;
      setRows((data || []) as DisputeMortgageOverlap[]);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement des alertes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { rows, loading, error, refresh };
};
