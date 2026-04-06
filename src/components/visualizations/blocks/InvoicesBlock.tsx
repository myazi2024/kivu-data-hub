import React, { useState, useMemo, memo, useContext, useEffect } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, buildFilterLabel, sumByMonth } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Receipt, TrendingUp, DollarSign, CreditCard, MapPin } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { MapProvinceContext, VilleFilterContext, CommuneFilterContext, QuartierFilterContext } from '../filters/AnalyticsFilters';
import { generateInsight } from '@/utils/chartInsights';
import { useTabChartsConfig, useTabFilterConfig, ANALYTICS_TABS_REGISTRY } from '@/hooks/useAnalyticsChartsConfig';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'invoices';
const defaultItems = [...ANALYTICS_TABS_REGISTRY[TAB_KEY].kpis, ...ANALYTICS_TABS_REGISTRY[TAB_KEY].charts];

export const InvoicesBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const mapProvince = useContext(MapProvinceContext);
  const mapVille = useContext(VilleFilterContext);
  const mapCommune = useContext(CommuneFilterContext);
  const mapQuartier = useContext(QuartierFilterContext);
  useEffect(() => { setFilter(f => ({ ...f, province: mapProvince || undefined, ville: mapVille || undefined, commune: mapCommune || undefined, quartier: mapQuartier || undefined })); }, [mapProvince, mapVille, mapCommune, mapQuartier]);
  const filterLabel = useMemo(() => buildFilterLabel(filter), [filter]);
  const { isChartVisible, getChartConfig } = useTabChartsConfig(TAB_KEY, defaultItems);
  const filterConfig = useTabFilterConfig(TAB_KEY);
  const filtered = useMemo(() => applyFilters(data.invoices, filter), [data.invoices, filter]);

  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const byPaymentMethod = useMemo(() => countBy(filtered, 'payment_method'), [filtered]);
  const byGeoZone = useMemo(() => countBy(filtered, 'geographical_zone'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  const revenueTrend = useMemo(() => sumByMonth(filtered.filter(r => r.status === 'paid')), [filtered]);

  const stats = useMemo(() => {
    const paid = filtered.filter(r => r.status === 'paid');
    const paidRevenue = paid.reduce((s, r) => s + (r.total_amount_usd || 0), 0);
    const totalRevenue = filtered.reduce((s, r) => s + (r.total_amount_usd || 0), 0);
    const totalDiscount = filtered.reduce((s, r) => s + (r.discount_amount_usd || 0), 0);
    const avgAmount = filtered.length > 0 ? Math.round(totalRevenue / filtered.length) : 0;
    return { paidRevenue, totalRevenue, totalDiscount, avgAmount, paidCount: paid.length };
  }, [filtered]);

  const ct = (key: string, fallback: string) => getChartConfig(key)?.custom_title || fallback;
  const v = isChartVisible;

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: ct('kpi-total', 'Total'), value: filtered.length, cls: 'text-primary' },
    { key: 'kpi-paid', label: ct('kpi-paid', 'Payées'), value: stats.paidCount, cls: 'text-emerald-600', tooltip: pct(stats.paidCount, filtered.length) },
    { key: 'kpi-revenue', label: ct('kpi-revenue', 'Revenus payés'), value: `$${stats.paidRevenue.toLocaleString()}`, cls: 'text-blue-600', tooltip: `Facturé: $${stats.totalRevenue.toLocaleString()}` },
    { key: 'kpi-avg', label: ct('kpi-avg', 'Montant moy.'), value: `$${stats.avgAmount}`, cls: 'text-violet-600' },
    { key: 'kpi-discounts', label: ct('kpi-discounts', 'Remises'), value: `$${stats.totalDiscount.toLocaleString()}`, cls: 'text-rose-600', tooltip: 'Total des remises accordées' },
  ].filter(k => v(k.key)), [filtered, stats, v, getChartConfig]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.invoices} filter={filter} onChange={setFilter} hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} statusField={filterConfig.statusField} />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {v('status') && <ChartCard title={ct('status', 'Statut')} icon={Receipt} data={byStatus} type="pie" colorIndex={2}
          insight={generateInsight(byStatus, 'pie', 'les statuts de facture')} />}
        {v('payment-method') && <ChartCard title={ct('payment-method', 'Moyen paiement')} icon={CreditCard} data={byPaymentMethod} type="donut" colorIndex={0} hidden={byPaymentMethod.length === 0}
          insight={generateInsight(byPaymentMethod, 'donut', 'les moyens de paiement')} />}
        {v('geo-zone') && <ChartCard title={ct('geo-zone', 'Zone géographique')} icon={MapPin} data={byGeoZone} type="bar-h" colorIndex={6} labelWidth={100} hidden={byGeoZone.length === 0}
          insight={generateInsight(byGeoZone, 'bar-h', 'les zones géographiques')} />}
        {v('revenue-trend') && <ChartCard title={ct('revenue-trend', 'Revenus/mois')} icon={DollarSign} data={revenueTrend} type="area" colorIndex={2} hidden={revenueTrend.length < 2}
          insight={generateInsight(revenueTrend, 'area', 'les revenus mensuels')} />}
        {v('geo') && <GeoCharts records={filtered} />}
        {v('evolution') && <ChartCard title={ct('evolution', 'Évolution')} icon={TrendingUp} data={trend} type="area" colorIndex={0} colSpan={2}
          insight={generateInsight(trend, 'area', 'les factures')} />}
      </div>
    </div>
    </FilterLabelContext.Provider>
  );
});
