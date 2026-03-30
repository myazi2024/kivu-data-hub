import React, { useState, useMemo, memo, useCallback, useContext, useEffect } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, buildFilterLabel } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Users, TrendingUp, ArrowRightLeft } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';

import { generateInsight } from '@/utils/chartInsights';
import { useTabChartsConfig, ANALYTICS_TABS_REGISTRY } from '@/hooks/useAnalyticsChartsConfig';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'ownership';
const defaultItems = [...ANALYTICS_TABS_REGISTRY[TAB_KEY].kpis, ...ANALYTICS_TABS_REGISTRY[TAB_KEY].charts];

export const OwnershipHistoryBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filterLabel = useMemo(() => buildFilterLabel(filter), [filter]);
  const { isChartVisible, getChartConfig } = useTabChartsConfig(TAB_KEY, defaultItems);
  const filtered = useMemo(() => applyFilters(data.ownershipHistory, filter, 'ownership_start_date'), [data.ownershipHistory, filter]);

  const byLegalStatus = useMemo(() => countBy(filtered, 'legal_status'), [filtered]);
  const byMutationType = useMemo(() => countBy(filtered, 'mutation_type'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered, 'ownership_start_date'), [filtered]);

  const stats = useMemo(() => {
    const withDates = filtered.filter(r => r.ownership_start_date && r.ownership_end_date);
    let avgYears = 0;
    if (withDates.length > 0) {
      const total = withDates.reduce((s, r) => {
        const start = new Date(r.ownership_start_date).getTime();
        const end = new Date(r.ownership_end_date).getTime();
        return s + (end - start) / (1000 * 60 * 60 * 24 * 365.25);
      }, 0);
      avgYears = Math.round(total / withDates.length * 10) / 10;
    }
    const activeOwners = filtered.filter(r => !r.ownership_end_date).length;
    return { avgYears, activeOwners, transfers: withDates.length };
  }, [filtered]);


  const ct = (key: string, fallback: string) => getChartConfig(key)?.custom_title || fallback;
  const v = isChartVisible;

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: ct('kpi-total', 'Total transferts'), value: filtered.length, cls: 'text-primary' },
    { key: 'kpi-active', label: ct('kpi-active', 'Propriétaires actifs'), value: stats.activeOwners, cls: 'text-emerald-600', tooltip: pct(stats.activeOwners, filtered.length) },
    { key: 'kpi-closed', label: ct('kpi-closed', 'Transferts clos'), value: stats.transfers, cls: 'text-amber-600' },
    { key: 'kpi-duration', label: ct('kpi-duration', 'Durée moy.'), value: stats.avgYears > 0 ? `${stats.avgYears} ans` : 'N/A', cls: 'text-violet-600', tooltip: 'Durée moyenne de détention' },
  ].filter(k => v(k.key)), [filtered, stats, v, getChartConfig]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.ownershipHistory} filter={filter} onChange={setFilter} hidePaymentStatus hideStatus dateField="ownership_start_date" />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {v('legal-status') && <ChartCard title={ct('legal-status', 'Statut juridique')} icon={Users} data={byLegalStatus} type="donut" colorIndex={1}
          insight={generateInsight(byLegalStatus, 'donut', 'les statuts juridiques des propriétaires')} />}
        {v('mutation-type') && <ChartCard title={ct('mutation-type', 'Type mutation')} icon={ArrowRightLeft} data={byMutationType} type="bar-h" colorIndex={6} labelWidth={100}
          insight={generateInsight(byMutationType, 'bar-h', 'les types de mutation')} />}
        {v('geo') && <GeoCharts records={filtered} />}
        {v('evolution') && <ChartCard title={ct('evolution', 'Évolution')} icon={TrendingUp} data={trend} type="area" colorIndex={0} colSpan={2}
          insight={generateInsight(trend, 'area', 'les transferts de propriété')} />}
      </div>
    </div>
    </FilterLabelContext.Provider>
  );
});
