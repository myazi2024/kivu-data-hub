import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Search, TrendingUp } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { exportRecordsToCSV } from '@/utils/csvExport';

interface Props { data: LandAnalyticsData; }

export const ExpertiseBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.expertiseRequests, filter), [data.expertiseRequests, filter]);
  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  const stats = useMemo(() => {
    const completed = filtered.filter(r => r.status === 'completed').length;
    const pending = filtered.filter(r => ['pending', 'in_progress', 'assigned'].includes(r.status)).length;
    return { completed, pending };
  }, [filtered]);

  const handleExport = useCallback(() => {
    exportToCSV(filtered, `expertise-${new Date().toISOString().slice(0,10)}`, [
      'id', 'parcel_number', 'status', 'province', 'ville', 'commune', 'created_at'
    ]);
  }, [filtered]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.expertiseRequests} filter={filter} onChange={setFilter} onExport={handleExport} />
      <KpiGrid items={[
        { label: 'Total', value: filtered.length, cls: 'text-violet-600' },
        { label: 'Complétées', value: stats.completed, cls: 'text-emerald-600', tooltip: pct(stats.completed, filtered.length) },
        { label: 'En cours', value: stats.pending, cls: 'text-amber-600', tooltip: pct(stats.pending, filtered.length) },
      ]} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ChartCard title="Statut" icon={Search} data={byStatus} type="pie" colorIndex={5} />
        <GeoCharts records={filtered} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={5} colSpan={2} />
      </div>
    </div>
  );
});
