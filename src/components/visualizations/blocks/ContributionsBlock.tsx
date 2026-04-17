import React, { useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { countBy, trendByMonth, avgProcessingDays } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { FileText, TrendingUp, AlertTriangle, ShieldAlert, Users, Gavel, Home, KeyRound } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { generateInsight } from '@/utils/chartInsights';
import { normalizeTitleType } from '@/utils/titleTypeNormalizer';
import { normalizeConstructionType } from '@/utils/constructionTypeNormalizer';
import { normalizeDeclaredUsage } from '@/utils/declaredUsageNormalizer';
import { useBlockFilter } from '@/hooks/useBlockFilter';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'contributions';

export const ContributionsBlock: React.FC<Props> = memo(({ data }) => {
  const { filter, setFilter, filterLabel, filtered, filterConfig, v, ct, cx, ty, ord, exportCSV } = useBlockFilter(TAB_KEY, data.contributions);

  const byContributionType = useMemo(() => countBy(filtered, 'contribution_type'), [filtered]);
  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const normalized = useMemo(() => filtered.map(r => ({
    ...r,
    property_title_type: normalizeTitleType(r.property_title_type),
    construction_type: normalizeConstructionType(r.construction_type),
    declared_usage: normalizeDeclaredUsage(r.declared_usage),
  })), [filtered]);
  const byPropertyTitleType = useMemo(() => countBy(normalized, 'property_title_type'), [normalized]);
  const byLegalStatus = useMemo(() => countBy(filtered, 'current_owner_legal_status'), [filtered]);
  const byDeclaredUsage = useMemo(() => countBy(normalized, 'declared_usage'), [normalized]);
  const byConstructionType = useMemo(() => countBy(normalized, 'construction_type'), [normalized]);
  const byPropertyCategory = useMemo(() => countBy(filtered, 'property_category').filter(d => d.name !== 'Terrain nu'), [filtered]);
  const byLeaseType = useMemo(() => countBy(filtered, 'lease_type'), [filtered]);
  const occupationData = useMemo(() => {
    const occupied = filtered.filter(r => r.is_occupied === true).length;
    const vacant = filtered.filter(r => r.is_occupied === false).length;
    return [
      ...(occupied > 0 ? [{ name: 'Habité', value: occupied }] : []),
      ...(vacant > 0 ? [{ name: 'Non habité', value: vacant }] : []),
    ];
  }, [filtered]);
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

  const withLease = useMemo(() => filtered.filter(r => r.lease_type).length, [filtered]);

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: ct('kpi-total', 'Total'), value: filtered.length, cls: 'text-primary' },
    { key: 'kpi-approved', label: ct('kpi-approved', 'Approuvées'), value: stats.approved, cls: 'text-emerald-600', tooltip: pct(stats.approved, filtered.length) },
    { key: 'kpi-pending', label: ct('kpi-pending', 'En attente'), value: stats.pending, cls: 'text-amber-600', tooltip: pct(stats.pending, filtered.length) },
    { key: 'kpi-suspicious', label: ct('kpi-suspicious', 'Suspectes'), value: fraudData.suspicious, cls: 'text-red-600', tooltip: pct(fraudData.suspicious, filtered.length) },
    { key: 'kpi-appeals', label: ct('kpi-appeals', 'Appels'), value: appealData.submitted, cls: 'text-blue-600', tooltip: pct(appealData.submitted, filtered.length) },
    { key: 'kpi-with-lease', label: ct('kpi-with-lease', 'Avec bail'), value: withLease, cls: 'text-teal-600', tooltip: pct(withLease, filtered.length) },
    { key: 'kpi-delay', label: ct('kpi-delay', 'Délai moy.'), value: stats.avgDays > 0 ? `${stats.avgDays}j` : 'N/A', cls: 'text-violet-600', tooltip: 'Délai moyen de traitement' },
  ].filter(k => v(k.key)), [filtered, stats, fraudData, appealData, withLease, v, ct]);

  const chartDefs = useMemo(() => [
    { key: 'contribution-type', el: () => <ChartCard title={ct('contribution-type', 'Type contribution')} icon={FileText} data={byContributionType} type={ty('contribution-type', 'bar-h')} colorIndex={0} labelWidth={100}
      insight={generateInsight(byContributionType, 'bar-h', 'les types de contribution')} crossVariables={cx('contribution-type')} rawRecords={filtered} groupField="contribution_type" /> },
    { key: 'status', el: () => <ChartCard title={ct('status', 'Statut')} data={byStatus} type={ty('status', 'pie')} colorIndex={1}
      insight={generateInsight(byStatus, 'pie', 'les statuts')} crossVariables={cx('status')} rawRecords={filtered} groupField="status" /> },
    { key: 'title-type', el: () => <ChartCard title={ct('title-type', 'Type titre')} data={byPropertyTitleType} type={ty('title-type', 'bar-h')} colorIndex={3} labelWidth={100} hidden={byPropertyTitleType.length === 0}
      insight={generateInsight(byPropertyTitleType, 'bar-h', 'les types de titre')} crossVariables={cx('title-type')} rawRecords={normalized} groupField="property_title_type" /> },
    { key: 'legal-status', el: () => <ChartCard title={ct('legal-status', 'Statut juridique')} icon={Users} data={byLegalStatus} type={ty('legal-status', 'donut')} colorIndex={4}
      insight={generateInsight(byLegalStatus, 'donut', 'les statuts juridiques')} crossVariables={cx('legal-status')} rawRecords={filtered} groupField="current_owner_legal_status" /> },
    { key: 'usage', el: () => <ChartCard title={ct('usage', 'Usage déclaré')} data={byDeclaredUsage} type={ty('usage', 'bar-h')} colorIndex={5} hidden={byDeclaredUsage.length === 0}
      insight={generateInsight(byDeclaredUsage, 'bar-h', 'les usages déclarés')} crossVariables={cx('usage')} rawRecords={normalized} groupField="declared_usage" /> },
    { key: 'construction-type', el: () => <ChartCard title={ct('construction-type', 'Type construction')} data={byConstructionType} type={ty('construction-type', 'bar-h')} colorIndex={7} hidden={byConstructionType.length === 0}
      insight={generateInsight(byConstructionType, 'bar-h', 'les types de construction')} crossVariables={cx('construction-type')} rawRecords={normalized} groupField="construction_type" /> },
    { key: 'property-category', el: () => <ChartCard title={ct('property-category', 'Catégorie de bien')} data={byPropertyCategory} type={ty('property-category', 'bar-h')} colorIndex={2} hidden={byPropertyCategory.length === 0}
      insight={generateInsight(byPropertyCategory, 'bar-h', 'les catégories de bien')} crossVariables={cx('property-category')} rawRecords={filtered} groupField="property_category" /> },
    { key: 'fraud-detection', el: () => <ChartCard title={ct('fraud-detection', 'Détection fraude')} icon={ShieldAlert} data={fraudData.distribution} type={ty('fraud-detection', 'pie')} colorIndex={4}
      insight={fraudData.suspicious > 0 ? `${fraudData.suspicious} contribution${fraudData.suspicious > 1 ? 's' : ''} signalée${fraudData.suspicious > 1 ? 's' : ''} comme suspecte${fraudData.suspicious > 1 ? 's' : ''}.` : 'Aucune contribution suspecte détectée.'}
      crossVariables={cx('fraud-detection')} rawRecords={filtered} groupField="is_suspicious" /> },
    { key: 'fraud-score', el: () => <ChartCard title={ct('fraud-score', 'Score fraude')} icon={AlertTriangle} data={fraudData.byScore} type={ty('fraud-score', 'bar-v')} colorIndex={4} hidden={fraudData.byScore.length === 0}
      insight={generateInsight(fraudData.byScore, 'bar-v', 'les niveaux de risque')} crossVariables={cx('fraud-score')} rawRecords={filtered} groupField="fraud_score" /> },
    { key: 'fraud-reason', el: () => <ChartCard title={ct('fraud-reason', 'Motif fraude')} data={fraudData.byFraudReason} type={ty('fraud-reason', 'bar-h')} colorIndex={4} labelWidth={120} hidden={fraudData.byFraudReason.length === 0}
      insight={generateInsight(fraudData.byFraudReason, 'bar-h', 'les motifs de fraude')} crossVariables={cx('fraud-reason')} rawRecords={filtered} groupField="fraud_reason" /> },
    { key: 'appeal-status', el: () => <ChartCard title={ct('appeal-status', 'Statut appel')} icon={Gavel} data={appealData.byAppealStatus} type={ty('appeal-status', 'donut')} colorIndex={9} hidden={appealData.byAppealStatus.length === 0}
      insight={generateInsight(appealData.byAppealStatus, 'donut', 'les appels')} crossVariables={cx('appeal-status')} rawRecords={filtered} groupField="appeal_status" /> },
    { key: 'occupation', el: () => <ChartCard title={ct('occupation', 'Occupation')} icon={Home} data={occupationData} type={ty('occupation', 'pie')} colorIndex={12} hidden={occupationData.length === 0}
      insight={generateInsight(occupationData, 'pie', "l'occupation des biens")} crossVariables={cx('occupation')} rawRecords={filtered} groupField="is_occupied" /> },
    { key: 'lease-type', el: () => <ChartCard title={ct('lease-type', 'Type de bail')} icon={KeyRound} data={byLeaseType} type={ty('lease-type', 'donut')} colorIndex={13} hidden={byLeaseType.length === 0}
      insight={generateInsight(byLeaseType, 'donut', 'les types de bail')} crossVariables={cx('lease-type')} rawRecords={filtered} groupField="lease_type" /> },
    { key: 'geo', el: () => <GeoCharts records={filtered} /> },
    { key: 'evolution', el: () => <ChartCard title={ct('evolution', 'Évolution')} icon={TrendingUp} data={trend} type={ty('evolution', 'area')} colorIndex={0} colSpan={2}
      insight={generateInsight(trend, 'area', 'les contributions')} /> },
  ].filter(d => v(d.key)).sort((a, b) => ord(a.key) - ord(b.key)), [filtered, normalized, byContributionType, byStatus, byPropertyTitleType, byLegalStatus, byDeclaredUsage, byConstructionType, byPropertyCategory, byLeaseType, occupationData, fraudData, appealData, trend, v, ct, cx, ty, ord]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.contributions} filter={filter} onChange={setFilter} hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} statusField={filterConfig.statusField} />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {chartDefs.map(d => <React.Fragment key={d.key}>{d.el()}</React.Fragment>)}
      </div>
    </div>
    </FilterLabelContext.Provider>
  );
});
