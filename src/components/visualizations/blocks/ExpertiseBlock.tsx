import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, avgProcessingDays } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Search, TrendingUp, Clock } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { exportRecordsToCSV } from '@/utils/csvExport';

interface Props { data: LandAnalyticsData; }

export const ExpertiseBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.expertiseRequests, filter), [data.expertiseRequests, filter]);
  // #22: Detailed status breakdown
  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  const stats = useMemo(() => {
    const completed = filtered.filter(r => r.status === 'completed').length;
    const pending = filtered.filter(r => r.status === 'pending').length;
    const inProgress = filtered.filter(r => ['in_progress', 'assigned'].includes(r.status)).length;
    // #19: Processing delay
    const avgDays = avgProcessingDays(filtered, 'created_at', 'reviewed_at');
    return { completed, pending, inProgress, avgDays };
  }, [filtered]);

  const handleExport = useCallback(() => {
    exportRecordsToCSV(filtered, `expertise-${new Date().toISOString().slice(0,10)}`, [
      'id', 'parcel_number', 'status', 'province', 'ville', 'commune', 'created_at'
    ]);
  }, [filtered]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.expertiseRequests} filter={filter} onChange={setFilter} onExport={handleExport} />
      <KpiGrid items={[
        { label: 'Total', value: filtered.length, cls: 'text-violet-600' },
        { label: 'Complétées', value: stats.completed, cls: 'text-emerald-600', tooltip: pct(stats.completed, filtered.length) },
        { label: 'En cours', value: stats.inProgress, cls: 'text-blue-600', tooltip: pct(stats.inProgress, filtered.length) },
        { label: 'En attente', value: stats.pending, cls: 'text-amber-600', tooltip: pct(stats.pending, filtered.length) },
        { label: 'Délai moy.', value: stats.avgDays > 0 ? `${stats.avgDays}j` : 'N/A', cls: 'text-rose-600', tooltip: 'Délai moyen de traitement' },
      ]} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* #22: Detailed status chart (shows pending, in_progress, assigned, completed separately) */}
        <ChartCard title="Statut détaillé" icon={Search} data={byStatus} type="bar-v" colorIndex={5} />
        <GeoCharts records={filtered} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={5} colSpan={2} />
      </div>
    </div>
  );
});
