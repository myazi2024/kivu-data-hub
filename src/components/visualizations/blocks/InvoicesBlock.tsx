import React, { useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { countBy, trendByMonth, sumByMonth } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Receipt, TrendingUp, DollarSign, CreditCard, MapPin } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { generateInsight } from '@/utils/chartInsights';
import { useBlockFilter } from '@/hooks/useBlockFilter';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'invoices';

export const InvoicesBlock: React.FC<Props> = memo(({ data }) => {
  const { filter, setFilter, filterLabel, filtered, filterConfig, v, ct, cx, ty, ord, exportCSV } = useBlockFilter(TAB_KEY, data.invoices);

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

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: ct('kpi-total', 'Total'), value: filtered.length, cls: 'text-primary' },
    { key: 'kpi-paid', label: ct('kpi-paid', 'Payées'), value: stats.paidCount, cls: 'text-emerald-600', tooltip: pct(stats.paidCount, filtered.length) },
    { key: 'kpi-revenue', label: ct('kpi-revenue', 'Revenus payés'), value: `$${stats.paidRevenue.toLocaleString()}`, cls: 'text-blue-600', tooltip: `Facturé: $${stats.totalRevenue.toLocaleString()}` },
    { key: 'kpi-avg', label: ct('kpi-avg', 'Montant moy.'), value: `$${stats.avgAmount}`, cls: 'text-violet-600' },
    { key: 'kpi-discounts', label: ct('kpi-discounts', 'Remises'), value: `$${stats.totalDiscount.toLocaleString()}`, cls: 'text-rose-600', tooltip: 'Total des remises accordées' },
  ].filter(k => v(k.key)), [filtered, stats, v, ct]);

  const chartDefs = useMemo(() => [
    { key: 'status', el: () => <ChartCard title={ct('status', 'Statut')} icon={Receipt} data={byStatus} type={ty('status', 'pie')} colorIndex={2}
      insight={generateInsight(byStatus, 'pie', 'les statuts de facture')} crossVariables={cx('status')} rawRecords={filtered} groupField="status" /> },
    { key: 'payment-method', el: () => <ChartCard title={ct('payment-method', 'Moyen paiement')} icon={CreditCard} data={byPaymentMethod} type={ty('payment-method', 'donut')} colorIndex={0} hidden={byPaymentMethod.length === 0}
      insight={generateInsight(byPaymentMethod, 'donut', 'les moyens de paiement')} crossVariables={cx('payment-method')} rawRecords={filtered} groupField="payment_method" /> },
    { key: 'geo-zone', el: () => <ChartCard title={ct('geo-zone', 'Zone géographique')} icon={MapPin} data={byGeoZone} type={ty('geo-zone', 'bar-h')} colorIndex={6} labelWidth={100} hidden={byGeoZone.length === 0}
      insight={generateInsight(byGeoZone, 'bar-h', 'les zones géographiques')} crossVariables={cx('geo-zone')} rawRecords={filtered} groupField="geographical_zone" /> },
    { key: 'revenue-trend', el: () => <ChartCard title={ct('revenue-trend', 'Revenus/mois')} icon={DollarSign} data={revenueTrend} type={ty('revenue-trend', 'area')} colorIndex={2} hidden={revenueTrend.length < 2}
      insight={generateInsight(revenueTrend, 'area', 'les revenus mensuels')} crossVariables={cx('revenue-trend')} rawRecords={filtered} groupField="payment_method" /> },
    { key: 'geo', el: () => <GeoCharts records={filtered} /> },
    { key: 'evolution', el: () => <ChartCard title={ct('evolution', 'Évolution')} icon={TrendingUp} data={trend} type={ty('evolution', 'area')} colorIndex={0} colSpan={2}
      insight={generateInsight(trend, 'area', 'les factures')} /> },
  ].filter(d => v(d.key)).sort((a, b) => ord(a.key) - ord(b.key)), [filtered, byStatus, byPaymentMethod, byGeoZone, revenueTrend, trend, v, ct, cx, ty, ord]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.invoices} filter={filter} onChange={setFilter} hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} statusField={filterConfig.statusField} onExport={() => exportCSV(['invoice_number', 'parcel_number', 'client_email', 'total_amount_usd', 'status', 'payment_method', 'created_at'])} />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {chartDefs.map(d => <React.Fragment key={d.key}>{d.el()}</React.Fragment>)}
      </div>
    </div>
    </FilterLabelContext.Provider>
  );
});
