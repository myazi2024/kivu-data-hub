import React, { useState, useMemo, memo, useContext, useEffect } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, CHART_COLORS, buildFilterLabel } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Receipt, DollarSign, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { MapProvinceContext } from '../filters/AnalyticsFilters';
import { generateInsight } from '@/utils/chartInsights';
import { useTabChartsConfig, ANALYTICS_TABS_REGISTRY } from '@/hooks/useAnalyticsChartsConfig';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'taxes';
const defaultItems = [...ANALYTICS_TABS_REGISTRY[TAB_KEY].kpis, ...ANALYTICS_TABS_REGISTRY[TAB_KEY].charts];

export const TaxesBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const mapProvince = useContext(MapProvinceContext);
  useEffect(() => { setFilter(f => ({ ...defaultFilter, province: mapProvince || undefined })); }, [mapProvince]);
  const filterLabel = useMemo(() => buildFilterLabel(filter), [filter]);
  const { isChartVisible, getChartConfig } = useTabChartsConfig(TAB_KEY, defaultItems);
  const filtered = useMemo(() => applyFilters(data.taxHistory, filter), [data.taxHistory, filter]);

  const byStatus = useMemo(() => countBy(filtered, 'payment_status'), [filtered]);
  const byYear = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(t => { const y = String(t.tax_year || '(Non renseigné)'); map.set(y, (map.get(y) || 0) + 1); });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);
  const trend = useMemo(() => trendByMonth(filtered, 'payment_date'), [filtered]);

  const amountBrackets = useMemo(() => {
    const brackets = [
      { name: '< 50 $', min: 0, max: 50 },
      { name: '50 – 200 $', min: 50, max: 200 },
      { name: '200 – 500 $', min: 200, max: 500 },
      { name: '> 500 $', min: 500, max: Infinity },
    ];
    return brackets.map(b => ({
      name: b.name,
      value: filtered.filter(t => (t.amount_usd || 0) >= b.min && (t.amount_usd || 0) < b.max).length,
    })).filter(b => b.value > 0);
  }, [filtered]);

  const totalAmount = filtered.reduce((s, t) => s + (t.amount_usd || 0), 0);
  const paid = filtered.filter(t => t.payment_status === 'paid' || t.payment_status === 'payé').length;
  const pendingCount = filtered.filter(t => t.payment_status === 'pending' || t.payment_status === 'en_attente' || t.payment_status === 'unpaid').length;

  const dt = (key: string, fallback: string) => getChartConfig(key)?.custom_title || fallback;

  const kpis = [
    { key: 'kpi-total', label: dt('kpi-total', 'Total déclarations'), value: filtered.length, icon: Receipt },
    { key: 'kpi-revenue', label: dt('kpi-revenue', 'Montant total'), value: `${(totalAmount / 1000).toFixed(0)}k $`, icon: DollarSign },
    { key: 'kpi-pending', label: dt('kpi-pending', 'En attente'), value: pendingCount, icon: Clock },
    { key: 'kpi-approved', label: dt('kpi-approved', 'Payées'), value: paid, icon: CheckCircle },
  ].filter(k => isChartVisible(k.key));

  return (
    <FilterLabelContext.Provider value={filterLabel}>
      <div className="space-y-3">
        <AnalyticsFilters data={data.taxHistory} filter={filter} onChange={setFilter} />
        <KpiGrid kpis={kpis} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {isChartVisible('status') && <ChartCard title={dt('status', 'Statut')} data={byStatus} config={getChartConfig('status')} insight={generateInsight(byStatus, dt('status', 'Statut'))} />}
          {isChartVisible('fiscal-year') && <ChartCard title={dt('fiscal-year', 'Exercice fiscal')} data={byYear} config={getChartConfig('fiscal-year')} insight={generateInsight(byYear, dt('fiscal-year', 'Exercice fiscal'))} />}
          {isChartVisible('amount-range') && <ChartCard title={dt('amount-range', 'Tranche montant')} data={amountBrackets} config={getChartConfig('amount-range')} insight={generateInsight(amountBrackets, dt('amount-range', 'Tranche montant'))} />}
          {isChartVisible('geo') && <GeoCharts data={filtered} title={dt('geo', 'Géographie')} />}
          {isChartVisible('evolution') && <ChartCard title={dt('evolution', 'Évolution')} data={trend} config={getChartConfig('evolution')} className="md:col-span-2" insight={generateInsight(trend, dt('evolution', 'Évolution'))} />}
        </div>
      </div>
    </FilterLabelContext.Provider>
  );
});

TaxesBlock.displayName = 'TaxesBlock';
