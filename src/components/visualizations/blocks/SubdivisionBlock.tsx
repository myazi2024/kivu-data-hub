import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Scissors, TrendingUp } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { exportToCSV } from '@/utils/csvExport';

interface Props { data: LandAnalyticsData; }

export const SubdivisionBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.subdivisionRequests, filter), [data.subdivisionRequests, filter]);
  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  const stats = useMemo(() => {
    const totalLots = filtered.reduce((s, r) => s + (r.number_of_lots || 0), 0);
    const approved = filtered.filter(r => r.status === 'approved').length;
    return { totalLots, approved };
  }, [filtered]);

  const handleExport = useCallback(() => {
    exportToCSV(filtered, `lotissements-${new Date().toISOString().slice(0,10)}`, [
      'id', 'parcel_number', 'status', 'number_of_lots', 'province', 'ville', 'commune', 'created_at'
    ]);
  }, [filtered]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.subdivisionRequests} filter={filter} onChange={setFilter} onExport={handleExport} />
      <KpiGrid items={[
        { label: 'Total', value: filtered.length, cls: 'text-teal-600' },
        { label: 'Lots prévus', value: stats.totalLots, cls: 'text-blue-600' },
        { label: 'Approuvées', value: stats.approved, cls: 'text-emerald-600', tooltip: pct(stats.approved, filtered.length) },
      ]} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ChartCard title="Statut" icon={Scissors} data={byStatus} type="pie" colorIndex={7} />
        <GeoCharts records={filtered} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={7} colSpan={2} />
      </div>
    </div>
  );
});
