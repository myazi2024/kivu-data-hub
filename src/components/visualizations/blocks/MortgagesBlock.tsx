import React, { useState, useMemo, memo, useContext, useEffect } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, CHART_COLORS, buildFilterLabel } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Landmark, TrendingUp, DollarSign, Clock } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { MapProvinceContext } from '../filters/AnalyticsFilters';
import { generateInsight } from '@/utils/chartInsights';
import { useTabChartsConfig, ANALYTICS_TABS_REGISTRY } from '@/hooks/useAnalyticsChartsConfig';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'mortgages';
const defaultItems = [...ANALYTICS_TABS_REGISTRY[TAB_KEY].kpis, ...ANALYTICS_TABS_REGISTRY[TAB_KEY].charts];

export const MortgagesBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const mapProvince = useContext(MapProvinceContext);
  useEffect(() => { setFilter(f => ({ ...defaultFilter, province: mapProvince || undefined })); }, [mapProvince]);
  const filterLabel = useMemo(() => buildFilterLabel(filter), [filter]);
  const { isChartVisible, getChartConfig } = useTabChartsConfig(TAB_KEY, defaultItems);
  const filtered = useMemo(() => applyFilters(data.mortgages, filter), [data.mortgages, filter]);

  const byCreditorType = useMemo(() => countBy(filtered, 'creditor_type'), [filtered]);
  const byStatus = useMemo(() => countBy(filtered, 'mortgage_status'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered, 'contract_date'), [filtered]);

  const amountBrackets = useMemo(() => {
    const brackets = [
      { name: '< 5 000 $', min: 0, max: 5000 },
      { name: '5 000 – 20 000 $', min: 5000, max: 20000 },
      { name: '20 000 – 50 000 $', min: 20000, max: 50000 },
      { name: '50 000 – 100 000 $', min: 50000, max: 100000 },
      { name: '> 100 000 $', min: 100000, max: Infinity },
    ];
    return brackets.map(b => ({
      name: b.name,
      value: filtered.filter(m => (m.mortgage_amount_usd || 0) >= b.min && (m.mortgage_amount_usd || 0) < b.max).length,
    })).filter(b => b.value > 0);
  }, [filtered]);

  const durationBrackets = useMemo(() => {
    const brackets = [
      { name: '≤ 12 mois', min: 0, max: 13 },
      { name: '13–36 mois', min: 13, max: 37 },
      { name: '37–60 mois', min: 37, max: 61 },
      { name: '> 60 mois', min: 61, max: Infinity },
    ];
    return brackets.map(b => ({
      name: b.name,
      value: filtered.filter(m => (m.duration_months || 0) >= b.min && (m.duration_months || 0) < b.max).length,
    })).filter(b => b.value > 0);
  }, [filtered]);

  const active = filtered.filter(m => m.mortgage_status === 'active').length;
  const paid = filtered.filter(m => m.mortgage_status === 'paid' || m.mortgage_status === 'soldée').length;
  const totalAmount = filtered.reduce((s, m) => s + (m.mortgage_amount_usd || 0), 0);

  const dt = (key: string, fallback: string) => getChartConfig(key)?.custom_title || fallback;

  const kpis = [
    { key: 'kpi-total', label: dt('kpi-total', 'Total'), value: filtered.length, icon: Landmark },
    { key: 'kpi-active', label: dt('kpi-active', 'Actives'), value: active, icon: TrendingUp },
    { key: 'kpi-paid', label: dt('kpi-paid', 'Soldées'), value: paid, icon: Clock },
    { key: 'kpi-amount', label: dt('kpi-amount', 'Montant total'), value: `${(totalAmount / 1000).toFixed(0)}k $`, icon: DollarSign },
  ].filter(k => isChartVisible(k.key));

  return (
    <FilterLabelContext.Provider value={filterLabel}>
      <div className="space-y-3">
        <AnalyticsFilters data={data.mortgages} filter={filter} onChange={setFilter} />
        <KpiGrid kpis={kpis} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {isChartVisible('creditor-type') && <ChartCard title={dt('creditor-type', 'Type créancier')} data={byCreditorType} config={getChartConfig('creditor-type')} insight={generateInsight(byCreditorType, dt('creditor-type', 'Type créancier'))} />}
          {isChartVisible('amount-brackets') && <ChartCard title={dt('amount-brackets', 'Montants')} data={amountBrackets} config={getChartConfig('amount-brackets')} insight={generateInsight(amountBrackets, dt('amount-brackets', 'Montants'))} />}
          {isChartVisible('status') && <ChartCard title={dt('status', 'Statut')} data={byStatus} config={getChartConfig('status')} insight={generateInsight(byStatus, dt('status', 'Statut'))} />}
          {isChartVisible('duration') && <ChartCard title={dt('duration', 'Durée (mois)')} data={durationBrackets} config={getChartConfig('duration')} insight={generateInsight(durationBrackets, dt('duration', 'Durée (mois)'))} />}
          {isChartVisible('trend') && <ChartCard title={dt('trend', 'Contrats/mois')} data={trend} config={getChartConfig('trend')} insight={generateInsight(trend, dt('trend', 'Contrats/mois'))} />}
          {isChartVisible('geo') && <GeoCharts data={filtered} title={dt('geo', 'Géographie')} />}
          {isChartVisible('evolution') && <ChartCard title={dt('evolution', 'Évolution')} data={trend} config={getChartConfig('evolution')} className="md:col-span-2" insight={generateInsight(trend, dt('evolution', 'Évolution'))} />}
        </div>
      </div>
    </FilterLabelContext.Provider>
  );
});

MortgagesBlock.displayName = 'MortgagesBlock';
