import React, { useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { countBy, trendByMonth } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Users, TrendingUp, ArrowRightLeft } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { generateInsight } from '@/utils/chartInsights';
import { useBlockFilter } from '@/hooks/useBlockFilter';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'ownership';

export const OwnershipHistoryBlock: React.FC<Props> = memo(({ data }) => {
  const { filter, setFilter, filterLabel, filtered, filterConfig, v, ct, cx, ty, ord, exportCSV } = useBlockFilter(TAB_KEY, data.ownershipHistory);

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

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: ct('kpi-total', 'Total transferts'), value: filtered.length, cls: 'text-primary' },
    { key: 'kpi-active', label: ct('kpi-active', 'Propriétaires actifs'), value: stats.activeOwners, cls: 'text-emerald-600', tooltip: pct(stats.activeOwners, filtered.length) },
    { key: 'kpi-closed', label: ct('kpi-closed', 'Transferts clos'), value: stats.transfers, cls: 'text-amber-600' },
    { key: 'kpi-duration', label: ct('kpi-duration', 'Durée moy.'), value: stats.avgYears > 0 ? `${stats.avgYears} ans` : 'N/A', cls: 'text-violet-600', tooltip: 'Durée moyenne de détention' },
  ].filter(k => v(k.key)), [filtered, stats, v, ct]);

  const chartDefs = useMemo(() => [
    { key: 'legal-status', el: () => <ChartCard title={ct('legal-status', 'Statut juridique')} icon={Users} data={byLegalStatus} type={ty('legal-status', 'donut')} colorIndex={1}
      insight={generateInsight(byLegalStatus, 'donut', 'les statuts juridiques des propriétaires')} crossVariables={cx('legal-status')} rawRecords={filtered} groupField="legal_status" /> },
    { key: 'mutation-type', el: () => <ChartCard title={ct('mutation-type', 'Type mutation')} icon={ArrowRightLeft} data={byMutationType} type={ty('mutation-type', 'bar-h')} colorIndex={6} labelWidth={100}
      insight={generateInsight(byMutationType, 'bar-h', 'les types de mutation')} crossVariables={cx('mutation-type')} rawRecords={filtered} groupField="mutation_type" /> },
    { key: 'geo', el: () => <GeoCharts records={filtered} /> },
    { key: 'evolution', el: () => <ChartCard title={ct('evolution', 'Évolution')} icon={TrendingUp} data={trend} type={ty('evolution', 'area')} colorIndex={0} colSpan={2}
      insight={generateInsight(trend, 'area', 'les transferts de propriété')} /> },
  ].filter(d => v(d.key)).sort((a, b) => ord(a.key) - ord(b.key)), [filtered, byLegalStatus, byMutationType, trend, v, ct, cx, ty, ord]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.ownershipHistory} filter={filter} onChange={setFilter} hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} statusField={filterConfig.statusField} onExport={() => exportCSV(['parcel_id', 'owner_name', 'legal_status', 'mutation_type', 'ownership_start_date', 'ownership_end_date', 'created_at'])} />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {chartDefs.map(d => <React.Fragment key={d.key}>{d.el()}</React.Fragment>)}
      </div>
    </div>
    </FilterLabelContext.Provider>
  );
});
