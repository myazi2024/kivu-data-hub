import React, { useState, useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, getSectionType } from '@/utils/analyticsHelpers';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { FileText, Users, Building, DollarSign, TrendingUp, MapPin } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';

interface Props { data: LandAnalyticsData; }

export const TitleRequestsBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.titleRequests, filter), [data.titleRequests, filter]);

  const byRequestType = useMemo(() => countBy(filtered, 'request_type'), [filtered]);
  const byRequesterType = useMemo(() => countBy(filtered, 'requester_type'), [filtered]);
  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const byPayment = useMemo(() => countBy(filtered, 'payment_status'), [filtered]);
  const byConstructionType = useMemo(() => countBy(filtered, 'construction_type'), [filtered]);
  const byDeclaredUsage = useMemo(() => countBy(filtered, 'declared_usage'), [filtered]);
  const bySectionType = useMemo(() => countBy(filtered, 'section_type'), [filtered]);
  const byOwnerLegalStatus = useMemo(() => countBy(filtered, 'owner_legal_status'), [filtered]);
  const byConstructionNature = useMemo(() => countBy(filtered, 'construction_nature'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  const urbanCount = useMemo(() => filtered.filter(r => getSectionType(r) === 'urbaine').length, [filtered]);
  const ruralCount = useMemo(() => filtered.filter(r => getSectionType(r) === 'rurale').length, [filtered]);
  const totalRevenue = useMemo(() => filtered.reduce((s, r) => s + (r.total_amount_usd || 0), 0), [filtered]);
  const paidRevenue = useMemo(() => filtered.filter(r => r.payment_status === 'paid').reduce((s, r) => s + (r.total_amount_usd || 0), 0), [filtered]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.titleRequests} filter={filter} onChange={setFilter} />
      <KpiGrid items={[
        { label: 'Total', value: filtered.length, cls: 'text-primary' },
        { label: 'Urbaine', value: urbanCount, cls: 'text-emerald-600' },
        { label: 'Rurale', value: ruralCount, cls: 'text-amber-600' },
        { label: 'Revenus', value: `$${paidRevenue.toLocaleString()}`, cls: 'text-blue-600' },
        { label: 'Total facturé', value: `$${totalRevenue.toLocaleString()}`, cls: 'text-rose-600' },
      ]} />
      <div className="grid grid-cols-2 gap-2">
        <ChartCard title="Type de demande" icon={FileText} data={byRequestType} type="bar-h" colorIndex={0} labelWidth={100} />
        <ChartCard title="Demandeur" icon={Users} data={byRequesterType} type="donut" colorIndex={1} />
        <ChartCard title="Statut" data={byStatus} type="bar-v" colorIndex={1} />
        <ChartCard title="Paiement" icon={DollarSign} data={byPayment} type="donut" colorIndex={2} />
        <ChartCard title="Urbaine vs Rurale" icon={MapPin} data={bySectionType} type="pie" colorIndex={0} />
        <ChartCard title="Construction" icon={Building} data={byConstructionType} type="bar-h" colorIndex={3} />
        <ChartCard title="Usage déclaré" data={byDeclaredUsage} type="bar-h" colorIndex={5} />
        <ChartCard title="Nature construction" data={byConstructionNature} type="bar-h" colorIndex={7} />
        <ChartCard title="Statut juridique" data={byOwnerLegalStatus} type="donut" colorIndex={4} />
        <GeoCharts records={filtered} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={0} colSpan={2} />
      </div>
    </div>
  );
});
