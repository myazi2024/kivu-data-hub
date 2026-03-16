import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, VALID_LIFTING_STATUSES, buildFilterLabel } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { ShieldCheck, Scale, TrendingUp, MessageSquare } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';

import { generateInsight } from '@/utils/chartInsights';
import { useTabChartsConfig, ANALYTICS_TABS_REGISTRY } from '@/hooks/useAnalyticsChartsConfig';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'lifting';
const defaultItems = [...ANALYTICS_TABS_REGISTRY[TAB_KEY].kpis, ...ANALYTICS_TABS_REGISTRY[TAB_KEY].charts];

export const DisputeLiftingBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filterLabel = useMemo(() => buildFilterLabel(filter), [filter]);
  const { isChartVisible, getChartConfig } = useTabChartsConfig(TAB_KEY, defaultItems);

  const liftingDisputes = useMemo(() =>
    data.disputes.filter(d => d.lifting_status && VALID_LIFTING_STATUSES.includes(d.lifting_status)),
    [data.disputes]
  );
  const filtered = useMemo(() => applyFilters(liftingDisputes, filter), [liftingDisputes, filter]);

  const byLiftingStatus = useMemo(() => countBy(filtered, 'lifting_status'), [filtered]);
  const byResolutionLevel = useMemo(() => countBy(filtered, 'resolution_level'), [filtered]);
  const byNature = useMemo(() => countBy(filtered, 'dispute_nature'), [filtered]);
  const byLiftingReason = useMemo(() => countBy(filtered.filter(r => r.lifting_reason), 'lifting_reason'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  const stats = useMemo(() => {
    const approved = filtered.filter(d => d.lifting_status === 'approved').length;
    const pending = filtered.filter(d => ['pending', 'demande_levee', 'in_review'].includes(d.lifting_status)).length;
    const rejected = filtered.filter(d => d.lifting_status === 'rejected').length;
    return { approved, pending, rejected };
  }, [filtered]);

  const liftingSuccessTrend = useMemo(() => {
    const map = new Map<string, { total: number; approved: number }>();
    filtered.forEach(d => {
      if (!d.created_at) return;
      const dt = new Date(d.created_at);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, { total: 0, approved: 0 });
      const e = map.get(key)!;
      e.total++;
      if (d.lifting_status === 'approved') e.approved++;
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, d]) => {
      const [y, m] = key.split('-');
      const name = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('fr-FR', { year: '2-digit', month: 'short' });
      return { name, value: d.total > 0 ? Math.round((d.approved / d.total) * 100) : 0 };
    });
  }, [filtered]);


  const ct = (key: string, fallback: string) => getChartConfig(key)?.custom_title || fallback;
  const v = isChartVisible;

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: ct('kpi-total', 'Total levées'), value: filtered.length, cls: 'text-sky-600' },
    { key: 'kpi-approved', label: ct('kpi-approved', 'Approuvées'), value: stats.approved, cls: 'text-emerald-600', tooltip: pct(stats.approved, filtered.length) },
    { key: 'kpi-pending', label: ct('kpi-pending', 'En attente'), value: stats.pending, cls: 'text-amber-600', tooltip: pct(stats.pending, filtered.length) },
    { key: 'kpi-rejected', label: ct('kpi-rejected', 'Rejetées'), value: stats.rejected, cls: 'text-red-600', tooltip: pct(stats.rejected, filtered.length) },
    { key: 'kpi-success', label: ct('kpi-success', 'Taux réussite'), value: pct(stats.approved, filtered.length), cls: 'text-purple-600', tooltip: 'Pourcentage de levées approuvées' },
  ].filter(k => v(k.key)), [filtered, stats, v, getChartConfig]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <div className="space-y-2">
      <AnalyticsFilters data={liftingDisputes} filter={filter} onChange={setFilter} hidePaymentStatus />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {v('lifting-status') && <ChartCard title={ct('lifting-status', 'Statut levée')} icon={ShieldCheck} data={byLiftingStatus} type="pie" colorIndex={9}
          insight={generateInsight(byLiftingStatus, 'pie', 'les statuts de levée')} />}
        {v('resolution-level') && <ChartCard title={ct('resolution-level', 'Niveau résolution')} icon={Scale} iconColor="text-purple-500" data={byResolutionLevel} type="bar-h" colorIndex={9} labelWidth={100}
          insight={generateInsight(byResolutionLevel, 'bar-h', 'les niveaux de résolution')} />}
        {v('nature') && <ChartCard title={ct('nature', 'Nature litige')} data={byNature} type="bar-h" colorIndex={4} labelWidth={100}
          insight={generateInsight(byNature, 'bar-h', 'les natures de litige concernées')} />}
        {v('reason') && <ChartCard title={ct('reason', 'Motif de levée')} icon={MessageSquare} data={byLiftingReason} type="bar-h" colorIndex={6} labelWidth={120} hidden={byLiftingReason.length === 0}
          insight={generateInsight(byLiftingReason, 'bar-h', 'les motifs de levée')} />}
        {v('geo') && <GeoCharts records={filtered} />}
        {v('success-rate') && <ChartCard title={ct('success-rate', 'Taux réussite %')} icon={TrendingUp} data={liftingSuccessTrend} type="area" colorIndex={2} colSpan={2} hidden={liftingSuccessTrend.length < 2}
          insight={generateInsight(liftingSuccessTrend, 'area', 'le taux de réussite des levées')} />}
        {v('evolution') && <ChartCard title={ct('evolution', 'Évolution')} icon={TrendingUp} data={trend} type="area" colorIndex={9} colSpan={2}
          insight={generateInsight(trend, 'area', 'les levées de litige')} />}
      </div>
    </div>
  );
});
