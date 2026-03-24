/**
 * Auto-generates concise French insight text for analytics charts.
 */

/** Get the dominant item (top value) from chart data */
function topItem(data: { name: string; value: number }[]): { name: string; value: number; pct: number } | null {
  if (!data || data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  let max = data[0];
  data.forEach(d => { if (d.value > max.value) max = d; });
  return { name: max.name, value: max.value, pct: Math.round((max.value / total) * 100) };
}

/** Detect trend direction from area/line data */
function trendDirection(data: { name: string; value: number }[]): 'up' | 'down' | 'stable' | null {
  if (!data || data.length < 3) return null;
  const first = data.slice(0, Math.ceil(data.length / 3));
  const last = data.slice(-Math.ceil(data.length / 3));
  const avgFirst = first.reduce((s, d) => s + d.value, 0) / first.length;
  const avgLast = last.reduce((s, d) => s + d.value, 0) / last.length;
  if (avgFirst === 0 && avgLast === 0) return 'stable';
  const change = avgFirst > 0 ? ((avgLast - avgFirst) / avgFirst) * 100 : 100;
  if (change > 15) return 'up';
  if (change < -15) return 'down';
  return 'stable';
}

/** Build a descriptive prefix based on chart type and context */
function buildPrefix(type: 'bar-h' | 'bar-v' | 'pie' | 'donut' | 'area', context?: string): string {
  if (!context) return '';
  if (type === 'area') return `Évolution temporelle de ${context}. `;
  if (type === 'pie' || type === 'donut') return `Répartition de ${context}. `;
  return `Répartition de ${context}. `;
}

/** Build a total suffix */
function buildSuffix(total: number): string {
  return ` Total : ${total} enregistrement${total > 1 ? 's' : ''}.`;
}

export function generateInsight(
  data: { name: string; value: number }[],
  type: 'bar-h' | 'bar-v' | 'pie' | 'donut' | 'area',
  context?: string
): string {
  if (!data || data.length === 0) return '';

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return '';

  const top = topItem(data);
  if (!top) return '';

  const prefix = buildPrefix(type, context);
  const suffix = buildSuffix(total);

  if (type === 'area') {
    const dir = trendDirection(data);
    if (dir === 'up') return `${prefix}Tendance à la hausse sur la période observée.${suffix}`;
    if (dir === 'down') return `${prefix}Tendance à la baisse sur la période observée.${suffix}`;
    return `${prefix}Tendance globalement stable sur la période.${suffix}`;
  }

  if (type === 'pie' || type === 'donut') {
    if (data.length === 2) {
      return `${prefix}« ${top.name} » représente ${top.pct}% du total (${top.value}/${total}).${suffix}`;
    }
    return `${prefix}« ${top.name} » domine avec ${top.pct}% (${top.value}/${total}).${suffix}`;
  }

  // bar-h or bar-v
  if (data.length === 1) {
    return `${prefix}Seule catégorie : « ${top.name} » avec ${top.value} entrée${top.value > 1 ? 's' : ''}.${suffix}`;
  }
  return `${prefix}« ${top.name} » arrive en tête avec ${top.value} (${top.pct}% du total).${suffix}`;
}

/** Generate insight for stacked bar data */
export function generateStackedInsight(
  data: any[],
  bars: { dataKey: string; name: string }[],
  context?: string
): string {
  if (!data || data.length === 0) return '';
  
  // Find which bar key has the highest total
  const totals: Record<string, number> = {};
  bars.forEach(b => { totals[b.dataKey] = 0; });
  data.forEach(row => {
    bars.forEach(b => { totals[b.dataKey] += (row[b.dataKey] || 0); });
  });

  let maxKey = bars[0].dataKey;
  bars.forEach(b => { if (totals[b.dataKey] > totals[maxKey]) maxKey = b.dataKey; });
  const maxBar = bars.find(b => b.dataKey === maxKey);
  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);
  if (grandTotal === 0) return '';

  const pct = Math.round((totals[maxKey] / grandTotal) * 100);
  const prefix = context ? `Répartition de ${context}. ` : '';
  return `${prefix}« ${maxBar?.name || maxKey} » représente ${pct}% du total. Total : ${grandTotal} enregistrements.`;
}
