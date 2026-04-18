import { supabase } from '@/integrations/supabase/client';
import { exportToCSV, type CSVExportOptions } from './csvExport';

/**
 * Exports CSV and logs the PII export server-side via RPC `log_pii_export`.
 * Falls back gracefully if logging fails (export still proceeds).
 */
export async function exportToCSVWithAudit(
  options: CSVExportOptions & { tableName: string; filters?: Record<string, unknown> }
) {
  const { tableName, filters, ...csvOpts } = options;
  exportToCSV(csvOpts);
  try {
    await supabase.rpc('log_pii_export', {
      _table_name: tableName,
      _row_count: csvOpts.data.length,
      _filters: (filters || {}) as any,
    });
  } catch (e) {
    console.warn('PII export audit log failed (non-blocking):', e);
  }
}
