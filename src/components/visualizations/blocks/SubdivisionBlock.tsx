import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, avgProcessingDays } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Scissors, TrendingUp, BarChart3 } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { exportRecordsToCSV } from '@/utils/csvExport';

interface Props { data: LandAnalyticsData; }

export const SubdivisionBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.subdivisionRequests, filter), [data.subdivisionRequests, filter]);
  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  // #24: Distribution of number_of_lots
  const lotsDistribution = useMemo(() => {
    const buckets = [
      { name: '2 lots', min: 0, max: 2 },
      { name: '3-5 lots', min: 3, max: 5 },
      { name: '6-10 lots', min: 6, max: 10 },
      { name: '11-20 lots', min: 11, max: 20 },
      { name: '> 20 lots', min: 21, max: Infinity },
    ];
    const counts = new Array(buckets.length).fill(0);
    filtered.forEach(r => {
      const n = r.number_of_lots || 0;
      if (n <= 0) return;
      for (let i = 0; i < buckets.length; i++) {
        if (n >= buckets[i].min && n <= buckets[i].max) { counts[i]++; break; }
      }
    });
    return buckets.map((b, i) => ({ name: b.name, value: counts[i] })).filter(b => b.value > 0);
  }, [filtered]);

  const stats = useMemo(() => {
    const totalLots = filtered.reduce((s, r) => s + (r.number_of_lots || 0), 0);
    const approved = filtered.filter(r => r.status === 'approved').length;
    const avgLots = filtered.length > 0 ? Math.round(totalLots / filtered.length * 10) / 10 : 0;
    const avgDays = avgProcessingDays(filtered, 'created_at', 'reviewed_at');
    return { totalLots, approved, avgLots, avgDays };
  }, [filtered]);

  const handleExport = useCallback(() => {
    exportRecordsToCSV(filtered, `lotissements-${new Date().toISOString().slice(0,10)}`, [
      'id', 'parcel_number', 'status', 'number_of_lots', 'province', 'ville', 'commune', 'created_at'
    ]);
  }, [filtered]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.subdivisionRequests} filter={filter} onChange={setFilter} onExport={handleExport} />
      <KpiGrid items={[
        { label: 'Total', value: filtered.length, cls: 'text-teal-600' },
        { label: 'Lots prévus', value: stats.totalLots, cls: 'text-blue-600' },
        { label: 'Moy. lots/dem.', value: stats.avgLots, cls: 'text-violet-600', tooltip: 'Nombre moyen de lots par demande' },
        { label: 'Approuvées', value: stats.approved, cls: 'text-emerald-600', tooltip: pct(stats.approved, filtered.length) },
        { label: 'Délai moy.', value: stats.avgDays > 0 ? `${stats.avgDays}j` : 'N/A', cls: 'text-rose-600', tooltip: 'Délai moyen de traitement' },
      ]} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ChartCard title="Statut" icon={Scissors} data={byStatus} type="pie" colorIndex={7} />
        {/* #24: Lots distribution histogram */}
        <ChartCard title="Distribution lots" icon={BarChart3} data={lotsDistribution} type="bar-v" colorIndex={9} hidden={lotsDistribution.length === 0} />
        <GeoCharts records={filtered} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={7} colSpan={2} />
      </div>
    </div>
  );
});
