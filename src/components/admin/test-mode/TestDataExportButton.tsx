import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { loadTestEntities } from '@/constants/testEntities';
import { toast } from 'sonner';

/**
 * Pre-purge CSV export. Iterates over TEST_ENTITIES, dumps each table's
 * TEST- rows to a single CSV file (one section per entity) so admins keep
 * an audit trail before running "Nettoyer tout".
 */
const TestDataExportButton: React.FC<{ disabled?: boolean }> = ({ disabled }) => {
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      const sections: string[] = [];
      let totalRows = 0;
      const entities = await loadTestEntities();

      for (const entity of entities) {
        const { data, error } = await (supabase as any)
          .from(entity.tableName)
          .select('*')
          .ilike(entity.markerColumn, entity.markerPattern)
          .limit(5000);

        if (error) {
          sections.push(`# ${entity.label} (${entity.tableName}) — ERROR: ${error.message}\n`);
          continue;
        }
        const rows = (data ?? []) as Record<string, unknown>[];
        totalRows += rows.length;

        if (rows.length === 0) {
          sections.push(`# ${entity.label} (${entity.tableName}) — 0 lignes\n`);
          continue;
        }
        const headers = Object.keys(rows[0]);
        const csv = [
          `# ${entity.label} (${entity.tableName}) — ${rows.length} lignes`,
          headers.join(','),
          ...rows.map(r => headers.map(h => csvCell(r[h])).join(',')),
          '',
        ].join('\n');
        sections.push(csv);
      }

      const blob = new Blob([sections.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-data-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Export CSV généré', { description: `${totalRows} lignes au total` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error("Échec de l'export CSV", { description: message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={busy || disabled}>
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      Exporter CSV
    </Button>
  );
};

/** Quote/escape a value for CSV (RFC 4180-ish) */
function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s: string;
  if (typeof v === 'object') s = JSON.stringify(v);
  else s = String(v);
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default TestDataExportButton;
