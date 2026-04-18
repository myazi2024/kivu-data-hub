import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TimelineEvent {
  event_date: string | null;
  event_type: string;
  source_table: string;
  title: string;
  description: string | null;
  status: string | null;
  amount_usd: number | null;
  reference: string | null;
  metadata: Record<string, any> | null;
}

export const useParcelTimeline = (parcelNumber: string | null) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (!parcelNumber) { setEvents([]); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc('get_parcel_timeline', {
        _parcel_number: parcelNumber,
      });
      if (rpcErr) throw rpcErr;
      setEvents((data || []) as TimelineEvent[]);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement de la timeline');
    } finally {
      setLoading(false);
    }
  }, [parcelNumber]);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

  return { events, loading, error, refresh: fetchTimeline };
};
