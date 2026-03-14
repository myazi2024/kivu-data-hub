import React from 'react';

export const CHART_HEIGHT = 160;

export const NoData: React.FC<{ message?: string }> = ({ message = 'Aucune donnée' }) => (
  <div className="flex items-center justify-center h-[100px] text-muted-foreground text-xs">{message}</div>
);

/** Compute average days between two date fields */
export function avgDaysBetween(records: any[], startField: string, endField: string): number {
  const valid = records.filter(r => r[startField] && r[endField]);
  if (valid.length === 0) return 0;
  const total = valid.reduce((s, r) => {
    const diff = new Date(r[endField]).getTime() - new Date(r[startField]).getTime();
    return s + diff / (1000 * 60 * 60 * 24);
  }, 0);
  return Math.round(total / valid.length);
}

/** Compute percentage */
export function pct(part: number, total: number): string {
  if (total === 0) return '0%';
  return `${((part / total) * 100).toFixed(1)}%`;
}
