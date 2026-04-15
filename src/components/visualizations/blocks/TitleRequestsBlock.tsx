import React, { useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { countBy, trendByMonth, getSectionType, avgProcessingDays, surfaceDistribution, sumByMonth } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { FileText, Users, DollarSign, TrendingUp, Globe, Ruler, Clock, UserCheck, KeyRound } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, ColorMappedPieCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { generateInsight } from '@/utils/chartInsights';
import { useBlockFilter } from '@/hooks/useBlockFilter';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'title-requests';

const GENDER_COLORS: Record<string, string> = {
  'Masculin': '#3b82f6', 'Féminin': '#ec4899', 'M': '#3b82f6', 'F': '#ec4899',
  'Autre': '#8b5cf6', '(Non renseigné)': '#9ca3af',
};

export const TitleRequestsBlock: React.FC<Props> = memo(({ data }) => {
  const { filter, setFilter, filterLabel, filtered, filterConfig, v, ct, cx, ty, ord } = useBlockFilter(TAB_KEY, data.titleRequests);

  const byRequestType = useMemo(() => countBy(filtered, 'request_type'), [filtered]);
  const byRequesterType = useMemo(() => countBy(filtered, 'requester_type'), [filtered]);
  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const byPayment = useMemo(() => countBy(filtered, 'payment_status'), [filtered]);
  const byOwnerLegalStatus = useMemo(() => countBy(filtered, 'owner_legal_status'), [filtered]);
  const byDeducedTitleType = useMemo(() => countBy(filtered, 'deduced_title_type'), [filtered]);
  const byNationality = useMemo(() => countBy(filtered, 'nationality'), [filtered]);
  
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  const genderData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(r => {
      const g = r.requester_gender || r.owner_gender;
      if (g) map.set(g, (map.get(g) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const surfaceDist = useMemo(() => surfaceDistribution(filtered), [filtered]);
  const ownerSameData = useMemo(() => countBy(filtered, 'requester_type'), [filtered]);
  const byLeaseType = useMemo(() => countBy(data.parcels, 'lease_type'), [data.parcels]);

  const revenueTrend = useMemo(() => sumByMonth(filtered.filter(r => r.payment_status === 'paid')), [filtered]);

  const stats = useMemo(() => {
    const urbanCount = filtered.filter(r => getSectionType(r) === 'urbaine').length;
    const ruralCount = filtered.filter(r => getSectionType(r) === 'rurale').length;
    const paid = filtered.filter(r => r.payment_status === 'paid');
    const paidRevenue = paid.reduce((s, r) => s + (r.total_amount_usd || 0), 0);
    const totalRevenue = filtered.reduce((s, r) => s + (r.total_amount_usd || 0), 0);
    const approved = filtered.filter(r => r.status === 'approved').length;
    const avgDays = avgProcessingDays(filtered, 'created_at', 'reviewed_at');
    const withEstimate = filtered.filter(r => r.estimated_processing_days && r.reviewed_at && r.created_at);
    const avgEstimated = withEstimate.length > 0
      ? Math.round(withEstimate.reduce((s, r) => s + r.estimated_processing_days, 0) / withEstimate.length)
      : 0;
    return { urbanCount, ruralCount, paidRevenue, totalRevenue, approved, avgDays, avgEstimated };
  }, [filtered]);

  const processingComparison = useMemo(() => {
    const result: { name: string; value: number }[] = [];
    if (stats.avgEstimated > 0) result.push({ name: 'Estimé (j)', value: stats.avgEstimated });
    if (stats.avgDays > 0) result.push({ name: 'Réel (j)', value: stats.avgDays });
    return result;
  }, [stats]);

  const processingInsight = useMemo(() => {
    if (processingComparison.length < 2) return '';
    const diff = stats.avgDays - stats.avgEstimated;
    if (diff > 0) return `Le traitement réel dépasse l'estimation de ${diff} jour${diff > 1 ? 's' : ''} en moyenne.`;
    if (diff < 0) return `Le traitement est plus rapide que l'estimation de ${Math.abs(diff)} jour${Math.abs(diff) > 1 ? 's' : ''}.`;
    return 'Le délai réel correspond à l\'estimation.';
  }, [processingComparison, stats]);

  const genderInsight = useMemo(() => {
    if (genderData.length === 0) return '';
    const total = genderData.reduce((s, d) => s + d.value, 0);
    const fem = genderData.find(d => d.name === 'Féminin' || d.name === 'F');
    if (fem) return `Les femmes représentent ${Math.round((fem.value / total) * 100)}% des demandeurs de titres.`;
    return generateInsight(genderData, 'pie', 'les demandeurs');
  }, [genderData]);

  const kpiItems = useMemo(() => {
    const all = [
      { key: 'kpi-total', label: ct('kpi-total', 'Total'), value: filtered.length, cls: 'text-primary' },
      { key: 'kpi-urbaine', label: ct('kpi-urbaine', 'Urbaine'), value: stats.urbanCount, cls: 'text-emerald-600', tooltip: pct(stats.urbanCount, filtered.length) },
      { key: 'kpi-rurale', label: ct('kpi-rurale', 'Rurale'), value: stats.ruralCount, cls: 'text-amber-600', tooltip: pct(stats.ruralCount, filtered.length) },
      { key: 'kpi-approval', label: ct('kpi-approval', 'Taux approbation'), value: pct(stats.approved, filtered.length), cls: 'text-blue-600', tooltip: `${stats.approved} approuvées` },
      { key: 'kpi-revenue', label: ct('kpi-revenue', 'Revenus payés'), value: `$${stats.paidRevenue.toLocaleString()}`, cls: 'text-rose-600', tooltip: `Facturé: $${stats.totalRevenue.toLocaleString()}` },
      { key: 'kpi-delay', label: ct('kpi-delay', 'Délai moy.'), value: stats.avgDays > 0 ? `${stats.avgDays}j` : 'N/A', cls: 'text-violet-600', tooltip: stats.avgEstimated > 0 ? `Estimé: ${stats.avgEstimated}j` : 'Délai moyen de traitement' },
    ];
    return all.filter(k => v(k.key));
  }, [filtered, stats, v, ct]);

  const chartDefs = useMemo(() => [
    { key: 'request-type', el: () => <ChartCard title={ct('request-type', 'Type de demande')} icon={FileText} data={byRequestType} type={ty('request-type', 'bar-h')} colorIndex={0} labelWidth={100}
      insight={generateInsight(byRequestType, 'bar-h', 'les types de demande')} crossVariables={cx('request-type')} rawRecords={filtered} groupField="request_type" /> },
    { key: 'requester-type', el: () => <ChartCard title={ct('requester-type', 'Demandeur')} icon={Users} data={byRequesterType} type={ty('requester-type', 'donut')} colorIndex={1}
      insight={generateInsight(byRequesterType, 'donut', 'les demandeurs')} crossVariables={cx('requester-type')} rawRecords={filtered} groupField="requester_type" /> },
    { key: 'status', el: () => <ChartCard title={ct('status', 'Statut')} data={byStatus} type={ty('status', 'bar-v')} colorIndex={1}
      insight={generateInsight(byStatus, 'bar-v', 'les statuts')} crossVariables={cx('status')} rawRecords={filtered} groupField="status" /> },
    { key: 'payment', el: () => <ChartCard title={ct('payment', 'Paiement')} icon={DollarSign} data={byPayment} type={ty('payment', 'donut')} colorIndex={2}
      insight={generateInsight(byPayment, 'donut', 'les paiements')} crossVariables={cx('payment')} rawRecords={filtered} groupField="payment_status" /> },
    { key: 'legal-status', el: () => <ChartCard title={ct('legal-status', 'Statut juridique')} data={byOwnerLegalStatus} type={ty('legal-status', 'donut')} colorIndex={4}
      insight={generateInsight(byOwnerLegalStatus, 'donut', 'les statuts juridiques')} crossVariables={cx('legal-status')} rawRecords={filtered} groupField="owner_legal_status" /> },
    { key: 'gender', el: () => <ColorMappedPieCard title={ct('gender', 'Genre')} icon={Users} iconColor="text-pink-500" data={genderData} colorMap={GENDER_COLORS}
      insight={genderInsight} crossVariables={cx('gender')} rawRecords={filtered} groupField="requester_gender" /> },
    { key: 'nationality', el: () => <ChartCard title={ct('nationality', 'Nationalité')} icon={Globe} data={byNationality} type={ty('nationality', 'bar-h')} colorIndex={9} labelWidth={80} hidden={byNationality.length === 0}
      insight={generateInsight(byNationality, 'bar-h', 'les nationalités')} crossVariables={cx('nationality')} rawRecords={filtered} groupField="nationality" /> },
    { key: 'deduced-title', el: () => <ChartCard title={ct('deduced-title', 'Titre déduit')} data={byDeducedTitleType} type={ty('deduced-title', 'bar-h')} colorIndex={3} labelWidth={100} hidden={byDeducedTitleType.length === 0}
      insight={generateInsight(byDeducedTitleType, 'bar-h', 'les types de titre')} crossVariables={cx('deduced-title')} rawRecords={filtered} groupField="deduced_title_type" /> },
    { key: 'owner-same', el: () => <ChartCard title={ct('owner-same', 'Qualité du demandeur')} icon={UserCheck} data={ownerSameData} type={ty('owner-same', 'pie')} colorIndex={0} hidden={ownerSameData.length === 0}
      insight={generateInsight(ownerSameData, 'pie', 'qualité du demandeur')} crossVariables={cx('owner-same')} rawRecords={filtered} groupField="requester_type" /> },
    { key: 'surface', el: () => <ChartCard title={ct('surface', 'Superficie demandée')} icon={Ruler} data={surfaceDist} type={ty('surface', 'bar-v')} colorIndex={10} hidden={surfaceDist.length === 0}
      insight={generateInsight(surfaceDist, 'bar-v', 'les superficies')} crossVariables={cx('surface')} rawRecords={filtered} groupField="area_sqm" /> },
    { key: 'revenue-trend', el: () => <ChartCard title={ct('revenue-trend', 'Revenus/mois')} icon={DollarSign} data={revenueTrend} type={ty('revenue-trend', 'area')} colorIndex={2} hidden={revenueTrend.length < 2}
      insight={generateInsight(revenueTrend, 'area', 'les revenus mensuels')} /> },
    { key: 'processing-comparison', el: () => <ChartCard title={ct('processing-comparison', 'Délai estimé vs réel')} icon={Clock} data={processingComparison} type={ty('processing-comparison', 'bar-v')} colorIndex={5} hidden={processingComparison.length === 0}
      insight={processingInsight} /> },
    { key: 'lease-type', el: () => <ChartCard title={ct('lease-type', 'Type de bail')} icon={KeyRound} data={byLeaseType} type={ty('lease-type', 'bar-h')} colorIndex={13} hidden={byLeaseType.length === 0}
      insight={generateInsight(byLeaseType, 'bar-h', 'les types de bail')} crossVariables={cx('lease-type')} rawRecords={data.parcels} groupField="lease_type" /> },
    { key: 'geo', el: () => <GeoCharts records={filtered} /> },
    { key: 'subdivided', el: () => {
      const lotie = data.parcels.filter(p => p.is_subdivided === true).length;
      const nonLotie = data.parcels.filter(p => p.is_subdivided === false).length;
      const subdivData = [
        ...(lotie > 0 ? [{ name: 'Loties', value: lotie }] : []),
        ...(nonLotie > 0 ? [{ name: 'Non loties', value: nonLotie }] : []),
      ];
      return <ChartCard title={ct('subdivided', 'Loties vs Non loties')} data={subdivData} type={ty('subdivided', 'pie')} colorIndex={3} hidden={subdivData.length === 0}
        insight={generateInsight(subdivData, 'pie', 'le lotissement des parcelles')} crossVariables={cx('subdivided')} rawRecords={data.parcels} groupField="is_subdivided" />;
    }},
    { key: 'evolution', el: () => <ChartCard title={ct('evolution', 'Évolution')} icon={TrendingUp} data={trend} type={ty('evolution', 'area')} colorIndex={0} colSpan={2}
      insight={generateInsight(trend, 'area', 'les demandes de titres')} /> },
  ].filter(d => v(d.key)).sort((a, b) => ord(a.key) - ord(b.key)), [filtered, byRequestType, byRequesterType, byStatus, byPayment, byOwnerLegalStatus, genderData, byNationality, byDeducedTitleType, ownerSameData, surfaceDist, revenueTrend, processingComparison, trend, genderInsight, processingInsight, byLeaseType, data.parcels, v, ct, cx, ty, ord]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.titleRequests} filter={filter} onChange={setFilter} hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} statusField={filterConfig.statusField} />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {chartDefs.map(d => <React.Fragment key={d.key}>{d.el()}</React.Fragment>)}
      </div>
    </div>
    </FilterLabelContext.Provider>
  );
});
