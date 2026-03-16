import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, countBoolean, trendByMonth, getSectionType, avgProcessingDays, surfaceDistribution, numericDistribution } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { FileText, Users, DollarSign, TrendingUp, Building, Globe, Ruler, Clock, UserCheck } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, ColorMappedPieCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { exportRecordsToCSV } from '@/utils/csvExport';
import { generateInsight } from '@/utils/chartInsights';

interface Props { data: LandAnalyticsData; }

const GENDER_COLORS: Record<string, string> = {
  'Masculin': '#3b82f6', 'Féminin': '#ec4899', 'M': '#3b82f6', 'F': '#ec4899',
  'Autre': '#8b5cf6', '(Non renseigné)': '#9ca3af',
};

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
  const byDeducedTitleType = useMemo(() => countBy(filtered, 'deduced_title_type'), [filtered]);
  const byNationality = useMemo(() => countBy(filtered, 'nationality'), [filtered]);
  const byCirconscription = useMemo(() => countBy(filtered, 'circonscription_fonciere'), [filtered]);
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
  const ownerSameData = useMemo(() => countBoolean(filtered, 'is_owner_same_as_requester', 'Propriétaire', 'Mandataire'), [filtered]);

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

  const handleExport = useCallback(() => {
    exportRecordsToCSV(filtered, `titres-fonciers-${new Date().toISOString().slice(0,10)}`, [
      'id', 'reference_number', 'request_type', 'requester_type', 'section_type', 'province', 'ville', 'commune',
      'status', 'payment_status', 'total_amount_usd', 'created_at'
    ]);
  }, [filtered]);

  // Insights
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

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.titleRequests} filter={filter} onChange={setFilter} onExport={handleExport} />
      <KpiGrid items={[
        { label: 'Total', value: filtered.length, cls: 'text-primary' },
        { label: 'Urbaine', value: stats.urbanCount, cls: 'text-emerald-600', tooltip: pct(stats.urbanCount, filtered.length) },
        { label: 'Rurale', value: stats.ruralCount, cls: 'text-amber-600', tooltip: pct(stats.ruralCount, filtered.length) },
        { label: 'Taux approbation', value: pct(stats.approved, filtered.length), cls: 'text-blue-600', tooltip: `${stats.approved} approuvées` },
        { label: 'Revenus payés', value: `$${stats.paidRevenue.toLocaleString()}`, cls: 'text-rose-600', tooltip: `Facturé: $${stats.totalRevenue.toLocaleString()}` },
        { label: 'Délai moy.', value: stats.avgDays > 0 ? `${stats.avgDays}j` : 'N/A', cls: 'text-violet-600', tooltip: stats.avgEstimated > 0 ? `Estimé: ${stats.avgEstimated}j` : 'Délai moyen de traitement' },
      ]} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ChartCard title="Type de demande" icon={FileText} data={byRequestType} type="bar-h" colorIndex={0} labelWidth={100}
          insight={generateInsight(byRequestType, 'bar-h', 'les types de demande')} />
        <ChartCard title="Demandeur" icon={Users} data={byRequesterType} type="donut" colorIndex={1}
          insight={generateInsight(byRequesterType, 'donut', 'les demandeurs')} />
        <ChartCard title="Statut" data={byStatus} type="bar-v" colorIndex={1}
          insight={generateInsight(byStatus, 'bar-v', 'les statuts')} />
        <ChartCard title="Paiement" icon={DollarSign} data={byPayment} type="donut" colorIndex={2}
          insight={generateInsight(byPayment, 'donut', 'les paiements')} />
        <ChartCard title="Statut juridique" data={byOwnerLegalStatus} type="donut" colorIndex={4}
          insight={generateInsight(byOwnerLegalStatus, 'donut', 'les statuts juridiques')} />
        <ChartCard title="Usage déclaré" data={byDeclaredUsage} type="bar-h" colorIndex={5}
          insight={generateInsight(byDeclaredUsage, 'bar-h', 'les usages')} />
        <ColorMappedPieCard title="Genre" icon={Users} iconColor="text-pink-500" data={genderData} colorMap={GENDER_COLORS}
          insight={genderInsight} />
        <ChartCard title="Nationalité" icon={Globe} data={byNationality} type="bar-h" colorIndex={9} labelWidth={80} hidden={byNationality.length === 0}
          insight={generateInsight(byNationality, 'bar-h', 'les nationalités')} />
        <ChartCard title="Titre déduit" data={byDeducedTitleType} type="bar-h" colorIndex={3} labelWidth={100} hidden={byDeducedTitleType.length === 0}
          insight={generateInsight(byDeducedTitleType, 'bar-h', 'les types de titre')} />
        <ChartCard title="Demandeur = Proprio" icon={UserCheck} data={ownerSameData} type="pie" colorIndex={0} hidden={ownerSameData.length === 0}
          insight={generateInsight(ownerSameData, 'pie', 'propriétaire vs mandataire')} />
        <ChartCard title="Superficie demandée" icon={Ruler} data={surfaceDist} type="bar-v" colorIndex={10} hidden={surfaceDist.length === 0}
          insight={generateInsight(surfaceDist, 'bar-v', 'les superficies')} />
        <ChartCard title="Circonscription" data={byCirconscription} type="bar-h" colorIndex={8} labelWidth={100} hidden={byCirconscription.length === 0}
          insight={generateInsight(byCirconscription, 'bar-h', 'les circonscriptions')} />
        <ChartCard title="Type construction" icon={Building} data={byConstructionType} type="bar-h" colorIndex={3} hidden={byConstructionType.length === 0}
          insight={generateInsight(byConstructionType, 'bar-h', 'les types de construction')} />
        <ChartCard title="Nature construction" data={byConstructionNature} type="bar-h" colorIndex={7} labelWidth={100}
          insight="Mesure l'évolution des matériaux de construction d'une zone à l'autre." />
        <ChartCard title="Revenus/mois" icon={DollarSign} data={revenueTrend} type="area" colorIndex={2} hidden={revenueTrend.length < 2}
          insight={generateInsight(revenueTrend, 'area', 'les revenus mensuels')} />
        <ChartCard title="Délai estimé vs réel" icon={Clock} data={processingComparison} type="bar-v" colorIndex={5} hidden={processingComparison.length === 0}
          insight={processingInsight} />
        <GeoCharts records={filtered} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={0} colSpan={2}
          insight={generateInsight(trend, 'area', 'les demandes de titres')} />
      </div>
    </div>
  );
});
