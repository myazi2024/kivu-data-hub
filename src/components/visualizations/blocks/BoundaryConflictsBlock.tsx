import React, { useState, useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { CHART_COLORS } from '@/utils/analyticsHelpers';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, avgProcessingDays, buildFilterLabel } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { MapPin, TrendingUp, CheckCircle, BarChart3 } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, StackedBarCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';

import { generateInsight, generateStackedInsight } from '@/utils/chartInsights';
import { useTabChartsConfig, ANALYTICS_TABS_REGISTRY } from '@/hooks/useAnalyticsChartsConfig';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'boundary';
const defaultItems = [...ANALYTICS_TABS_REGISTRY[TAB_KEY].kpis, ...ANALYTICS_TABS_REGISTRY[TAB_KEY].charts];

export const BoundaryConflictsBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filterLabel = useMemo(() => buildFilterLabel(filter), [filter]);
  const { isChartVisible, getChartConfig } = useTabChartsConfig(TAB_KEY, defaultItems);
  const filtered = useMemo(() => applyFilters(data.boundaryConflicts, filter), [data.boundaryConflicts, filter]);

  const byType = useMemo(() => countBy(filtered, 'conflict_type'), [filtered]);
  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  // Cross: type × status
  const typeStatusCross = useMemo(() => {
    const map = new Map<string, { resolved: number; pending: number; open: number }>();
    filtered.forEach(r => {
      const t = r.conflict_type || '(Non renseigné)';
      if (!map.has(t)) map.set(t, { resolved: 0, pending: 0, open: 0 });
      const entry = map.get(t)!;
      if (r.status === 'resolved') entry.resolved++;
      else if (r.status === 'open') entry.open++;
      else entry.pending++;
    });
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => (b.resolved + b.pending + b.open) - (a.resolved + a.pending + a.open));
  }, [filtered]);

  // Resolution rate trend
  const resolutionTrend = useMemo(() => {
    const map = new Map<string, { total: number; resolved: number }>();
    filtered.forEach(r => {
      if (!r.created_at) return;
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, { total: 0, resolved: 0 });
      const entry = map.get(key)!;
      entry.total++;
      if (r.status === 'resolved') entry.resolved++;
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => {
      const [y, m] = k.split('-');
      const name = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('fr-FR', { year: '2-digit', month: 'short' });
      return { name, value: v.total > 0 ? Math.round((v.resolved / v.total) * 100) : 0 };
    });
  }, [filtered]);

  const stats = useMemo(() => {
    const resolved = filtered.filter(r => r.status === 'resolved').length;
    const pending = filtered.filter(r => r.status === 'pending' || r.status === 'open').length;
    const avgDays = avgProcessingDays(filtered, 'created_at', 'resolved_at');
    return { resolved, pending, avgDays };
  }, [filtered]);

  const ct = (key: string, fallback: string) => getChartConfig(key)?.custom_title || fallback;
  const v = isChartVisible;

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: ct('kpi-total', 'Total'), value: filtered.length, cls: 'text-primary' },
    { key: 'kpi-resolved', label: ct('kpi-resolved', 'Résolus'), value: stats.resolved, cls: 'text-emerald-600', tooltip: pct(stats.resolved, filtered.length) },
    { key: 'kpi-pending', label: ct('kpi-pending', 'En cours'), value: stats.pending, cls: 'text-amber-600', tooltip: pct(stats.pending, filtered.length) },
    { key: 'kpi-rate', label: ct('kpi-rate', 'Taux résolution'), value: pct(stats.resolved, filtered.length), cls: 'text-blue-600' },
    { key: 'kpi-delay', label: ct('kpi-delay', 'Délai moy.'), value: stats.avgDays > 0 ? `${stats.avgDays}j` : 'N/A', cls: 'text-violet-600', tooltip: 'Délai moyen de résolution' },
  ].filter(k => v(k.key)), [filtered, stats, v, getChartConfig]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.boundaryConflicts} filter={filter} onChange={setFilter} hidePaymentStatus />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {v('conflict-type') && <ChartCard title={ct('conflict-type', 'Type conflit')} icon={MapPin} data={byType} type="bar-h" colorIndex={4} labelWidth={110}
          insight={generateInsight(byType, 'bar-h', 'les types de conflit de limites')} />}
        {v('status') && <ChartCard title={ct('status', 'Statut')} icon={CheckCircle} data={byStatus} type="pie" colorIndex={2}
          insight={generateInsight(byStatus, 'pie', 'les statuts de conflit')} />}
        {v('type-status-cross') && <StackedBarCard title={ct('type-status-cross', 'Type × Statut')} icon={BarChart3} data={typeStatusCross} series={[
          { dataKey: 'resolved', name: 'Résolus' },
          { dataKey: 'pending', name: 'En attente' },
          { dataKey: 'open', name: 'Ouverts' },
        ]} layout="vertical" labelWidth={90} maxItems={6}
          insight={generateStackedInsight(typeStatusCross, [{ dataKey: 'resolved', name: 'Résolus' }, { dataKey: 'pending', name: 'En attente' }], 'croisement type/statut')} />}
        {v('resolution-rate') && <ChartCard title={ct('resolution-rate', 'Taux résolution %')} icon={TrendingUp} data={resolutionTrend} type="area" colorIndex={2} hidden={resolutionTrend.length < 2}
          insight={generateInsight(resolutionTrend, 'area', 'le taux de résolution mensuel')} />}
        {v('geo') && <GeoCharts records={filtered} />}
        {v('evolution') && <ChartCard title={ct('evolution', 'Évolution')} icon={TrendingUp} data={trend} type="area" colorIndex={4} colSpan={2}
          insight={generateInsight(trend, 'area', 'les conflits de limites')} />}
      </div>
    </div>
    </FilterLabelContext.Provider>
  );
});
