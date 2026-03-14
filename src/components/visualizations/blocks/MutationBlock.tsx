import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { ArrowRightLeft, TrendingUp } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { exportRecordsToCSV } from '@/utils/csvExport';

interface Props { data: LandAnalyticsData; }

export const MutationBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.mutationRequests, filter), [data.mutationRequests, filter]);
  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const byType = useMemo(() => countBy(filtered, 'mutation_type'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  const stats = useMemo(() => {
    const approved = filtered.filter(r => r.status === 'approved').length;
    const pending = filtered.filter(r => r.status === 'pending').length;
    return { approved, pending };
  }, [filtered]);

  const handleExport = useCallback(() => {
    exportToCSV(filtered, `mutations-${new Date().toISOString().slice(0,10)}`, [
      'id', 'parcel_number', 'mutation_type', 'status', 'province', 'ville', 'commune', 'created_at'
    ]);
  }, [filtered]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.mutationRequests} filter={filter} onChange={setFilter} onExport={handleExport} />
      <KpiGrid items={[
        { label: 'Total', value: filtered.length, cls: 'text-orange-600' },
        { label: 'Approuvées', value: stats.approved, cls: 'text-emerald-600', tooltip: pct(stats.approved, filtered.length) },
        { label: 'En attente', value: stats.pending, cls: 'text-amber-600', tooltip: pct(stats.pending, filtered.length) },
      ]} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ChartCard title="Statut" icon={ArrowRightLeft} data={byStatus} type="pie" colorIndex={6} />
        <ChartCard title="Type mutation" data={byType} type="bar-h" colorIndex={6} labelWidth={100} />
        <GeoCharts records={filtered} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={6} colSpan={2} />
      </div>
    </div>
  );
});
