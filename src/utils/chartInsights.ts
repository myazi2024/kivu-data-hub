/**
 * Auto-generates structured French insight text for analytics charts.
 * Returns { definition, interpretation } for pedagogical display.
 */

export interface ChartInsight {
  definition: string;
  interpretation: string;
}

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

/** Pedagogical definition by chart type */
function buildDefinition(type: 'bar-h' | 'bar-v' | 'pie' | 'donut' | 'area', context?: string): string {
  const ctx = context || 'les données';
  switch (type) {
    case 'pie':
    case 'donut':
      return `Ce diagramme circulaire illustre la répartition proportionnelle de ${ctx}. Chaque segment représente la part relative d'une catégorie dans l'ensemble.`;
    case 'bar-h':
      return `Ce diagramme en barres horizontales compare ${ctx} par catégorie. La longueur de chaque barre indique le nombre d'occurrences ou la valeur mesurée.`;
    case 'bar-v':
      return `Ce diagramme en barres verticales compare ${ctx} par catégorie. La hauteur de chaque barre indique le nombre d'occurrences ou la valeur mesurée.`;
    case 'area':
      return `Ce graphique d'évolution retrace ${ctx} dans le temps. L'aire colorée permet de visualiser la tendance générale et les variations périodiques.`;
  }
}

/** Dynamic interpretation based on data */
function buildInterpretation(
  data: { name: string; value: number }[],
  type: 'bar-h' | 'bar-v' | 'pie' | 'donut' | 'area',
  total: number,
  top: { name: string; value: number; pct: number }
): string {
  if (type === 'area') {
    const dir = trendDirection(data);
    if (dir === 'up') return `La courbe révèle une progression sur la période analysée, ce qui indique une augmentation de l'activité. Au total, ${total} enregistrement${total > 1 ? 's' : ''} sont comptabilisés.`;
    if (dir === 'down') return `La courbe montre un recul sur la période observée, suggérant une diminution de l'activité. Au total, ${total} enregistrement${total > 1 ? 's' : ''} sont comptabilisés.`;
    return `La courbe reste globalement stable sur la période, sans variation significative. Au total, ${total} enregistrement${total > 1 ? 's' : ''} sont comptabilisés.`;
  }

  if (type === 'pie' || type === 'donut') {
    if (data.length === 1) {
      return `Une seule catégorie est présente : « ${top.name} » totalise l'ensemble des ${total} enregistrement${total > 1 ? 's' : ''}.`;
    }
    if (data.length === 2) {
      const other = data.find(d => d.name !== top.name);
      const otherPct = other ? 100 - top.pct : 0;
      return `On observe que « ${top.name} » représente ${top.pct}% du total (${top.value}/${total}), contre ${otherPct}% pour « ${other?.name || '—'} ». Cette répartition met en évidence une ${top.pct > 70 ? 'forte prédominance' : 'distribution relativement équilibrée'}.`;
    }
    return `On observe que « ${top.name} » domine avec ${top.pct}% des ${total} enregistrements (${top.value}). Cela signifie que cette catégorie concentre la plus grande part de l'ensemble.`;
  }

  // bar-h / bar-v
  if (data.length === 1) {
    return `Seule catégorie présente : « ${top.name} » avec ${top.value} entrée${top.value > 1 ? 's' : ''}. Aucune comparaison n'est possible.`;
  }
  const second = [...data].sort((a, b) => b.value - a.value)[1];
  const gap = second ? top.value - second.value : 0;
  if (gap > 0 && second) {
    return `La catégorie « ${top.name} » se distingue nettement avec ${top.value} occurrences (${top.pct}% du total de ${total}), devançant « ${second.name} » de ${gap} unité${gap > 1 ? 's' : ''}.`;
  }
  return `La catégorie « ${top.name} » arrive en tête avec ${top.value} occurrences (${top.pct}%), sur un total de ${total} enregistrements.`;
}

export function generateInsight(
  data: { name: string; value: number }[],
  type: 'bar-h' | 'bar-v' | 'pie' | 'donut' | 'area',
  context?: string
): ChartInsight | string {
  if (!data || data.length === 0) return '';

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return '';

  const top = topItem(data);
  if (!top) return '';

  return {
    definition: buildDefinition(type, context),
    interpretation: buildInterpretation(data, type, total, top),
  };
}

/** Generate insight for stacked bar data */
export function generateStackedInsight(
  data: any[],
  bars: { dataKey: string; name: string }[],
  context?: string
): ChartInsight | string {
  if (!data || data.length === 0) return '';
  
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
  const ctx = context || 'les données';

  return {
    definition: `Ce diagramme empilé compare ${ctx} en décomposant chaque catégorie par sous-groupes. Chaque couleur représente un sous-groupe distinct.`,
    interpretation: `« ${maxBar?.name || maxKey} » représente ${pct}% du total (${totals[maxKey]}/${grandTotal}), ce qui en fait le sous-groupe le plus important de cette répartition.`,
  };
}
