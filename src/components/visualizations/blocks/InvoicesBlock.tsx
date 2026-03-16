import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Receipt, TrendingUp, DollarSign, CreditCard, MapPin } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard } from '../shared/ChartCard';
import { exportRecordsToCSV } from '@/utils/csvExport';

interface Props { data: LandAnalyticsData; }

export const InvoicesBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.invoices, filter), [data.invoices, filter]);

  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const byPaymentMethod = useMemo(() => countBy(filtered, 'payment_method'), [filtered]);
  const byGeoZone = useMemo(() => countBy(filtered, 'geographical_zone'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  // Revenue trend
  const revenueTrend = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(r => {
      if (r.created_at && r.total_amount_usd > 0 && r.status === 'paid') {
        const d = new Date(r.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        map.set(key, (map.get(key) || 0) + r.total_amount_usd);
      }
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([k, value]) => {
      const [y, m] = k.split('-');
      const name = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('fr-FR', { year: '2-digit', month: 'short' });
      return { name, value: Math.round(value) };
    });
  }, [filtered]);

  const stats = useMemo(() => {
    const paid = filtered.filter(r => r.status === 'paid');
    const paidRevenue = paid.reduce((s, r) => s + (r.total_amount_usd || 0), 0);
    const totalRevenue = filtered.reduce((s, r) => s + (r.total_amount_usd || 0), 0);
    const totalDiscount = filtered.reduce((s, r) => s + (r.discount_amount_usd || 0), 0);
    const avgAmount = filtered.length > 0 ? Math.round(totalRevenue / filtered.length) : 0;
    return { paidRevenue, totalRevenue, totalDiscount, avgAmount, paidCount: paid.length };
  }, [filtered]);

  const handleExport = useCallback(() => {
    exportRecordsToCSV(filtered, `factures-${new Date().toISOString().slice(0,10)}`, [
      'id', 'invoice_number', 'parcel_number', 'client_email', 'total_amount_usd', 'status', 'payment_method', 'geographical_zone', 'created_at'
    ]);
  }, [filtered]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.invoices} filter={filter} onChange={setFilter} onExport={handleExport} />
      <KpiGrid items={[
        { label: 'Total', value: filtered.length, cls: 'text-primary' },
        { label: 'Payées', value: stats.paidCount, cls: 'text-emerald-600', tooltip: pct(stats.paidCount, filtered.length) },
        { label: 'Revenus payés', value: `$${stats.paidRevenue.toLocaleString()}`, cls: 'text-blue-600', tooltip: `Facturé: $${stats.totalRevenue.toLocaleString()}` },
        { label: 'Montant moy.', value: `$${stats.avgAmount}`, cls: 'text-violet-600' },
        { label: 'Remises', value: `$${stats.totalDiscount.toLocaleString()}`, cls: 'text-rose-600', tooltip: 'Total des remises accordées' },
      ]} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ChartCard title="Statut" icon={Receipt} data={byStatus} type="pie" colorIndex={2} />
        <ChartCard title="Moyen paiement" icon={CreditCard} data={byPaymentMethod} type="donut" colorIndex={0} hidden={byPaymentMethod.length === 0} />
        <ChartCard title="Zone géographique" icon={MapPin} data={byGeoZone} type="bar-h" colorIndex={6} labelWidth={100} hidden={byGeoZone.length === 0} />
        <ChartCard title="Revenus/mois" icon={DollarSign} data={revenueTrend} type="area" colorIndex={2} hidden={revenueTrend.length < 2} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={0} colSpan={2} />
      </div>
    </div>
  );
});
