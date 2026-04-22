/**
 * Compute SLA progress for an admin request.
 * Returns a level + label suitable for badge styling.
 */
export type SlaLevel = 'fresh' | 'warning' | 'overdue';

export interface SlaInfo {
  level: SlaLevel;
  ageDays: number;
  remainingDays: number;
  pct: number; // 0 — 100+
  label: string;
}

export const computeSla = (createdAt: string, slaDays: number): SlaInfo => {
  const created = new Date(createdAt).getTime();
  const ageMs = Date.now() - created;
  const ageDays = Math.max(0, ageMs / (1000 * 60 * 60 * 24));
  const remaining = slaDays - ageDays;
  const pct = slaDays > 0 ? (ageDays / slaDays) * 100 : 0;

  let level: SlaLevel = 'fresh';
  if (pct >= 100) level = 'overdue';
  else if (pct >= 80) level = 'warning';

  const label =
    level === 'overdue'
      ? `SLA dépassé de ${Math.ceil(-remaining)} j`
      : `J+${Math.floor(ageDays)} / ${slaDays} j`;

  return { level, ageDays, remainingDays: remaining, pct, label };
};

/** Convert an array of objects to CSV and trigger a download. */
export const downloadCsv = (filename: string, rows: Record<string, any>[]) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
