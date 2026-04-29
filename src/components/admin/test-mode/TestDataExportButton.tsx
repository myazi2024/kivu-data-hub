import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { untypedTables } from '@/integrations/supabase/untyped';
import { loadTestEntities } from '@/constants/testEntities';
import { toast } from 'sonner';

const PAGE_SIZE = 1000;
const HARD_CAP = 50_000; // safety net per entity

/**
 * Pre-purge CSV export — paginated.
 *
 * Iterates over TEST_ENTITIES and dumps each table's TEST- rows to a single
 * CSV file (one section per entity). Pagination uses Supabase `.range()` so we
 * never silently truncate at 1 000 rows; a hard cap of 50 000/entity protects
 * against runaway pulls. If the cap is hit, the section header carries a
 * warning and we surface a global toast.
 */
const TestDataExportButton: React.FC<{ disabled?: boolean }> = ({ disabled }) => {
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      const sections: string[] = [];
      let totalRows = 0;
      const truncatedEntities: string[] = [];
      const entities = await loadTestEntities();

      for (const entity of entities) {
        const allRows: Record<string, unknown>[] = [];
        let from = 0;
        let truncated = false;
        let lastError: string | null = null;

        while (from < HARD_CAP) {
          const to = Math.min(from + PAGE_SIZE - 1, HARD_CAP - 1);
          const { data, error } = await untypedTables
            .generic(entity.tableName)
            .select('*')
            .ilike(entity.markerColumn, entity.markerPattern)
            .range(from, to);

          if (error) {
            lastError = error.message;
            break;
          }
          const batch = (data ?? []) as Record<string, unknown>[];
          allRows.push(...batch);

          if (batch.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
          if (from >= HARD_CAP && batch.length === PAGE_SIZE) {
            truncated = true;
            truncatedEntities.push(entity.label);
          }
        }

        if (lastError) {
          sections.push(`# ${entity.label} (${entity.tableName}) — ERROR: ${lastError}\n`);
          continue;
        }
        totalRows += allRows.length;

        if (allRows.length === 0) {
          sections.push(`# ${entity.label} (${entity.tableName}) — 0 lignes\n`);
          continue;
        }

        const headers = Object.keys(allRows[0]);
        const headerLine = `# ${entity.label} (${entity.tableName}) — ${allRows.length} lignes${truncated ? ` (TRONQUÉ à ${HARD_CAP})` : ''}`;
        const csv = [
          headerLine,
          headers.join(','),
          ...allRows.map((r) => headers.map((h) => csvCell(r[h])).join(',')),
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

      if (truncatedEntities.length > 0) {
        toast.warning('Export tronqué', {
          description: `Plafond ${HARD_CAP} lignes atteint pour : ${truncatedEntities.join(', ')}`,
          duration: 8000,
        });
      } else {
        toast.success('Export CSV généré', { description: `${totalRows} lignes au total` });
      }
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
