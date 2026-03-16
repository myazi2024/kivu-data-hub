import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, countBoolean, trendByMonth, avgProcessingDays } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { FileText, TrendingUp, AlertTriangle, ShieldAlert, Users, Gavel } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { exportRecordsToCSV } from '@/utils/csvExport';
import { generateInsight } from '@/utils/chartInsights';

interface Props { data: LandAnalyticsData; }

export const ContributionsBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.contributions, filter), [data.contributions, filter]);

  const byContributionType = useMemo(() => countBy(filtered, 'contribution_type'), [filtered]);
  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const byPropertyTitleType = useMemo(() => countBy(filtered, 'property_title_type'), [filtered]);
  const byLegalStatus = useMemo(() => countBy(filtered, 'current_owner_legal_status'), [filtered]);
  const byDeclaredUsage = useMemo(() => countBy(filtered, 'declared_usage'), [filtered]);
  const byConstructionType = useMemo(() => countBy(filtered, 'construction_type'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  const fraudData = useMemo(() => {
    const suspicious = filtered.filter(r => r.is_suspicious === true).length;
    const safe = filtered.length - suspicious;
    const distribution = [
      ...(suspicious > 0 ? [{ name: 'Suspectes', value: suspicious }] : []),
      { name: 'Normales', value: safe },
    ];
    const scoreRecords = filtered.filter(r => r.fraud_score != null && r.fraud_score > 0);
    const byScore = [
      { name: '< 30 (Faible)', value: scoreRecords.filter(r => r.fraud_score < 30).length },
      { name: '30-60 (Moyen)', value: scoreRecords.filter(r => r.fraud_score >= 30 && r.fraud_score < 60).length },
      { name: '60-80 (Élevé)', value: scoreRecords.filter(r => r.fraud_score >= 60 && r.fraud_score < 80).length },
      { name: '≥ 80 (Critique)', value: scoreRecords.filter(r => r.fraud_score >= 80).length },
    ].filter(d => d.value > 0);
    const byFraudReason = countBy(filtered.filter(r => r.fraud_reason), 'fraud_reason');
    return { distribution, byScore, suspicious, byFraudReason };
  }, [filtered]);

  const appealData = useMemo(() => {
    const submitted = filtered.filter(r => r.appeal_submitted === true).length;
    const byAppealStatus = countBy(filtered.filter(r => r.appeal_status), 'appeal_status');
    return { submitted, byAppealStatus };
  }, [filtered]);

  const stats = useMemo(() => {
    const approved = filtered.filter(r => r.status === 'approved').length;
    const pending = filtered.filter(r => r.status === 'pending').length;
    const rejected = filtered.filter(r => r.status === 'rejected').length;
    const avgDays = avgProcessingDays(filtered, 'created_at', 'reviewed_at');
    return { approved, pending, rejected, avgDays };
  }, [filtered]);

  const handleExport = useCallback(() => {
    exportRecordsToCSV(filtered, `contributions-${new Date().toISOString().slice(0,10)}`, [
      'id', 'parcel_number', 'contribution_type', 'status', 'is_suspicious', 'fraud_score',
      'appeal_submitted', 'appeal_status', 'province', 'ville', 'commune', 'created_at'
    ]);
  }, [filtered]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.contributions} filter={filter} onChange={setFilter} onExport={handleExport} hidePaymentStatus />
      <KpiGrid items={[
        { label: 'Total', value: filtered.length, cls: 'text-primary' },
        { label: 'Approuvées', value: stats.approved, cls: 'text-emerald-600', tooltip: pct(stats.approved, filtered.length) },
        { label: 'En attente', value: stats.pending, cls: 'text-amber-600', tooltip: pct(stats.pending, filtered.length) },
        { label: 'Suspectes', value: fraudData.suspicious, cls: 'text-red-600', tooltip: pct(fraudData.suspicious, filtered.length) },
        { label: 'Appels', value: appealData.submitted, cls: 'text-blue-600', tooltip: pct(appealData.submitted, filtered.length) },
        { label: 'Délai moy.', value: stats.avgDays > 0 ? `${stats.avgDays}j` : 'N/A', cls: 'text-violet-600', tooltip: 'Délai moyen de traitement' },
      ]} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ChartCard title="Type contribution" icon={FileText} data={byContributionType} type="bar-h" colorIndex={0} labelWidth={100}
          insight={generateInsight(byContributionType, 'bar-h', 'les types de contribution')} />
        <ChartCard title="Statut" data={byStatus} type="pie" colorIndex={1}
          insight={generateInsight(byStatus, 'pie', 'les statuts')} />
        <ChartCard title="Type titre" data={byPropertyTitleType} type="bar-h" colorIndex={3} labelWidth={100} hidden={byPropertyTitleType.length === 0}
          insight={generateInsight(byPropertyTitleType, 'bar-h', 'les types de titre')} />
        <ChartCard title="Statut juridique" icon={Users} data={byLegalStatus} type="donut" colorIndex={4}
          insight={generateInsight(byLegalStatus, 'donut', 'les statuts juridiques')} />
        <ChartCard title="Usage déclaré" data={byDeclaredUsage} type="bar-h" colorIndex={5} hidden={byDeclaredUsage.length === 0}
          insight={generateInsight(byDeclaredUsage, 'bar-h', 'les usages déclarés')} />
        <ChartCard title="Type construction" data={byConstructionType} type="bar-h" colorIndex={7} hidden={byConstructionType.length === 0}
          insight={generateInsight(byConstructionType, 'bar-h', 'les types de construction')} />
        <ChartCard title="Détection fraude" icon={ShieldAlert} data={fraudData.distribution} type="pie" colorIndex={4}
          insight={fraudData.suspicious > 0 ? `${fraudData.suspicious} contribution${fraudData.suspicious > 1 ? 's' : ''} signalée${fraudData.suspicious > 1 ? 's' : ''} comme suspecte${fraudData.suspicious > 1 ? 's' : ''}.` : 'Aucune contribution suspecte détectée.'} />
        <ChartCard title="Score fraude" icon={AlertTriangle} data={fraudData.byScore} type="bar-v" colorIndex={4} hidden={fraudData.byScore.length === 0}
          insight={generateInsight(fraudData.byScore, 'bar-v', 'les niveaux de risque')} />
        <ChartCard title="Motif fraude" data={fraudData.byFraudReason} type="bar-h" colorIndex={4} labelWidth={120} hidden={fraudData.byFraudReason.length === 0}
          insight={generateInsight(fraudData.byFraudReason, 'bar-h', 'les motifs de fraude')} />
        <ChartCard title="Statut appel" icon={Gavel} data={appealData.byAppealStatus} type="donut" colorIndex={9} hidden={appealData.byAppealStatus.length === 0}
          insight={generateInsight(appealData.byAppealStatus, 'donut', 'les appels')} />
        <GeoCharts records={filtered} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={0} colSpan={2}
          insight={generateInsight(trend, 'area', 'les contributions')} />
      </div>
    </div>
  );
});
