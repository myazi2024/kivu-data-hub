import React, { useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { countBy, trendByMonth, CHART_COLORS, VALID_LIFTING_STATUSES } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { AlertTriangle, Scale, TrendingUp, Users, ShieldCheck, MessageSquare } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, StackedBarCard, FilterLabelContext, MultiAreaChartCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { generateInsight, generateStackedInsight } from '@/utils/chartInsights';
import { useBlockFilter } from '@/hooks/useBlockFilter';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'disputes';

export const DisputesBlock: React.FC<Props> = memo(({ data }) => {
  const { filter, setFilter, filterLabel, filtered, filterConfig, v, ct, cx, ty, ord, exportCSV } = useBlockFilter(TAB_KEY, data.disputes);

  const { enCours, resolus, byNature, byType, byStatus, byResolutionLevel, byDeclarantQuality, trend, natureStatusCross, resolutionStatus } = useMemo(() => {
    const enCours = filtered.filter(d => !['resolved', 'closed', 'resolu', 'leve'].includes(d.current_status));
    const resolus = filtered.filter(d => ['resolved', 'closed', 'resolu', 'leve'].includes(d.current_status));
    const byNature = countBy(filtered, 'dispute_nature');
    const byType = countBy(filtered, 'dispute_type');
    const byStatus = countBy(filtered, 'current_status');
    const byResolutionLevel = countBy(filtered, 'resolution_level');
    const byDeclarantQuality = countBy(filtered, 'declarant_quality');
    const trend = trendByMonth(filtered);

    const map = new Map<string, { enCours: number; resolu: number }>();
    filtered.forEach(d => {
      const n = d.dispute_nature || '(Non renseigné)';
      if (!map.has(n)) map.set(n, { enCours: 0, resolu: 0 });
      const e = map.get(n)!;
      if (['resolved', 'closed', 'resolu', 'leve'].includes(d.current_status)) e.resolu++; else e.enCours++;
    });
    const natureStatusCross = Array.from(map.entries()).map(([name, d]) => ({ name, ...d })).sort((a, b) => (b.enCours + b.resolu) - (a.enCours + a.resolu));
    const resolutionStatus = [{ name: 'En cours', value: enCours.length }, { name: 'Résolus', value: resolus.length }];
    return { enCours, resolus, byNature, byType, byStatus, byResolutionLevel, byDeclarantQuality, trend, natureStatusCross, resolutionStatus };
  }, [filtered]);

  const avgDuration = useMemo(() => {
    const withStart = filtered.filter(d => d.dispute_start_date);
    if (withStart.length === 0) return 0;
    const now = Date.now();
    const total = withStart.reduce((s, d) => {
      const start = new Date(d.dispute_start_date).getTime();
      return s + (now - start) / (1000 * 60 * 60 * 24);
    }, 0);
    return Math.round(total / withStart.length);
  }, [filtered]);

  const resolutionTrend = useMemo(() => {
    const map = new Map<string, { total: number; resolved: number }>();
    filtered.forEach(d => {
      if (!d.created_at) return;
      const dt = new Date(d.created_at);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, { total: 0, resolved: 0 });
      const e = map.get(key)!;
      e.total++;
      if (['resolved', 'closed', 'resolu', 'leve'].includes(d.current_status)) e.resolved++;
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, d]) => {
      const [y, m] = key.split('-');
      const name = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('fr-FR', { year: '2-digit', month: 'short' });
      return { name, value: d.total > 0 ? Math.round((d.resolved / d.total) * 100) : 0 };
    });
  }, [filtered]);

  const liftingDisputes = useMemo(() =>
    filtered.filter(d => d.lifting_status && VALID_LIFTING_STATUSES.includes(d.lifting_status)),
    [filtered]
  );

  const byLiftingStatus = useMemo(() => countBy(liftingDisputes, 'lifting_status'), [liftingDisputes]);
  const byLiftingResolutionLevel = useMemo(() => countBy(liftingDisputes, 'resolution_level'), [liftingDisputes]);
  const byLiftingNature = useMemo(() => countBy(liftingDisputes, 'dispute_nature'), [liftingDisputes]);
  const byLiftingReason = useMemo(() => countBy(liftingDisputes.filter(r => r.lifting_reason), 'lifting_reason'), [liftingDisputes]);
  const liftingTrend = useMemo(() => trendByMonth(liftingDisputes), [liftingDisputes]);

  const trendByNature = useMemo(() => {
    const natures = [...new Set(filtered.map(d => d.dispute_nature).filter(Boolean))].sort();
    const series = natures.map(nature => ({
      key: nature,
      label: nature,
      data: trendByMonth(filtered.filter(d => d.dispute_nature === nature)),
    }));
    series.unshift({ key: 'all', label: 'Tous', data: trend });
    return series;
  }, [filtered, trend]);

  const liftingStats = useMemo(() => {
    const approved = liftingDisputes.filter(d => d.lifting_status === 'approved').length;
    const pending = liftingDisputes.filter(d => ['pending', 'demande_levee', 'in_review'].includes(d.lifting_status)).length;
    const rejected = liftingDisputes.filter(d => d.lifting_status === 'rejected').length;
    return { approved, pending, rejected };
  }, [liftingDisputes]);

  const liftingSuccessTrend = useMemo(() => {
    const map = new Map<string, { total: number; approved: number }>();
    liftingDisputes.forEach(d => {
      if (!d.created_at) return;
      const dt = new Date(d.created_at);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, { total: 0, approved: 0 });
      const e = map.get(key)!;
      e.total++;
      if (d.lifting_status === 'approved') e.approved++;
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, d]) => {
      const [y, m] = key.split('-');
      const name = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('fr-FR', { year: '2-digit', month: 'short' });
      return { name, value: d.total > 0 ? Math.round((d.approved / d.total) * 100) : 0 };
    });
  }, [liftingDisputes]);

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: ct('kpi-total', 'Total'), value: filtered.length, cls: 'text-red-600' },
    { key: 'kpi-en-cours', label: ct('kpi-en-cours', 'En cours'), value: enCours.length, cls: 'text-amber-600', tooltip: pct(enCours.length, filtered.length) },
    { key: 'kpi-resolus', label: ct('kpi-resolus', 'Résolus'), value: resolus.length, cls: 'text-emerald-600', tooltip: pct(resolus.length, filtered.length) },
    { key: 'kpi-rate', label: ct('kpi-rate', 'Taux résolution'), value: pct(resolus.length, filtered.length), cls: 'text-purple-600' },
    { key: 'kpi-duration', label: ct('kpi-duration', 'Durée moy.'), value: avgDuration > 0 ? `${avgDuration}j` : 'N/A', cls: 'text-blue-600', tooltip: 'Durée moyenne des litiges (jours)' },
    { key: 'kpi-lifting-total', label: ct('kpi-lifting-total', 'Demandes levée'), value: liftingDisputes.length, cls: 'text-sky-600' },
    { key: 'kpi-lifting-approved', label: ct('kpi-lifting-approved', 'Levées approuvées'), value: liftingStats.approved, cls: 'text-emerald-600', tooltip: pct(liftingStats.approved, liftingDisputes.length) },
    { key: 'kpi-lifting-pending', label: ct('kpi-lifting-pending', 'Levées en attente'), value: liftingStats.pending, cls: 'text-amber-600', tooltip: pct(liftingStats.pending, liftingDisputes.length) },
    { key: 'kpi-lifting-success', label: ct('kpi-lifting-success', 'Taux réussite levée'), value: pct(liftingStats.approved, liftingDisputes.length), cls: 'text-purple-600' },
  ].filter(k => v(k.key)), [filtered, enCours, resolus, avgDuration, liftingDisputes, liftingStats, v, ct]);

  const mainChartDefs = useMemo(() => [
    { key: 'nature', el: () => <ChartCard title={ct('nature', 'Nature')} icon={AlertTriangle} iconColor="text-red-500" data={byNature} type={ty('nature', 'bar-h')} colorIndex={4} labelWidth={110}
      insight={generateInsight(byNature, 'bar-h', 'les natures de litige')} crossVariables={cx('nature')} rawRecords={filtered} groupField="dispute_nature" /> },
    { key: 'resolution-status', el: () => <ChartCard title={ct('resolution-status', 'En cours vs Résolus')} data={resolutionStatus} type={ty('resolution-status', 'pie')} colorIndex={3}
      insight={`${pct(resolus.length, filtered.length)} des litiges sont résolus à ce jour.`} crossVariables={cx('resolution-status')} rawRecords={filtered} groupField="current_status" /> },
    { key: 'status-detail', el: () => <ChartCard title={ct('status-detail', 'Statut détaillé')} data={byStatus} type={ty('status-detail', 'bar-v')} colorIndex={8}
      insight={generateInsight(byStatus, 'bar-v', 'les statuts détaillés')} crossVariables={cx('status-detail')} rawRecords={filtered} groupField="current_status" /> },
    { key: 'type', el: () => <ChartCard title={ct('type', 'Type litige')} data={byType} type={ty('type', 'donut')} colorIndex={0}
      insight={generateInsight(byType, 'donut', 'les types de litige')} crossVariables={cx('type')} rawRecords={filtered} groupField="dispute_type" /> },
    { key: 'resolution-level', el: () => <ChartCard title={ct('resolution-level', 'Niveau résolution')} icon={Scale} iconColor="text-purple-500" data={byResolutionLevel} type={ty('resolution-level', 'bar-h')} colorIndex={5} labelWidth={100}
      insight={generateInsight(byResolutionLevel, 'bar-h', 'les niveaux de résolution')} crossVariables={cx('resolution-level')} rawRecords={filtered} groupField="resolution_level" /> },
    { key: 'declarant-quality', el: () => <ChartCard title={ct('declarant-quality', 'Qualité déclarant')} icon={Users} data={byDeclarantQuality} type={ty('declarant-quality', 'donut')} colorIndex={1} hidden={byDeclarantQuality.length === 0}
      insight={generateInsight(byDeclarantQuality, 'donut', 'les déclarants')} crossVariables={cx('declarant-quality')} rawRecords={filtered} groupField="declarant_quality" /> },
    { key: 'nature-resolution', el: () => <StackedBarCard title={ct('nature-resolution', 'Nature × Résolution')} data={natureStatusCross} bars={[
      { dataKey: 'enCours', name: 'En cours', color: CHART_COLORS[3] },
      { dataKey: 'resolu', name: 'Résolus', color: CHART_COLORS[2] },
    ]} layout="vertical" labelWidth={90} maxItems={6}
      insight={generateStackedInsight(natureStatusCross, [{ dataKey: 'enCours', name: 'En cours' }, { dataKey: 'resolu', name: 'Résolus' }], 'croisement nature/résolution')} /> },
    { key: 'geo', el: () => <GeoCharts records={filtered} /> },
    { key: 'resolution-rate', el: () => <ChartCard title={ct('resolution-rate', 'Taux résolution %')} icon={TrendingUp} data={resolutionTrend} type={ty('resolution-rate', 'area')} colorIndex={2} colSpan={2} hidden={resolutionTrend.length < 2}
      insight={generateInsight(resolutionTrend, 'area', 'le taux de résolution mensuel')} /> },
    { key: 'evolution', el: () => <MultiAreaChartCard title={ct('evolution', 'Évolution du nombre de litige foncier')} icon={TrendingUp} colSpan={2} series={trendByNature}
      insight={generateInsight(trend, 'area', 'les litiges')} /> },
  ].filter(d => v(d.key)).sort((a, b) => ord(a.key) - ord(b.key)), [filtered, resolus, byNature, resolutionStatus, byStatus, byType, byResolutionLevel, byDeclarantQuality, natureStatusCross, resolutionTrend, trendByNature, trend, v, ct, cx, ty, ord]);

  const liftingChartDefs = useMemo(() => [
    { key: 'lifting-status', el: () => <ChartCard title={ct('lifting-status', 'Statut levée')} icon={ShieldCheck} data={byLiftingStatus} type={ty('lifting-status', 'pie')} colorIndex={9}
      insight={generateInsight(byLiftingStatus, 'pie', 'les statuts de levée')} crossVariables={cx('lifting-status')} rawRecords={liftingDisputes} groupField="lifting_status" /> },
    { key: 'lifting-resolution-level', el: () => <ChartCard title={ct('lifting-resolution-level', 'Niveau résolution (levée)')} icon={Scale} iconColor="text-purple-500" data={byLiftingResolutionLevel} type={ty('lifting-resolution-level', 'bar-h')} colorIndex={9} labelWidth={100}
      insight={generateInsight(byLiftingResolutionLevel, 'bar-h', 'les niveaux de résolution')} crossVariables={cx('lifting-resolution-level')} rawRecords={liftingDisputes} groupField="resolution_level" /> },
    { key: 'lifting-nature', el: () => <ChartCard title={ct('lifting-nature', 'Nature litige (levée)')} data={byLiftingNature} type={ty('lifting-nature', 'bar-h')} colorIndex={4} labelWidth={100}
      insight={generateInsight(byLiftingNature, 'bar-h', 'les natures de litige concernées')} crossVariables={cx('lifting-nature')} rawRecords={liftingDisputes} groupField="dispute_nature" /> },
    { key: 'lifting-reason', el: () => <ChartCard title={ct('lifting-reason', 'Motif de levée')} icon={MessageSquare} data={byLiftingReason} type={ty('lifting-reason', 'bar-h')} colorIndex={6} labelWidth={120} hidden={byLiftingReason.length === 0}
      insight={generateInsight(byLiftingReason, 'bar-h', 'les motifs de levée')} crossVariables={cx('lifting-reason')} rawRecords={liftingDisputes} groupField="lifting_reason" /> },
    { key: 'lifting-geo', el: () => <GeoCharts records={liftingDisputes} /> },
    { key: 'lifting-success-rate', el: () => <ChartCard title={ct('lifting-success-rate', 'Taux réussite %')} icon={TrendingUp} data={liftingSuccessTrend} type={ty('lifting-success-rate', 'area')} colorIndex={2} colSpan={2} hidden={liftingSuccessTrend.length < 2}
      insight={generateInsight(liftingSuccessTrend, 'area', 'le taux de réussite des levées')} /> },
    { key: 'lifting-evolution', el: () => <ChartCard title={ct('lifting-evolution', 'Évolution levées')} icon={TrendingUp} data={liftingTrend} type={ty('lifting-evolution', 'area')} colorIndex={9} colSpan={2}
      insight={generateInsight(liftingTrend, 'area', 'les levées de litige')} /> },
  ].filter(d => v(d.key)).sort((a, b) => ord(a.key) - ord(b.key)), [liftingDisputes, byLiftingStatus, byLiftingResolutionLevel, byLiftingNature, byLiftingReason, liftingSuccessTrend, liftingTrend, v, ct, cx, ty, ord]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.disputes} filter={filter} onChange={setFilter}
        hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation}
        dateField={filterConfig.dateField} statusField={filterConfig.statusField}
        onExport={() => exportCSV(['parcel_number','province','dispute_nature','dispute_type','current_status','resolution_level','declarant_quality','created_at'])}
      />
      <KpiGrid items={kpiItems} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {mainChartDefs.map(d => <React.Fragment key={d.key}>{d.el()}</React.Fragment>)}
      </div>

      {liftingDisputes.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-2 pb-1">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Levées de litige</h3>
            <span className="text-xs text-muted-foreground">({liftingDisputes.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {liftingChartDefs.map(d => <React.Fragment key={d.key}>{d.el()}</React.Fragment>)}
          </div>
        </>
      )}
    </div>
    </FilterLabelContext.Provider>
  );
});
