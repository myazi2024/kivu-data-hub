import React, { useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { countBy, trendByMonth, CHART_COLORS, avgProcessingDays, sumByMonth } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { ArrowRightLeft, TrendingUp, Users, DollarSign } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, StackedBarCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { generateInsight, generateStackedInsight } from '@/utils/chartInsights';
import { useBlockFilter } from '@/hooks/useBlockFilter';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'mutations';

export const MutationBlock: React.FC<Props> = memo(({ data }) => {
  const { filter, setFilter, filterLabel, filtered, filterConfig, v, ct, cx, ty, ord, exportCSV } = useBlockFilter(TAB_KEY, data.mutationRequests);

  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const byType = useMemo(() => countBy(filtered, 'mutation_type'), [filtered]);
  const byRequesterType = useMemo(() => countBy(filtered, 'requester_type'), [filtered]);
  const byPaymentStatus = useMemo(() => countBy(filtered, 'payment_status'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

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

  const revenueTrend = useMemo(() => sumByMonth(filtered), [filtered]);

  const byMarketValue = useMemo(() => {
    const buckets: Record<string, number> = { '< $10k': 0, '$10k–$50k': 0, '$50k–$100k': 0, '$100k–$500k': 0, '> $500k': 0 };
    filtered.forEach(r => {
      const val = Number(r.market_value_usd || 0);
      if (val <= 0) return;
      if (val < 10000) buckets['< $10k']++;
      else if (val < 50000) buckets['$10k–$50k']++;
      else if (val < 100000) buckets['$50k–$100k']++;
      else if (val < 500000) buckets['$100k–$500k']++;
      else buckets['> $500k']++;
    });
    return Object.entries(buckets).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const byTitleAge = useMemo(() => {
    const counts: Record<string, number> = { '< 10 ans': 0, '≥ 10 ans': 0, 'Non renseigné': 0 };
    filtered.forEach(r => {
      const age = r.title_age;
      if (age === 'less_than_10') counts['< 10 ans']++;
      else if (age === '10_or_more') counts['≥ 10 ans']++;
      else counts['Non renseigné']++;
    });
    return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const byLateFees = useMemo(() => {
    let withLate = 0, withoutLate = 0;
    filtered.forEach(r => {
      const lateFee = Number(r.late_fee_amount || 0);
      if (lateFee > 0) withLate++;
      else withoutLate++;
    });
    return [
      { name: 'Avec retard', value: withLate },
      { name: 'Sans retard', value: withoutLate },
    ].filter(d => d.value > 0);
  }, [filtered]);

  const stats = useMemo(() => {
    const approved = filtered.filter(r => r.status === 'approved').length;
    const pending = filtered.filter(r => r.status === 'pending').length;
    const rejected = filtered.filter(r => r.status === 'rejected').length;
    const avgDays = avgProcessingDays(filtered, 'created_at', 'reviewed_at');
    const totalRevenue = filtered.reduce((s, r) => s + (r.total_amount_usd || 0), 0);
    const paidRevenue = filtered.filter(r => r.payment_status === 'paid').reduce((s, r) => s + (r.total_amount_usd || 0), 0);
    return { approved, pending, rejected, avgDays, totalRevenue, paidRevenue };
  }, [filtered]);

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: ct('kpi-total', 'Total'), value: filtered.length, cls: 'text-orange-600' },
    { key: 'kpi-approved', label: ct('kpi-approved', 'Approuvées'), value: stats.approved, cls: 'text-emerald-600', tooltip: pct(stats.approved, filtered.length) },
    { key: 'kpi-pending', label: ct('kpi-pending', 'En attente'), value: stats.pending, cls: 'text-amber-600', tooltip: pct(stats.pending, filtered.length) },
    { key: 'kpi-rejected', label: ct('kpi-rejected', 'Rejetées'), value: stats.rejected, cls: 'text-red-600', tooltip: pct(stats.rejected, filtered.length) },
    { key: 'kpi-delay', label: ct('kpi-delay', 'Délai moy.'), value: stats.avgDays > 0 ? `${stats.avgDays}j` : 'N/A', cls: 'text-violet-600', tooltip: 'Délai moyen de traitement' },
    { key: 'kpi-revenue', label: ct('kpi-revenue', 'Revenus'), value: `$${stats.paidRevenue.toLocaleString()}`, cls: 'text-blue-600', tooltip: `Total facturé: $${stats.totalRevenue.toLocaleString()}` },
  ].filter(k => v(k.key)), [filtered, stats, v, ct]);

  const chartDefs = useMemo(() => [
    { key: 'status', el: () => <ChartCard title={ct('status', 'Statut')} icon={ArrowRightLeft} data={byStatus} type={ty('status', 'pie')} colorIndex={6}
      insight={generateInsight(byStatus, 'pie', 'les statuts de mutation')} crossVariables={cx('status')} rawRecords={filtered} groupField="status" /> },
    { key: 'mutation-type', el: () => <ChartCard title={ct('mutation-type', 'Type mutation')} data={byType} type={ty('mutation-type', 'bar-h')} colorIndex={6} labelWidth={100}
      insight={generateInsight(byType, 'bar-h', 'les types de mutation')} crossVariables={cx('mutation-type')} rawRecords={filtered} groupField="mutation_type" /> },
    { key: 'requester-type', el: () => <ChartCard title={ct('requester-type', 'Type demandeur')} icon={Users} data={byRequesterType} type={ty('requester-type', 'donut')} colorIndex={1}
      insight={generateInsight(byRequesterType, 'donut', 'les demandeurs')} crossVariables={cx('requester-type')} rawRecords={filtered} groupField="requester_type" /> },
    { key: 'payment', el: () => <ChartCard title={ct('payment', 'Paiement')} icon={DollarSign} data={byPaymentStatus} type={ty('payment', 'donut')} colorIndex={2}
      insight={generateInsight(byPaymentStatus, 'donut', 'les paiements')} crossVariables={cx('payment')} rawRecords={filtered} groupField="payment_status" /> },
    { key: 'type-status', el: () => <StackedBarCard title={ct('type-status', 'Type × Statut')} data={typeStatusCross} bars={[
      { dataKey: 'approved', name: 'Approuvées', color: CHART_COLORS[2] },
      { dataKey: 'pending', name: 'En attente', color: CHART_COLORS[3] },
      { dataKey: 'rejected', name: 'Rejetées', color: CHART_COLORS[4] },
    ]} layout="vertical" labelWidth={90} hidden={typeStatusCross.length === 0}
      insight={generateStackedInsight(typeStatusCross, [
        { dataKey: 'approved', name: 'Approuvées' },
        { dataKey: 'pending', name: 'En attente' },
        { dataKey: 'rejected', name: 'Rejetées' },
      ], 'croisement type/statut')} /> },
    { key: 'market-value', el: () => <ChartCard title={ct('market-value', 'Valeur vénale')} icon={DollarSign} data={byMarketValue} type={ty('market-value', 'bar-v')} colorIndex={5} hidden={byMarketValue.length === 0}
      insight={generateInsight(byMarketValue, 'bar-v', 'la valeur vénale des mutations')} crossVariables={cx('market-value')} rawRecords={filtered} groupField="market_value_usd" /> },
    { key: 'title-age', el: () => <ChartCard title={ct('title-age', 'Ancienneté titre')} data={byTitleAge} type={ty('title-age', 'pie')} colorIndex={3} hidden={byTitleAge.length === 0}
      insight={generateInsight(byTitleAge, 'pie', "l'ancienneté des titres")} crossVariables={cx('title-age')} rawRecords={filtered} groupField="title_age" /> },
    { key: 'late-fees', el: () => <ChartCard title={ct('late-fees', 'Retard mutation')} data={byLateFees} type={ty('late-fees', 'pie')} colorIndex={4} hidden={byLateFees.length === 0}
      insight={generateInsight(byLateFees, 'pie', 'les retards de mutation')} crossVariables={cx('late-fees')} rawRecords={filtered} groupField="late_fee_amount" /> },
    { key: 'revenue-trend', el: () => <ChartCard title={ct('revenue-trend', 'Revenus/mois')} icon={TrendingUp} data={revenueTrend} type={ty('revenue-trend', 'area')} colorIndex={2} hidden={revenueTrend.length < 2}
      insight={generateInsight(revenueTrend, 'area', 'les revenus de mutation')} crossVariables={cx('revenue-trend')} rawRecords={filtered} groupField="mutation_type" /> },
    { key: 'geo', el: () => <GeoCharts records={filtered} /> },
    { key: 'evolution', el: () => <ChartCard title={ct('evolution', 'Évolution')} icon={TrendingUp} data={trend} type={ty('evolution', 'area')} colorIndex={6} colSpan={2}
      insight={generateInsight(trend, 'area', 'les demandes de mutation')} /> },
  ].filter(d => v(d.key)).sort((a, b) => ord(a.key) - ord(b.key)), [filtered, byStatus, byType, byRequesterType, byPaymentStatus, typeStatusCross, byMarketValue, byTitleAge, byLateFees, revenueTrend, trend, v, ct, cx, ty, ord]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.mutationRequests} filter={filter} onChange={setFilter} hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} statusField={filterConfig.statusField} onExport={() => exportCSV(['parcel_number', 'province', 'mutation_type', 'requester_type', 'status', 'total_amount_usd', 'market_value_usd', 'created_at'])} />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {chartDefs.map(d => <React.Fragment key={d.key}>{d.el()}</React.Fragment>)}
      </div>
    </div>
    </FilterLabelContext.Provider>
  );
});
