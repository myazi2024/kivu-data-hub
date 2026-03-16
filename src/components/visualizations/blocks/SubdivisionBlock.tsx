import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, avgProcessingDays } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Scissors, TrendingUp, BarChart3, Users, DollarSign, Target, Ruler } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { exportRecordsToCSV } from '@/utils/csvExport';

interface Props { data: LandAnalyticsData; }

export const SubdivisionBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.subdivisionRequests, filter), [data.subdivisionRequests, filter]);
  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const byPurpose = useMemo(() => countBy(filtered, 'purpose_of_subdivision'), [filtered]);
  const byRequesterType = useMemo(() => countBy(filtered, 'requester_type'), [filtered]);
  const byPaymentStatus = useMemo(() => countBy(filtered, 'submission_payment_status'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  // Revenue trend by month
  const revenueTrend = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(r => {
      if (r.created_at && r.total_amount_usd > 0) {
        const d = new Date(r.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        map.set(key, (map.get(key) || 0) + r.total_amount_usd);
      }
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([k, value]) => {
      const [y, m] = k.split('-');
      const name = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('fr-FR', { year: '2-digit', month: 'short' });
      return { name, value: Math.round(value) };
    });
  }, [filtered]);

  // Distribution of number_of_lots
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

  // Surface distribution of parent parcels
  const surfaceDist = useMemo(() => {
    const buckets = [
      { name: '< 500 m²', min: 0, max: 500 },
      { name: '500-1000', min: 501, max: 1000 },
      { name: '1K-5K', min: 1001, max: 5000 },
      { name: '5K-10K', min: 5001, max: 10000 },
      { name: '> 10K m²', min: 10001, max: Infinity },
    ];
    const counts = new Array(buckets.length).fill(0);
    filtered.forEach(r => {
      const a = r.parent_parcel_area_sqm || 0;
      if (a <= 0) return;
      for (let i = 0; i < buckets.length; i++) {
        if (a >= buckets[i].min && a <= buckets[i].max) { counts[i]++; break; }
      }
    });
    return buckets.map((b, i) => ({ name: b.name, value: counts[i] })).filter(b => b.value > 0);
  }, [filtered]);

  const stats = useMemo(() => {
    const totalLots = filtered.reduce((s, r) => s + (r.number_of_lots || 0), 0);
    const approved = filtered.filter(r => r.status === 'approved').length;
    const avgLots = filtered.length > 0 ? Math.round(totalLots / filtered.length * 10) / 10 : 0;
    const avgDays = avgProcessingDays(filtered, 'created_at', 'reviewed_at');
    const totalSurface = filtered.reduce((s, r) => s + (r.parent_parcel_area_sqm || 0), 0);
    const totalRevenue = filtered.reduce((s, r) => s + (r.total_amount_usd || 0), 0);
    return { totalLots, approved, avgLots, avgDays, totalSurface, totalRevenue };
  }, [filtered]);

  const handleExport = useCallback(() => {
    exportRecordsToCSV(filtered, `lotissements-${new Date().toISOString().slice(0,10)}`, [
      'id', 'parcel_number', 'status', 'number_of_lots', 'purpose_of_subdivision', 'requester_type',
      'submission_payment_status', 'total_amount_usd', 'parent_parcel_area_sqm', 'province', 'ville', 'commune', 'created_at'
    ]);
  }, [filtered]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters
        data={data.subdivisionRequests} filter={filter} onChange={setFilter} onExport={handleExport}
        paymentStatusField="submission_payment_status"
      />
      <KpiGrid items={[
        { label: 'Total', value: filtered.length, cls: 'text-teal-600' },
        { label: 'Lots prévus', value: stats.totalLots, cls: 'text-blue-600' },
        { label: 'Moy. lots/dem.', value: stats.avgLots, cls: 'text-violet-600', tooltip: 'Nombre moyen de lots par demande' },
        { label: 'Approuvées', value: stats.approved, cls: 'text-emerald-600', tooltip: pct(stats.approved, filtered.length) },
        { label: 'Délai moy.', value: stats.avgDays > 0 ? `${stats.avgDays}j` : 'N/A', cls: 'text-rose-600', tooltip: 'Délai moyen de traitement' },
        { label: 'Surface tot.', value: stats.totalSurface > 0 ? `${(stats.totalSurface / 10000).toFixed(1)} ha` : 'N/A', cls: 'text-primary', tooltip: `${stats.totalSurface.toLocaleString()} m²` },
      ]} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ChartCard title="Statut" icon={Scissors} data={byStatus} type="pie" colorIndex={7} />
        <ChartCard title="Distribution lots" icon={BarChart3} data={lotsDistribution} type="bar-v" colorIndex={9} hidden={lotsDistribution.length === 0} />
        <ChartCard title="Objet lotissement" icon={Target} data={byPurpose} type="bar-h" colorIndex={0} labelWidth={100} hidden={byPurpose.length === 0} />
        <ChartCard title="Type demandeur" icon={Users} data={byRequesterType} type="donut" colorIndex={1} hidden={byRequesterType.length === 0} />
        <ChartCard title="Paiement" icon={DollarSign} data={byPaymentStatus} type="donut" colorIndex={2} hidden={byPaymentStatus.length === 0} />
        <ChartCard title="Surface parcelle mère" icon={Ruler} data={surfaceDist} type="bar-v" colorIndex={5} hidden={surfaceDist.length === 0} />
        <ChartCard title="Revenus/mois" icon={DollarSign} data={revenueTrend} type="area" colorIndex={2} hidden={revenueTrend.length < 2} />
        <GeoCharts records={filtered} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={7} colSpan={2} />
      </div>
    </div>
  );
});
