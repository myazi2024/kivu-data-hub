import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, VALID_LIFTING_STATUSES } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { ShieldCheck, Scale, TrendingUp, MessageSquare } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { exportRecordsToCSV } from '@/utils/csvExport';

interface Props { data: LandAnalyticsData; }

export const DisputeLiftingBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);

  const liftingDisputes = useMemo(() =>
    data.disputes.filter(d => d.lifting_status && VALID_LIFTING_STATUSES.includes(d.lifting_status)),
    [data.disputes]
  );
  const filtered = useMemo(() => applyFilters(liftingDisputes, filter), [liftingDisputes, filter]);

  const byLiftingStatus = useMemo(() => countBy(filtered, 'lifting_status'), [filtered]);
  const byResolutionLevel = useMemo(() => countBy(filtered, 'resolution_level'), [filtered]);
  const byNature = useMemo(() => countBy(filtered, 'dispute_nature'), [filtered]);
  const byLiftingReason = useMemo(() => countBy(filtered.filter(r => r.lifting_reason), 'lifting_reason'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  const stats = useMemo(() => {
    const approved = filtered.filter(d => d.lifting_status === 'approved').length;
    const pending = filtered.filter(d => ['pending', 'demande_levee', 'in_review'].includes(d.lifting_status)).length;
    const rejected = filtered.filter(d => d.lifting_status === 'rejected').length;
    return { approved, pending, rejected };
  }, [filtered]);

  const liftingSuccessTrend = useMemo(() => {
    const map = new Map<string, { total: number; approved: number }>();
    filtered.forEach(d => {
      if (!d.created_at) return;
      const dt = new Date(d.created_at);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, { total: 0, approved: 0 });
      const e = map.get(key)!;
      e.total++;
      if (d.lifting_status === 'approved') e.approved++;
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, d]) => {
      const [y, m] = key.split('-');
      const name = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('fr-FR', { year: '2-digit', month: 'short' });
      return { name, value: d.total > 0 ? Math.round((d.approved / d.total) * 100) : 0 };
    });
  }, [filtered]);

  const handleExport = useCallback(() => {
    exportRecordsToCSV(filtered, `levees-litiges-${new Date().toISOString().slice(0,10)}`, [
      'id', 'parcel_number', 'dispute_nature', 'lifting_status', 'lifting_reason', 'resolution_level',
      'lifting_request_reference', 'province', 'ville', 'commune', 'created_at'
    ]);
  }, [filtered]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={liftingDisputes} filter={filter} onChange={setFilter} onExport={handleExport} hidePaymentStatus />
      <KpiGrid items={[
        { label: 'Total levées', value: filtered.length, cls: 'text-sky-600' },
        { label: 'Approuvées', value: stats.approved, cls: 'text-emerald-600', tooltip: pct(stats.approved, filtered.length) },
        { label: 'En attente', value: stats.pending, cls: 'text-amber-600', tooltip: pct(stats.pending, filtered.length) },
        { label: 'Rejetées', value: stats.rejected, cls: 'text-red-600', tooltip: pct(stats.rejected, filtered.length) },
        { label: 'Taux réussite', value: pct(stats.approved, filtered.length), cls: 'text-purple-600', tooltip: 'Pourcentage de levées approuvées' },
      ]} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ChartCard title="Statut levée" icon={ShieldCheck} data={byLiftingStatus} type="pie" colorIndex={9} />
        <ChartCard title="Niveau résolution" icon={Scale} iconColor="text-purple-500" data={byResolutionLevel} type="bar-h" colorIndex={9} labelWidth={100} />
        <ChartCard title="Nature litige" data={byNature} type="bar-h" colorIndex={4} labelWidth={100} />
        <ChartCard title="Motif de levée" icon={MessageSquare} data={byLiftingReason} type="bar-h" colorIndex={6} labelWidth={120} hidden={byLiftingReason.length === 0} />
        <GeoCharts records={filtered} />
        <ChartCard title="Taux réussite %" icon={TrendingUp} data={liftingSuccessTrend} type="area" colorIndex={2} colSpan={2} hidden={liftingSuccessTrend.length < 2} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={9} colSpan={2} />
      </div>
    </div>
  );
});
