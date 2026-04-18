import { supabase } from '@/integrations/supabase/client';
import { exportToCSV } from './csvExport';
import { format } from 'date-fns';

/**
 * Consolidated parcel dossier export — aggregates timeline events from all
 * history sources (ownership, boundary, tax, mortgage, dispute) into a single CSV.
 */
export const exportParcelDossier = async (parcelNumber: string): Promise<void> => {
  const { data, error } = await supabase.rpc('get_parcel_timeline', {
    _parcel_number: parcelNumber,
  });
  if (error) throw error;

  const events = (data || []) as any[];
  const headers = ['Date', 'Source', 'Type', 'Titre', 'Description', 'Statut', 'Montant USD', 'Référence'];
  const rows = events.map(ev => [
    ev.event_date ? format(new Date(ev.event_date), 'yyyy-MM-dd') : '',
    ev.source_table || '',
    ev.event_type || '',
    ev.title || '',
    ev.description || '',
    ev.status || '',
    ev.amount_usd ?? '',
    ev.reference || '',
  ]);

  exportToCSV({
    filename: `dossier-parcelle-${parcelNumber.replace(/[^a-z0-9]/gi, '_')}-${format(new Date(), 'yyyyMMdd')}.csv`,
    headers,
    data: rows,
  });
};
