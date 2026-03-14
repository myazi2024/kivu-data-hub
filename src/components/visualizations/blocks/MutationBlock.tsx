import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, CHART_COLORS, avgProcessingDays } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { ArrowRightLeft, TrendingUp } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, StackedBarCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { exportRecordsToCSV } from '@/utils/csvExport';

interface Props { data: LandAnalyticsData; }

export const MutationBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.mutationRequests, filter), [data.mutationRequests, filter]);
  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const byType = useMemo(() => countBy(filtered, 'mutation_type'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  // #23: Cross mutation_type × status
  const typeStatusCross = useMemo(() => {
    const map = new Map<string, { approved: number; pending: number; rejected: number; other: number }>();
    filtered.forEach(r => {
      const t = r.mutation_type || '(Non renseigné)';
      if (!map.has(t)) map.set(t, { approved: 0, pending: 0, rejected: 0, other: 0 });
      const e = map.get(t)!;
      if (r.status === 'approved') e.approved++;
      else if (r.status === 'pending') e.pending++;
      else if (r.status === 'rejected') e.rejected++;
      else e.other++;
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => (b.approved + b.pending + b.rejected + b.other) - (a.approved + a.pending + a.rejected + a.other));
  }, [filtered]);

  const stats = useMemo(() => {
    const approved = filtered.filter(r => r.status === 'approved').length;
    const pending = filtered.filter(r => r.status === 'pending').length;
    const rejected = filtered.filter(r => r.status === 'rejected').length;
    const avgDays = avgProcessingDays(filtered, 'created_at', 'reviewed_at');
    return { approved, pending, rejected, avgDays };
  }, [filtered]);

  const handleExport = useCallback(() => {
    exportRecordsToCSV(filtered, `mutations-${new Date().toISOString().slice(0,10)}`, [
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
        { label: 'Rejetées', value: stats.rejected, cls: 'text-red-600', tooltip: pct(stats.rejected, filtered.length) },
        { label: 'Délai moy.', value: stats.avgDays > 0 ? `${stats.avgDays}j` : 'N/A', cls: 'text-violet-600', tooltip: 'Délai moyen de traitement' },
      ]} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ChartCard title="Statut" icon={ArrowRightLeft} data={byStatus} type="pie" colorIndex={6} />
        <ChartCard title="Type mutation" data={byType} type="bar-h" colorIndex={6} labelWidth={100} />
        {/* #23: Cross mutation_type × status */}
        <StackedBarCard title="Type × Statut" data={typeStatusCross} bars={[
          { dataKey: 'approved', name: 'Approuvées', color: CHART_COLORS[2] },
          { dataKey: 'pending', name: 'En attente', color: CHART_COLORS[3] },
          { dataKey: 'rejected', name: 'Rejetées', color: CHART_COLORS[4] },
        ]} layout="vertical" labelWidth={90} hidden={typeStatusCross.length === 0} />
        <GeoCharts records={filtered} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={6} colSpan={2} />
      </div>
    </div>
  );
});
