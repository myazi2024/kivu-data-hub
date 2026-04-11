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
import { getCrossVariables } from '@/config/crossVariables';
import { useBlockFilter } from '@/hooks/useBlockFilter';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'ownership';
const cx = (key: string) => getCrossVariables(TAB_KEY, key);

export const OwnershipHistoryBlock: React.FC<Props> = memo(({ data }) => {
  const { filter, setFilter, filterLabel, filtered, filterConfig, v, ct } = useBlockFilter(TAB_KEY, data.ownershipHistory);

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

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.ownershipHistory} filter={filter} onChange={setFilter} hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} statusField={filterConfig.statusField} />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {v('legal-status') && <ChartCard title={ct('legal-status', 'Statut juridique')} icon={Users} data={byLegalStatus} type="donut" colorIndex={1}
          insight={generateInsight(byLegalStatus, 'donut', 'les statuts juridiques des propriétaires')} crossVariables={cx('legal-status')} rawRecords={filtered} groupField="legal_status" />}
        {v('mutation-type') && <ChartCard title={ct('mutation-type', 'Type mutation')} icon={ArrowRightLeft} data={byMutationType} type="bar-h" colorIndex={6} labelWidth={100}
          insight={generateInsight(byMutationType, 'bar-h', 'les types de mutation')} crossVariables={cx('mutation-type')} rawRecords={filtered} groupField="mutation_type" />}
        {v('geo') && <GeoCharts records={filtered} />}
        {v('evolution') && <ChartCard title={ct('evolution', 'Évolution')} icon={TrendingUp} data={trend} type="area" colorIndex={0} colSpan={2}
          insight={generateInsight(trend, 'area', 'les transferts de propriété')} />}
      </div>
    </div>
    </FilterLabelContext.Provider>
  );
});
