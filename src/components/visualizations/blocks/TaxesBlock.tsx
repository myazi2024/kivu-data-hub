import React, { useState, useMemo, memo, useContext, useEffect } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, buildFilterLabel } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Receipt, DollarSign, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { MapProvinceContext, VilleFilterContext, CommuneFilterContext, QuartierFilterContext } from '../filters/AnalyticsFilters';
import { generateInsight } from '@/utils/chartInsights';
import { useTabChartsConfig, ANALYTICS_TABS_REGISTRY } from '@/hooks/useAnalyticsChartsConfig';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'taxes';
const defaultItems = [...ANALYTICS_TABS_REGISTRY[TAB_KEY].kpis, ...ANALYTICS_TABS_REGISTRY[TAB_KEY].charts];

export const TaxesBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const mapProvince = useContext(MapProvinceContext);
  const mapVille = useContext(VilleFilterContext);
  const mapCommune = useContext(CommuneFilterContext);
  const mapQuartier = useContext(QuartierFilterContext);
  useEffect(() => { setFilter(f => ({ ...f, province: mapProvince || undefined, ville: mapVille || undefined, commune: mapCommune || undefined, quartier: mapQuartier || undefined })); }, [mapProvince, mapVille, mapCommune, mapQuartier]);
  const filterLabel = useMemo(() => buildFilterLabel(filter), [filter]);
  const { isChartVisible: v, getChartConfig } = useTabChartsConfig(TAB_KEY, defaultItems);
  const filtered = useMemo(() => applyFilters(data.taxHistory, filter), [data.taxHistory, filter]);

  const byStatus = useMemo(() => countBy(filtered, 'payment_status'), [filtered]);
  const byYear = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((t: any) => { const y = String(t.tax_year || '(Non renseigné)'); map.set(y, (map.get(y) || 0) + 1); });
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
      value: filtered.filter((t: any) => (t.amount_usd || 0) >= b.min && (t.amount_usd || 0) < b.max).length,
    })).filter(b => b.value > 0);
  }, [filtered]);

  const totalAmount = filtered.reduce((s: number, t: any) => s + (t.amount_usd || 0), 0);
  const paid = filtered.filter((t: any) => t.payment_status === 'paid' || t.payment_status === 'payé').length;
  const pendingCount = filtered.filter((t: any) => ['pending', 'en_attente', 'unpaid'].includes(t.payment_status)).length;

  const dt = (key: string, fallback: string) => getChartConfig(key)?.custom_title || fallback;

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: dt('kpi-total', 'Total déclarations'), value: filtered.length, cls: 'text-purple-600' },
    { key: 'kpi-revenue', label: dt('kpi-revenue', 'Montant total'), value: `$${totalAmount.toLocaleString()}`, cls: 'text-emerald-600' },
    { key: 'kpi-pending', label: dt('kpi-pending', 'En attente'), value: pendingCount, cls: 'text-amber-600', tooltip: pct(pendingCount, filtered.length) },
    { key: 'kpi-approved', label: dt('kpi-approved', 'Payées'), value: paid, cls: 'text-blue-600', tooltip: pct(paid, filtered.length) },
  ].filter(k => v(k.key)), [filtered, totalAmount, pendingCount, paid, v, getChartConfig]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
      <div className="space-y-2">
        <AnalyticsFilters data={data.taxHistory} filter={filter} onChange={setFilter} />
        <KpiGrid items={kpiItems} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {v('status') && <ChartCard title={dt('status', 'Statut paiement')} data={byStatus} type="bar-v" colorIndex={0} insight={generateInsight(byStatus, 'bar-v', 'les statuts de taxe')} />}
          {v('fiscal-year') && <ChartCard title={dt('fiscal-year', 'Exercice fiscal')} data={byYear} type="bar-v" colorIndex={1} insight={generateInsight(byYear, 'bar-v', 'les exercices fiscaux')} />}
          {v('amount-range') && <ChartCard title={dt('amount-range', 'Tranche montant')} data={amountBrackets} type="bar-h" colorIndex={2} insight={generateInsight(amountBrackets, 'bar-h', 'les tranches de montant')} />}
          {v('geo') && <GeoCharts records={filtered} />}
          {v('evolution') && <ChartCard title={dt('evolution', 'Évolution')} data={trend} type="area" colorIndex={3} colSpan={2} icon={TrendingUp} insight={generateInsight(trend, 'area', "l'évolution des taxes")} />}
        </div>
      </div>
    </FilterLabelContext.Provider>
  );
});

TaxesBlock.displayName = 'TaxesBlock';
