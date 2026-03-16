import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Users, TrendingUp, ArrowRightLeft } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { exportRecordsToCSV } from '@/utils/csvExport';

interface Props { data: LandAnalyticsData; }

export const OwnershipHistoryBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.ownershipHistory, filter, 'ownership_start_date'), [data.ownershipHistory, filter]);

  const byLegalStatus = useMemo(() => countBy(filtered, 'legal_status'), [filtered]);
  const byMutationType = useMemo(() => countBy(filtered, 'mutation_type'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered, 'ownership_start_date'), [filtered]);

  // Average ownership duration
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

  const handleExport = useCallback(() => {
    exportRecordsToCSV(filtered, `historique-propriete-${new Date().toISOString().slice(0,10)}`, [
      'id', 'parcel_id', 'owner_name', 'legal_status', 'mutation_type', 'ownership_start_date', 'ownership_end_date'
    ]);
  }, [filtered]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.ownershipHistory} filter={filter} onChange={setFilter} onExport={handleExport} hidePaymentStatus dateField="ownership_start_date" />
      <KpiGrid items={[
        { label: 'Total transferts', value: filtered.length, cls: 'text-primary' },
        { label: 'Propriétaires actifs', value: stats.activeOwners, cls: 'text-emerald-600', tooltip: pct(stats.activeOwners, filtered.length) },
        { label: 'Transferts clos', value: stats.transfers, cls: 'text-amber-600' },
        { label: 'Durée moy.', value: stats.avgYears > 0 ? `${stats.avgYears} ans` : 'N/A', cls: 'text-violet-600', tooltip: 'Durée moyenne de détention' },
      ]} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ChartCard title="Statut juridique" icon={Users} data={byLegalStatus} type="donut" colorIndex={1} />
        <ChartCard title="Type mutation" icon={ArrowRightLeft} data={byMutationType} type="bar-h" colorIndex={6} labelWidth={100} />
        <GeoCharts records={filtered} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={0} colSpan={2} />
      </div>
    </div>
  );
});
