import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, buildFilterLabel } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { ShieldAlert, TrendingUp, AlertTriangle } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard } from '../shared/ChartCard';

import { generateInsight } from '@/utils/chartInsights';
import { useTabChartsConfig, ANALYTICS_TABS_REGISTRY } from '@/hooks/useAnalyticsChartsConfig';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'fraud';
const defaultItems = [...ANALYTICS_TABS_REGISTRY[TAB_KEY].kpis, ...ANALYTICS_TABS_REGISTRY[TAB_KEY].charts];

export const FraudAttemptsBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const { isChartVisible, getChartConfig } = useTabChartsConfig(TAB_KEY, defaultItems);
  const filtered = useMemo(() => applyFilters(data.fraudAttempts, filter), [data.fraudAttempts, filter]);

  const byFraudType = useMemo(() => countBy(filtered, 'fraud_type'), [filtered]);
  const bySeverity = useMemo(() => countBy(filtered, 'severity'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  const stats = useMemo(() => {
    const critical = filtered.filter(r => r.severity === 'critical' || r.severity === 'high').length;
    const medium = filtered.filter(r => r.severity === 'medium').length;
    const low = filtered.filter(r => r.severity === 'low').length;
    const withContribution = filtered.filter(r => r.contribution_id).length;
    return { critical, medium, low, withContribution };
  }, [filtered]);


  const ct = (key: string, fallback: string) => getChartConfig(key)?.custom_title || fallback;
  const v = isChartVisible;

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: ct('kpi-total', 'Total'), value: filtered.length, cls: 'text-red-600' },
    { key: 'kpi-critical', label: ct('kpi-critical', 'Critiques/Élevées'), value: stats.critical, cls: 'text-rose-600', tooltip: pct(stats.critical, filtered.length) },
    { key: 'kpi-medium', label: ct('kpi-medium', 'Moyennes'), value: stats.medium, cls: 'text-amber-600', tooltip: pct(stats.medium, filtered.length) },
    { key: 'kpi-low', label: ct('kpi-low', 'Faibles'), value: stats.low, cls: 'text-emerald-600', tooltip: pct(stats.low, filtered.length) },
    { key: 'kpi-linked', label: ct('kpi-linked', 'Liées contrib.'), value: stats.withContribution, cls: 'text-blue-600', tooltip: 'Tentatives liées à une contribution' },
  ].filter(k => v(k.key)), [filtered, stats, v, getChartConfig]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.fraudAttempts} filter={filter} onChange={setFilter} hidePaymentStatus hideStatus />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {v('fraud-type') && <ChartCard title={ct('fraud-type', 'Type de fraude')} icon={ShieldAlert} data={byFraudType} type="bar-h" colorIndex={4} labelWidth={120}
          insight={generateInsight(byFraudType, 'bar-h', 'les types de fraude')} />}
        {v('severity') && <ChartCard title={ct('severity', 'Sévérité')} icon={AlertTriangle} data={bySeverity} type="pie" colorIndex={4}
          insight={stats.critical > 0 ? `${stats.critical} tentative${stats.critical > 1 ? 's' : ''} de sévérité critique ou élevée nécessitant une attention immédiate.` : generateInsight(bySeverity, 'pie', 'les niveaux de sévérité')} />}
        {v('evolution') && <ChartCard title={ct('evolution', 'Évolution')} icon={TrendingUp} data={trend} type="area" colorIndex={4} colSpan={2}
          insight={generateInsight(trend, 'area', 'les tentatives de fraude')} />}
      </div>
    </div>
  );
});
