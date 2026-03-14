import React from 'react';

export const CHART_HEIGHT = 160;

export const NoData: React.FC<{ message?: string }> = ({ message = 'Aucune donnée' }) => (
  <div className="flex items-center justify-center h-[100px] text-muted-foreground text-xs">{message}</div>
);

/** Paginated fetch: loops .range() calls to bypass the 1000-row Supabase default limit */
export async function fetchAllRows<T = any>(
  queryBuilder: any,
): Promise<T[]> {
  const PAGE = 1000;
  let from = 0;
  const allRows: T[] = [];

  while (true) {
    const { data, error } = await queryBuilder.range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return allRows;
}
