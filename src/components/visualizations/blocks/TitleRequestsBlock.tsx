import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, getSectionType, avgProcessingDays } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { FileText, Users, DollarSign, TrendingUp, Building } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { exportRecordsToCSV } from '@/utils/csvExport';

interface Props { data: LandAnalyticsData; }

export const TitleRequestsBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.titleRequests, filter), [data.titleRequests, filter]);

  const byRequestType = useMemo(() => countBy(filtered, 'request_type'), [filtered]);
  const byRequesterType = useMemo(() => countBy(filtered, 'requester_type'), [filtered]);
  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const byPayment = useMemo(() => countBy(filtered, 'payment_status'), [filtered]);
  const byDeclaredUsage = useMemo(() => countBy(filtered, 'declared_usage'), [filtered]);
  const byOwnerLegalStatus = useMemo(() => countBy(filtered, 'owner_legal_status'), [filtered]);
  const byConstructionType = useMemo(() => countBy(filtered, 'construction_type'), [filtered]);
  const byConstructionNature = useMemo(() => countBy(filtered, 'construction_nature'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  // Revenue trend by month
  const revenueTrend = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(r => {
      if (r.created_at && r.total_amount_usd > 0 && r.payment_status === 'paid') {
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
    const urbanCount = filtered.filter(r => getSectionType(r) === 'urbaine').length;
    const ruralCount = filtered.filter(r => getSectionType(r) === 'rurale').length;
    const paid = filtered.filter(r => r.payment_status === 'paid');
    const paidRevenue = paid.reduce((s, r) => s + (r.total_amount_usd || 0), 0);
    const totalRevenue = filtered.reduce((s, r) => s + (r.total_amount_usd || 0), 0);
    const approved = filtered.filter(r => r.status === 'approved').length;
    const avgDays = avgProcessingDays(filtered, 'created_at', 'reviewed_at');
    return { urbanCount, ruralCount, paidRevenue, totalRevenue, approved, avgDays };
  }, [filtered]);

  const handleExport = useCallback(() => {
    exportRecordsToCSV(filtered, `titres-fonciers-${new Date().toISOString().slice(0,10)}`, [
      'id', 'reference_number', 'request_type', 'requester_type', 'section_type', 'province', 'ville', 'commune',
      'status', 'payment_status', 'total_amount_usd', 'created_at'
    ]);
  }, [filtered]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.titleRequests} filter={filter} onChange={setFilter} onExport={handleExport} />
      <KpiGrid items={[
        { label: 'Total', value: filtered.length, cls: 'text-primary' },
        { label: 'Urbaine', value: stats.urbanCount, cls: 'text-emerald-600', tooltip: pct(stats.urbanCount, filtered.length) },
        { label: 'Rurale', value: stats.ruralCount, cls: 'text-amber-600', tooltip: pct(stats.ruralCount, filtered.length) },
        { label: 'Taux approbation', value: pct(stats.approved, filtered.length), cls: 'text-blue-600', tooltip: `${stats.approved} approuvées` },
        { label: 'Revenus payés', value: `$${stats.paidRevenue.toLocaleString()}`, cls: 'text-rose-600', tooltip: `Facturé: $${stats.totalRevenue.toLocaleString()}` },
        { label: 'Délai moy.', value: stats.avgDays > 0 ? `${stats.avgDays}j` : 'N/A', cls: 'text-violet-600', tooltip: 'Délai moyen de traitement (jours)' },
      ]} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ChartCard title="Type de demande" icon={FileText} data={byRequestType} type="bar-h" colorIndex={0} labelWidth={100} />
        <ChartCard title="Demandeur" icon={Users} data={byRequesterType} type="donut" colorIndex={1} />
        <ChartCard title="Statut" data={byStatus} type="bar-v" colorIndex={1} />
        <ChartCard title="Paiement" icon={DollarSign} data={byPayment} type="donut" colorIndex={2} />
        <ChartCard title="Statut juridique" data={byOwnerLegalStatus} type="donut" colorIndex={4} />
        <ChartCard title="Usage déclaré" data={byDeclaredUsage} type="bar-h" colorIndex={5} />
        <ChartCard title="Type construction" icon={Building} data={byConstructionType} type="bar-h" colorIndex={3} hidden={byConstructionType.length === 0} />
        <ChartCard title="Nature construction" data={byConstructionNature} type="donut" colorIndex={7} hidden={byConstructionNature.length === 0} />
        <ChartCard title="Revenus/mois" icon={DollarSign} data={revenueTrend} type="area" colorIndex={2} hidden={revenueTrend.length < 2} />
        <GeoCharts records={filtered} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={0} colSpan={2} />
      </div>
    </div>
  );
});
