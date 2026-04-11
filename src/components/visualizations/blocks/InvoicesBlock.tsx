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
  const { filter, setFilter, filterLabel, filtered, filterConfig, v, ct, cx } = useBlockFilter(TAB_KEY, data.invoices);

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

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.invoices} filter={filter} onChange={setFilter} hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} statusField={filterConfig.statusField} />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {v('status') && <ChartCard title={ct('status', 'Statut')} icon={Receipt} data={byStatus} type="pie" colorIndex={2}
          insight={generateInsight(byStatus, 'pie', 'les statuts de facture')} crossVariables={cx('status')} rawRecords={filtered} groupField="status" />}
        {v('payment-method') && <ChartCard title={ct('payment-method', 'Moyen paiement')} icon={CreditCard} data={byPaymentMethod} type="donut" colorIndex={0} hidden={byPaymentMethod.length === 0}
          insight={generateInsight(byPaymentMethod, 'donut', 'les moyens de paiement')} crossVariables={cx('payment-method')} rawRecords={filtered} groupField="payment_method" />}
        {v('geo-zone') && <ChartCard title={ct('geo-zone', 'Zone géographique')} icon={MapPin} data={byGeoZone} type="bar-h" colorIndex={6} labelWidth={100} hidden={byGeoZone.length === 0}
          insight={generateInsight(byGeoZone, 'bar-h', 'les zones géographiques')} crossVariables={cx('geo-zone')} rawRecords={filtered} groupField="geographical_zone" />}
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
