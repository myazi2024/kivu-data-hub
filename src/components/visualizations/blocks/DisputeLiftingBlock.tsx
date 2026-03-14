import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { ShieldCheck, Scale, TrendingUp } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { exportRecordsToCSV } from '@/utils/csvExport';

interface Props { data: LandAnalyticsData; }

export const DisputeLiftingBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);

  // Only include disputes that have an explicit lifting_status (not just a reference)
  const liftingDisputes = useMemo(() => data.disputes.filter(d => d.lifting_status), [data.disputes]);
  const filtered = useMemo(() => applyFilters(liftingDisputes, filter), [liftingDisputes, filter]);

  const byLiftingStatus = useMemo(() => countBy(filtered, 'lifting_status'), [filtered]);
  const byResolutionLevel = useMemo(() => countBy(filtered, 'resolution_level'), [filtered]);
  const byNature = useMemo(() => countBy(filtered, 'dispute_nature'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  const stats = useMemo(() => {
    const approved = filtered.filter(d => d.lifting_status === 'approved').length;
    const pending = filtered.filter(d => d.lifting_status === 'pending' || d.lifting_status === 'demande_levee').length;
    const rejected = filtered.filter(d => d.lifting_status === 'rejected').length;
    return { approved, pending, rejected };
  }, [filtered]);

  const handleExport = useCallback(() => {
    exportRecordsToCSV(filtered, `levees-litiges-${new Date().toISOString().slice(0,10)}`, [
      'id', 'parcel_number', 'dispute_nature', 'lifting_status', 'resolution_level',
      'lifting_request_reference', 'province', 'ville', 'commune', 'created_at'
    ]);
  }, [filtered]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={liftingDisputes} filter={filter} onChange={setFilter} onExport={handleExport} />
      <KpiGrid items={[
        { label: 'Total levées', value: filtered.length, cls: 'text-sky-600' },
        { label: 'Approuvées', value: stats.approved, cls: 'text-emerald-600', tooltip: pct(stats.approved, filtered.length) },
        { label: 'En attente', value: stats.pending, cls: 'text-amber-600', tooltip: pct(stats.pending, filtered.length) },
        { label: 'Rejetées', value: stats.rejected, cls: 'text-red-600', tooltip: pct(stats.rejected, filtered.length) },
      ]} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ChartCard title="Statut levée" icon={ShieldCheck} data={byLiftingStatus} type="pie" colorIndex={9} />
        <ChartCard title="Niveau résolution" icon={Scale} iconColor="text-purple-500" data={byResolutionLevel} type="bar-h" colorIndex={9} labelWidth={100} />
        <ChartCard title="Nature litige" data={byNature} type="bar-h" colorIndex={4} labelWidth={100} />
        <GeoCharts records={filtered} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={9} colSpan={2} />
      </div>
    </div>
  );
});
