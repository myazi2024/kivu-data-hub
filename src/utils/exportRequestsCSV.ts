import { supabase } from '@/integrations/supabase/client';

interface ExportRow {
  service: string;
  reference: string;
  status: string;
  amount_usd: number | null;
  approved_at: string | null;
  user_id: string | null;
}

const csvEscape = (v: any): string => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

/** Export comptable mensuel des demandes approuvées (multi-source). */
export const exportApprovedRequestsCSV = async (year: number, month: number): Promise<string> => {
  const start = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const end = new Date(Date.UTC(year, month, 1)).toISOString();
  const rows: ExportRow[] = [];

  const sources: Array<{ table: string; service: string; statusCol: string; amountCol: string | null }> = [
    { table: 'land_title_requests', service: 'Titre foncier', statusCol: 'status', amountCol: 'total_amount_usd' },
    { table: 'mutation_requests', service: 'Mutation', statusCol: 'status', amountCol: 'total_amount_usd' },
    { table: 'subdivision_requests', service: 'Lotissement', statusCol: 'status', amountCol: 'total_amount_usd' },
    { table: 'real_estate_expertise_requests', service: 'Expertise', statusCol: 'status', amountCol: 'total_amount_usd' },
  ];

  for (const src of sources) {
    const cols = `id, reference_number, ${src.statusCol}, user_id, updated_at${src.amountCol ? `, ${src.amountCol}` : ''}`;
    // @ts-expect-error dynamic table
    const { data } = await supabase.from(src.table).select(cols)
      .eq(src.statusCol, 'approved')
      .gte('updated_at', start).lt('updated_at', end);
    (data as any[] | null)?.forEach(r => rows.push({
      service: src.service,
      reference: r.reference_number,
      status: r[src.statusCol],
      amount_usd: src.amountCol ? r[src.amountCol] : null,
      approved_at: r.updated_at,
      user_id: r.user_id,
    }));
  }

  const header = ['Service', 'Référence', 'Statut', 'Montant USD', 'Date approbation', 'User ID'];
  const lines = [header.join(',')];
  rows.forEach(r => lines.push([
    csvEscape(r.service), csvEscape(r.reference), csvEscape(r.status),
    csvEscape(r.amount_usd ?? ''), csvEscape(r.approved_at), csvEscape(r.user_id),
  ].join(',')));
  return lines.join('\n');
};

export const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
