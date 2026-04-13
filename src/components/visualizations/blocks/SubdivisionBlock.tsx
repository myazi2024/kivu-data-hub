import React, { useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { countBy, trendByMonth, avgProcessingDays, sumByMonth } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Scissors, TrendingUp, BarChart3, Users, DollarSign, Target, Ruler } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { generateInsight } from '@/utils/chartInsights';
import { useBlockFilter } from '@/hooks/useBlockFilter';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'subdivision';

export const SubdivisionBlock: React.FC<Props> = memo(({ data }) => {
  const { filter, setFilter, filterLabel, filtered, filterConfig, v, ct, cx, ty, ord } = useBlockFilter(TAB_KEY, data.subdivisionRequests);

  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const byPurpose = useMemo(() => countBy(filtered, 'purpose_of_subdivision'), [filtered]);
  const byRequesterType = useMemo(() => countBy(filtered, 'requester_type'), [filtered]);
  const byPaymentStatus = useMemo(() => countBy(filtered, 'submission_payment_status'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);
  const revenueTrend = useMemo(() => sumByMonth(filtered), [filtered]);

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

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: ct('kpi-total', 'Total'), value: filtered.length, cls: 'text-teal-600' },
    { key: 'kpi-lots', label: ct('kpi-lots', 'Lots prévus'), value: stats.totalLots, cls: 'text-blue-600' },
    { key: 'kpi-avg-lots', label: ct('kpi-avg-lots', 'Moy. lots/dem.'), value: stats.avgLots, cls: 'text-violet-600', tooltip: 'Nombre moyen de lots par demande' },
    { key: 'kpi-approved', label: ct('kpi-approved', 'Approuvées'), value: stats.approved, cls: 'text-emerald-600', tooltip: pct(stats.approved, filtered.length) },
    { key: 'kpi-delay', label: ct('kpi-delay', 'Délai moy.'), value: stats.avgDays > 0 ? `${stats.avgDays}j` : 'N/A', cls: 'text-rose-600', tooltip: 'Délai moyen de traitement' },
    { key: 'kpi-surface', label: ct('kpi-surface', 'Surface tot.'), value: stats.totalSurface > 0 ? `${(stats.totalSurface / 10000).toFixed(1)} ha` : 'N/A', cls: 'text-primary', tooltip: `${stats.totalSurface.toLocaleString()} m²` },
  ].filter(k => v(k.key)), [filtered, stats, v, ct]);

  const chartDefs = useMemo(() => [
    { key: 'status', el: () => <ChartCard title={ct('status', 'Statut')} icon={Scissors} data={byStatus} type={ty('status', 'pie')} colorIndex={7}
      insight={generateInsight(byStatus, 'pie', 'les statuts de lotissement')} crossVariables={cx('status')} rawRecords={filtered} groupField="status" /> },
    { key: 'lots-distribution', el: () => <ChartCard title={ct('lots-distribution', 'Distribution lots')} icon={BarChart3} data={lotsDistribution} type={ty('lots-distribution', 'bar-v')} colorIndex={9} hidden={lotsDistribution.length === 0}
      insight={generateInsight(lotsDistribution, 'bar-v', 'la distribution des lots')} crossVariables={cx('lots-distribution')} rawRecords={filtered} groupField="number_of_lots" /> },
    { key: 'purpose', el: () => <ChartCard title={ct('purpose', 'Objet lotissement')} icon={Target} data={byPurpose} type={ty('purpose', 'bar-h')} colorIndex={0} labelWidth={100} hidden={byPurpose.length === 0}
      insight={generateInsight(byPurpose, 'bar-h', 'les objets de lotissement')} crossVariables={cx('purpose')} rawRecords={filtered} groupField="purpose_of_subdivision" /> },
    { key: 'requester-type', el: () => <ChartCard title={ct('requester-type', 'Type demandeur')} icon={Users} data={byRequesterType} type={ty('requester-type', 'donut')} colorIndex={1} hidden={byRequesterType.length === 0}
      insight={generateInsight(byRequesterType, 'donut', 'les demandeurs')} crossVariables={cx('requester-type')} rawRecords={filtered} groupField="requester_type" /> },
    { key: 'payment', el: () => <ChartCard title={ct('payment', 'Paiement')} icon={DollarSign} data={byPaymentStatus} type={ty('payment', 'donut')} colorIndex={2} hidden={byPaymentStatus.length === 0}
      insight={generateInsight(byPaymentStatus, 'donut', 'les paiements')} crossVariables={cx('payment')} rawRecords={filtered} groupField="submission_payment_status" /> },
    { key: 'surface', el: () => <ChartCard title={ct('surface', 'Surface parcelle mère')} icon={Ruler} data={surfaceDist} type={ty('surface', 'bar-v')} colorIndex={5} hidden={surfaceDist.length === 0}
      insight={generateInsight(surfaceDist, 'bar-v', 'les surfaces des parcelles mères')} crossVariables={cx('surface')} rawRecords={filtered} groupField="parent_parcel_area_sqm" /> },
    { key: 'revenue-trend', el: () => <ChartCard title={ct('revenue-trend', 'Revenus/mois')} icon={DollarSign} data={revenueTrend} type={ty('revenue-trend', 'area')} colorIndex={2} hidden={revenueTrend.length < 2}
      insight={generateInsight(revenueTrend, 'area', 'les revenus de lotissement')} /> },
    { key: 'geo', el: () => <GeoCharts records={filtered} /> },
    { key: 'evolution', el: () => <ChartCard title={ct('evolution', 'Évolution')} icon={TrendingUp} data={trend} type={ty('evolution', 'area')} colorIndex={7} colSpan={2}
      insight={generateInsight(trend, 'area', 'les demandes de lotissement')} /> },
  ].filter(d => v(d.key)).sort((a, b) => ord(a.key) - ord(b.key)), [filtered, byStatus, lotsDistribution, byPurpose, byRequesterType, byPaymentStatus, surfaceDist, revenueTrend, trend, v, ct, cx, ty, ord]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.subdivisionRequests} filter={filter} onChange={setFilter} hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} statusField={filterConfig.statusField} />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {chartDefs.map(d => <React.Fragment key={d.key}>{d.el()}</React.Fragment>)}
      </div>
    </div>
    </FilterLabelContext.Provider>
  );
});
