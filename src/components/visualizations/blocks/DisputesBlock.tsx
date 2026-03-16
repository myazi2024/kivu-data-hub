import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, CHART_COLORS, buildFilterLabel } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { AlertTriangle, Scale, TrendingUp, Users } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, StackedBarCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';

import { generateInsight, generateStackedInsight } from '@/utils/chartInsights';
import { useTabChartsConfig, ANALYTICS_TABS_REGISTRY } from '@/hooks/useAnalyticsChartsConfig';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'disputes';
const defaultItems = [...ANALYTICS_TABS_REGISTRY[TAB_KEY].kpis, ...ANALYTICS_TABS_REGISTRY[TAB_KEY].charts];

export const DisputesBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filterLabel = useMemo(() => buildFilterLabel(filter), [filter]);
  const { isChartVisible, getChartConfig } = useTabChartsConfig(TAB_KEY, defaultItems);
  const filtered = useMemo(() => applyFilters(data.disputes, filter), [data.disputes, filter]);

  const { enCours, resolus, byNature, byType, byStatus, byResolutionLevel, byDeclarantQuality, trend, natureStatusCross, resolutionStatus } = useMemo(() => {
    const enCours = filtered.filter(d => !['resolved', 'closed', 'resolu', 'leve'].includes(d.current_status));
    const resolus = filtered.filter(d => ['resolved', 'closed', 'resolu', 'leve'].includes(d.current_status));
    const byNature = countBy(filtered, 'dispute_nature');
    const byType = countBy(filtered, 'dispute_type');
    const byStatus = countBy(filtered, 'current_status');
    const byResolutionLevel = countBy(filtered, 'resolution_level');
    const byDeclarantQuality = countBy(filtered, 'declarant_quality');
    const trend = trendByMonth(filtered);

    const map = new Map<string, { enCours: number; resolu: number }>();
    filtered.forEach(d => {
      const n = d.dispute_nature || '(Non renseigné)';
      if (!map.has(n)) map.set(n, { enCours: 0, resolu: 0 });
      const e = map.get(n)!;
      if (['resolved', 'closed', 'resolu', 'leve'].includes(d.current_status)) e.resolu++; else e.enCours++;
    });
    const natureStatusCross = Array.from(map.entries()).map(([name, d]) => ({ name, ...d })).sort((a, b) => (b.enCours + b.resolu) - (a.enCours + a.resolu));
    const resolutionStatus = [{ name: 'En cours', value: enCours.length }, { name: 'Résolus', value: resolus.length }];
    return { enCours, resolus, byNature, byType, byStatus, byResolutionLevel, byDeclarantQuality, trend, natureStatusCross, resolutionStatus };
  }, [filtered]);

  const avgDuration = useMemo(() => {
    const withStart = filtered.filter(d => d.dispute_start_date);
    if (withStart.length === 0) return 0;
    const now = Date.now();
    const total = withStart.reduce((s, d) => {
      const start = new Date(d.dispute_start_date).getTime();
      return s + (now - start) / (1000 * 60 * 60 * 24);
    }, 0);
    return Math.round(total / withStart.length);
  }, [filtered]);

  const resolutionTrend = useMemo(() => {
    const map = new Map<string, { total: number; resolved: number }>();
    filtered.forEach(d => {
      if (!d.created_at) return;
      const dt = new Date(d.created_at);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, { total: 0, resolved: 0 });
      const e = map.get(key)!;
      e.total++;
      if (['resolved', 'closed', 'resolu', 'leve'].includes(d.current_status)) e.resolved++;
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, d]) => {
      const [y, m] = key.split('-');
      const name = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('fr-FR', { year: '2-digit', month: 'short' });
      return { name, value: d.total > 0 ? Math.round((d.resolved / d.total) * 100) : 0 };
    });
  }, [filtered]);


  const ct = (key: string, fallback: string) => getChartConfig(key)?.custom_title || fallback;
  const v = isChartVisible;

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: ct('kpi-total', 'Total'), value: filtered.length, cls: 'text-red-600' },
    { key: 'kpi-en-cours', label: ct('kpi-en-cours', 'En cours'), value: enCours.length, cls: 'text-amber-600', tooltip: pct(enCours.length, filtered.length) },
    { key: 'kpi-resolus', label: ct('kpi-resolus', 'Résolus'), value: resolus.length, cls: 'text-emerald-600', tooltip: pct(resolus.length, filtered.length) },
    { key: 'kpi-rate', label: ct('kpi-rate', 'Taux résolution'), value: pct(resolus.length, filtered.length), cls: 'text-purple-600' },
    { key: 'kpi-duration', label: ct('kpi-duration', 'Durée moy.'), value: avgDuration > 0 ? `${avgDuration}j` : 'N/A', cls: 'text-blue-600', tooltip: 'Durée moyenne des litiges (jours)' },
  ].filter(k => v(k.key)), [filtered, enCours, resolus, avgDuration, v, getChartConfig]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.disputes} filter={filter} onChange={setFilter}
        statusField="current_status" hidePaymentStatus
      />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {v('nature') && <ChartCard title={ct('nature', 'Nature')} icon={AlertTriangle} iconColor="text-red-500" data={byNature} type="bar-h" colorIndex={4} labelWidth={110}
          insight={generateInsight(byNature, 'bar-h', 'les natures de litige')} />}
        {v('resolution-status') && <ChartCard title={ct('resolution-status', 'En cours vs Résolus')} data={resolutionStatus} type="pie" colorIndex={3}
          insight={`${pct(resolus.length, filtered.length)} des litiges sont résolus à ce jour.`} />}
        {v('status-detail') && <ChartCard title={ct('status-detail', 'Statut détaillé')} data={byStatus} type="bar-v" colorIndex={8}
          insight={generateInsight(byStatus, 'bar-v', 'les statuts détaillés')} />}
        {v('type') && <ChartCard title={ct('type', 'Type litige')} data={byType} type="donut" colorIndex={0}
          insight={generateInsight(byType, 'donut', 'les types de litige')} />}
        {v('resolution-level') && <ChartCard title={ct('resolution-level', 'Niveau résolution')} icon={Scale} iconColor="text-purple-500" data={byResolutionLevel} type="bar-h" colorIndex={5} labelWidth={100}
          insight={generateInsight(byResolutionLevel, 'bar-h', 'les niveaux de résolution')} />}
        {v('declarant-quality') && <ChartCard title={ct('declarant-quality', 'Qualité déclarant')} icon={Users} data={byDeclarantQuality} type="donut" colorIndex={1} hidden={byDeclarantQuality.length === 0}
          insight={generateInsight(byDeclarantQuality, 'donut', 'les déclarants')} />}
        {v('nature-resolution') && <StackedBarCard title={ct('nature-resolution', 'Nature × Résolution')} data={natureStatusCross} bars={[
          { dataKey: 'enCours', name: 'En cours', color: CHART_COLORS[3] },
          { dataKey: 'resolu', name: 'Résolus', color: CHART_COLORS[2] },
        ]} layout="vertical" labelWidth={90} maxItems={6}
          insight={generateStackedInsight(natureStatusCross, [{ dataKey: 'enCours', name: 'En cours' }, { dataKey: 'resolu', name: 'Résolus' }], 'croisement nature/résolution')} />}
        {v('geo') && <GeoCharts records={filtered} />}
        {v('resolution-rate') && <ChartCard title={ct('resolution-rate', 'Taux résolution %')} icon={TrendingUp} data={resolutionTrend} type="area" colorIndex={2} colSpan={2} hidden={resolutionTrend.length < 2}
          insight={generateInsight(resolutionTrend, 'area', 'le taux de résolution mensuel')} />}
        {v('evolution') && <ChartCard title={ct('evolution', 'Évolution')} icon={TrendingUp} data={trend} type="area" colorIndex={4} colSpan={2}
          insight={generateInsight(trend, 'area', 'les litiges')} />}
      </div>
    </div>
  );
});
