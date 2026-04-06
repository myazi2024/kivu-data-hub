import React, { useState, useMemo, memo, useContext, useEffect } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, CHART_COLORS, avgProcessingDays, buildFilterLabel, sumByMonth } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { ArrowRightLeft, TrendingUp, Users, DollarSign } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, StackedBarCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { MapProvinceContext, VilleFilterContext, CommuneFilterContext, QuartierFilterContext } from '../filters/AnalyticsFilters';
import { generateInsight, generateStackedInsight } from '@/utils/chartInsights';
import { useTabChartsConfig, useTabFilterConfig, ANALYTICS_TABS_REGISTRY } from '@/hooks/useAnalyticsChartsConfig';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'mutations';
const defaultItems = [...ANALYTICS_TABS_REGISTRY[TAB_KEY].kpis, ...ANALYTICS_TABS_REGISTRY[TAB_KEY].charts];

export const MutationBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const mapProvince = useContext(MapProvinceContext);
  const mapVille = useContext(VilleFilterContext);
  const mapCommune = useContext(CommuneFilterContext);
  const mapQuartier = useContext(QuartierFilterContext);
  useEffect(() => { setFilter(f => ({ ...f, province: mapProvince || undefined, ville: mapVille || undefined, commune: mapCommune || undefined, quartier: mapQuartier || undefined })); }, [mapProvince, mapVille, mapCommune, mapQuartier]);
  const filterLabel = useMemo(() => buildFilterLabel(filter), [filter]);
  const { isChartVisible, getChartConfig } = useTabChartsConfig(TAB_KEY, defaultItems);
  const filterConfig = useTabFilterConfig(TAB_KEY);
  const filtered = useMemo(() => applyFilters(data.mutationRequests, filter), [data.mutationRequests, filter]);
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

  // New: market value distribution
  const byMarketValue = useMemo(() => {
    const buckets: Record<string, number> = { '< $10k': 0, '$10k–$50k': 0, '$50k–$100k': 0, '$100k–$500k': 0, '> $500k': 0 };
    filtered.forEach(r => {
      const v = (r as any).market_value_usd ?? (r.proposed_changes as any)?.market_value_usd;
      if (!v || Number(v) <= 0) return;
      const val = Number(v);
      if (val < 10000) buckets['< $10k']++;
      else if (val < 50000) buckets['$10k–$50k']++;
      else if (val < 100000) buckets['$50k–$100k']++;
      else if (val < 500000) buckets['$100k–$500k']++;
      else buckets['> $500k']++;
    });
    return Object.entries(buckets).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // New: title age distribution
  const byTitleAge = useMemo(() => {
    const counts: Record<string, number> = { '< 10 ans': 0, '≥ 10 ans': 0, 'Non renseigné': 0 };
    filtered.forEach(r => {
      const age = (r as any).title_age ?? (r.proposed_changes as any)?.title_age;
      if (age === 'less_than_10') counts['< 10 ans']++;
      else if (age === '10_or_more') counts['≥ 10 ans']++;
      else counts['Non renseigné']++;
    });
    return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // New: late fees vs no late fees
  const byLateFees = useMemo(() => {
    let withLate = 0, withoutLate = 0;
    filtered.forEach(r => {
      const lateFee = (r as any).late_fee_amount ?? (r.proposed_changes as any)?.late_fees?.fee;
      if (lateFee && Number(lateFee) > 0) withLate++;
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


  const t = (key: string, fallback: string) => getChartConfig(key)?.custom_title || fallback;
  const v = isChartVisible;

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: t('kpi-total', 'Total'), value: filtered.length, cls: 'text-orange-600' },
    { key: 'kpi-approved', label: t('kpi-approved', 'Approuvées'), value: stats.approved, cls: 'text-emerald-600', tooltip: pct(stats.approved, filtered.length) },
    { key: 'kpi-pending', label: t('kpi-pending', 'En attente'), value: stats.pending, cls: 'text-amber-600', tooltip: pct(stats.pending, filtered.length) },
    { key: 'kpi-rejected', label: t('kpi-rejected', 'Rejetées'), value: stats.rejected, cls: 'text-red-600', tooltip: pct(stats.rejected, filtered.length) },
    { key: 'kpi-delay', label: t('kpi-delay', 'Délai moy.'), value: stats.avgDays > 0 ? `${stats.avgDays}j` : 'N/A', cls: 'text-violet-600', tooltip: 'Délai moyen de traitement' },
    { key: 'kpi-revenue', label: t('kpi-revenue', 'Revenus'), value: `$${stats.paidRevenue.toLocaleString()}`, cls: 'text-blue-600', tooltip: `Total facturé: $${stats.totalRevenue.toLocaleString()}` },
  ].filter(k => v(k.key)), [filtered, stats, v, getChartConfig]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.mutationRequests} filter={filter} onChange={setFilter} hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} statusField={filterConfig.statusField} />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {v('status') && <ChartCard title={t('status', 'Statut')} icon={ArrowRightLeft} data={byStatus} type="pie" colorIndex={6}
          insight={generateInsight(byStatus, 'pie', 'les statuts de mutation')} />}
        {v('mutation-type') && <ChartCard title={t('mutation-type', 'Type mutation')} data={byType} type="bar-h" colorIndex={6} labelWidth={100}
          insight={generateInsight(byType, 'bar-h', 'les types de mutation')} />}
        {v('requester-type') && <ChartCard title={t('requester-type', 'Type demandeur')} icon={Users} data={byRequesterType} type="donut" colorIndex={1}
          insight={generateInsight(byRequesterType, 'donut', 'les demandeurs')} />}
        {v('payment') && <ChartCard title={t('payment', 'Paiement')} icon={DollarSign} data={byPaymentStatus} type="donut" colorIndex={2}
          insight={generateInsight(byPaymentStatus, 'donut', 'les paiements')} />}
        {v('type-status') && <StackedBarCard title={t('type-status', 'Type × Statut')} data={typeStatusCross} bars={[
          { dataKey: 'approved', name: 'Approuvées', color: CHART_COLORS[2] },
          { dataKey: 'pending', name: 'En attente', color: CHART_COLORS[3] },
          { dataKey: 'rejected', name: 'Rejetées', color: CHART_COLORS[4] },
        ]} layout="vertical" labelWidth={90} hidden={typeStatusCross.length === 0}
          insight={generateStackedInsight(typeStatusCross, [
            { dataKey: 'approved', name: 'Approuvées' },
            { dataKey: 'pending', name: 'En attente' },
            { dataKey: 'rejected', name: 'Rejetées' },
          ], 'croisement type/statut')} />}
        {v('market-value') && <ChartCard title={t('market-value', 'Valeur vénale')} icon={DollarSign} data={byMarketValue} type="bar-v" colorIndex={5} hidden={byMarketValue.length === 0}
          insight={generateInsight(byMarketValue, 'bar-v', 'la valeur vénale des mutations')} />}
        {v('title-age') && <ChartCard title={t('title-age', 'Ancienneté titre')} data={byTitleAge} type="pie" colorIndex={3} hidden={byTitleAge.length === 0}
          insight={generateInsight(byTitleAge, 'pie', "l'ancienneté des titres")} />}
        {v('late-fees') && <ChartCard title={t('late-fees', 'Retard mutation')} data={byLateFees} type="pie" colorIndex={4} hidden={byLateFees.length === 0}
          insight={generateInsight(byLateFees, 'pie', 'les retards de mutation')} />}
        {v('revenue-trend') && <ChartCard title={t('revenue-trend', 'Revenus/mois')} icon={TrendingUp} data={revenueTrend} type="area" colorIndex={2} hidden={revenueTrend.length < 2}
          insight={generateInsight(revenueTrend, 'area', 'les revenus de mutation')} />}
        {v('geo') && <GeoCharts records={filtered} />}
        {v('evolution') && <ChartCard title={t('evolution', 'Évolution')} icon={TrendingUp} data={trend} type="area" colorIndex={6} colSpan={2}
          insight={generateInsight(trend, 'area', 'les demandes de mutation')} />}
      </div>
    </div>
    </FilterLabelContext.Provider>
  );
});
