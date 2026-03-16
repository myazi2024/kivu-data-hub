import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, avgProcessingDays } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { MapPin, TrendingUp, CheckCircle } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard } from '../shared/ChartCard';
import { exportRecordsToCSV } from '@/utils/csvExport';
import { generateInsight } from '@/utils/chartInsights';

interface Props { data: LandAnalyticsData; }

export const BoundaryConflictsBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.boundaryConflicts, filter), [data.boundaryConflicts, filter]);

  const byType = useMemo(() => countBy(filtered, 'conflict_type'), [filtered]);
  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  const stats = useMemo(() => {
    const resolved = filtered.filter(r => r.status === 'resolved').length;
    const pending = filtered.filter(r => r.status === 'pending' || r.status === 'open').length;
    const avgDays = avgProcessingDays(filtered, 'created_at', 'resolved_at');
    return { resolved, pending, avgDays };
  }, [filtered]);

  const handleExport = useCallback(() => {
    exportRecordsToCSV(filtered, `conflits-limites-${new Date().toISOString().slice(0,10)}`, [
      'id', 'conflict_type', 'status', 'reporting_parcel_number', 'conflicting_parcel_number', 'created_at', 'resolved_at'
    ]);
  }, [filtered]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.boundaryConflicts} filter={filter} onChange={setFilter} onExport={handleExport} hidePaymentStatus hideStatus />
      <KpiGrid items={[
        { label: 'Total', value: filtered.length, cls: 'text-primary' },
        { label: 'Résolus', value: stats.resolved, cls: 'text-emerald-600', tooltip: pct(stats.resolved, filtered.length) },
        { label: 'En cours', value: stats.pending, cls: 'text-amber-600', tooltip: pct(stats.pending, filtered.length) },
        { label: 'Taux résolution', value: pct(stats.resolved, filtered.length), cls: 'text-blue-600' },
        { label: 'Délai moy.', value: stats.avgDays > 0 ? `${stats.avgDays}j` : 'N/A', cls: 'text-violet-600', tooltip: 'Délai moyen de résolution' },
      ]} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ChartCard title="Type conflit" icon={MapPin} data={byType} type="bar-h" colorIndex={4} labelWidth={110}
          insight={generateInsight(byType, 'bar-h', 'les types de conflit de limites')} />
        <ChartCard title="Statut" icon={CheckCircle} data={byStatus} type="pie" colorIndex={2}
          insight={generateInsight(byStatus, 'pie', 'les statuts de conflit')} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={4} colSpan={2}
          insight={generateInsight(trend, 'area', 'les conflits de limites')} />
      </div>
    </div>
  );
});
