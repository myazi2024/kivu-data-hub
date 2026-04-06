import React, { useState, useMemo, memo, useContext, useEffect } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, buildFilterLabel } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Landmark, TrendingUp, DollarSign, Clock } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { MapProvinceContext, VilleFilterContext, CommuneFilterContext, QuartierFilterContext } from '../filters/AnalyticsFilters';
import { generateInsight } from '@/utils/chartInsights';
import { useTabChartsConfig, ANALYTICS_TABS_REGISTRY } from '@/hooks/useAnalyticsChartsConfig';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'mortgages';
const defaultItems = [...ANALYTICS_TABS_REGISTRY[TAB_KEY].kpis, ...ANALYTICS_TABS_REGISTRY[TAB_KEY].charts];

export const MortgagesBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const mapProvince = useContext(MapProvinceContext);
  const mapVille = useContext(VilleFilterContext);
  const mapCommune = useContext(CommuneFilterContext);
  const mapQuartier = useContext(QuartierFilterContext);
  useEffect(() => { setFilter(f => ({ ...f, province: mapProvince || undefined, ville: mapVille || undefined, commune: mapCommune || undefined, quartier: mapQuartier || undefined })); }, [mapProvince, mapVille, mapCommune, mapQuartier]);
  const filterLabel = useMemo(() => buildFilterLabel(filter), [filter]);
  const { isChartVisible: v, getChartConfig } = useTabChartsConfig(TAB_KEY, defaultItems);
  const filtered = useMemo(() => applyFilters(data.mortgages, filter), [data.mortgages, filter]);

  const byCreditorType = useMemo(() => countBy(filtered, 'creditor_type'), [filtered]);
  const byStatus = useMemo(() => countBy(filtered, 'mortgage_status'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered, 'contract_date'), [filtered]);

  const amountBrackets = useMemo(() => {
    const brackets = [
      { name: '< 5 000 $', min: 0, max: 5000 },
      { name: '5k – 20k $', min: 5000, max: 20000 },
      { name: '20k – 50k $', min: 20000, max: 50000 },
      { name: '50k – 100k $', min: 50000, max: 100000 },
      { name: '> 100k $', min: 100000, max: Infinity },
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
  const totalAmount = filtered.reduce((s: number, m: any) => s + (m.mortgage_amount_usd || 0), 0);

  const t = (key: string, fallback: string) => getChartConfig(key)?.custom_title || fallback;

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: t('kpi-total', 'Total'), value: filtered.length, cls: 'text-indigo-600' },
    { key: 'kpi-active', label: t('kpi-active', 'Actives'), value: active, cls: 'text-emerald-600', tooltip: pct(active, filtered.length) },
    { key: 'kpi-paid', label: t('kpi-paid', 'Soldées'), value: paid, cls: 'text-blue-600', tooltip: pct(paid, filtered.length) },
    { key: 'kpi-amount', label: t('kpi-amount', 'Montant total'), value: `$${totalAmount.toLocaleString()}`, cls: 'text-amber-600' },
  ].filter(k => v(k.key)), [filtered, active, paid, totalAmount, v, getChartConfig]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
      <div className="space-y-2">
        <AnalyticsFilters data={data.mortgages} filter={filter} onChange={setFilter} />
        <KpiGrid items={kpiItems} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {v('creditor-type') && <ChartCard title={t('creditor-type', 'Type créancier')} data={byCreditorType} type="donut" colorIndex={0} insight={generateInsight(byCreditorType, 'donut', 'les types de créancier')} />}
          {v('amount-brackets') && <ChartCard title={t('amount-brackets', 'Montants')} data={amountBrackets} type="bar-v" colorIndex={1} insight={generateInsight(amountBrackets, 'bar-v', 'les montants hypothécaires')} />}
          {v('status') && <ChartCard title={t('status', 'Statut')} data={byStatus} type="pie" colorIndex={2} insight={generateInsight(byStatus, 'pie', 'les statuts hypothécaires')} />}
          {v('duration') && <ChartCard title={t('duration', 'Durée (mois)')} data={durationBrackets} type="bar-v" colorIndex={3} insight={generateInsight(durationBrackets, 'bar-v', 'les durées hypothécaires')} />}
          {v('geo') && <GeoCharts records={filtered} />}
          {v('evolution') && <ChartCard title={t('evolution', 'Évolution')} data={trend} type="area" colorIndex={4} colSpan={2} icon={TrendingUp} insight={generateInsight(trend, 'area', "l'évolution des hypothèques")} />}
        </div>
      </div>
    </FilterLabelContext.Provider>
  );
});

MortgagesBlock.displayName = 'MortgagesBlock';
