import React, { useState, useMemo, memo, useContext, useEffect } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, buildFilterLabel, CHART_COLORS } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { ShieldAlert, TrendingUp, AlertTriangle, Link2 } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, StackedBarCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { MapProvinceContext, VilleFilterContext, CommuneFilterContext, QuartierFilterContext } from '../filters/AnalyticsFilters';
import { generateInsight, generateStackedInsight } from '@/utils/chartInsights';
import { useTabChartsConfig, useTabFilterConfig, ANALYTICS_TABS_REGISTRY } from '@/hooks/useAnalyticsChartsConfig';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'fraud';
const defaultItems = [...ANALYTICS_TABS_REGISTRY[TAB_KEY].kpis, ...ANALYTICS_TABS_REGISTRY[TAB_KEY].charts];

export const FraudAttemptsBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const mapProvince = useContext(MapProvinceContext);
  const mapVille = useContext(VilleFilterContext);
  const mapCommune = useContext(CommuneFilterContext);
  const mapQuartier = useContext(QuartierFilterContext);
  useEffect(() => { setFilter(f => ({ ...f, province: mapProvince || undefined, ville: mapVille || undefined, commune: mapCommune || undefined, quartier: mapQuartier || undefined })); }, [mapProvince, mapVille, mapCommune, mapQuartier]);
  const filterLabel = useMemo(() => buildFilterLabel(filter), [filter]);
  const { isChartVisible, getChartConfig } = useTabChartsConfig(TAB_KEY, defaultItems);
  const filterConfig = useTabFilterConfig(TAB_KEY);
  const filtered = useMemo(() => applyFilters(data.fraudAttempts, filter), [data.fraudAttempts, filter]);

  const byFraudType = useMemo(() => countBy(filtered, 'fraud_type'), [filtered]);
  const bySeverity = useMemo(() => countBy(filtered, 'severity'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  // Cross: type × severity
  const typeSeverityCross = useMemo(() => {
    const map = new Map<string, { critical: number; high: number; medium: number; low: number }>();
    filtered.forEach(r => {
      const t = r.fraud_type || '(Non renseigné)';
      if (!map.has(t)) map.set(t, { critical: 0, high: 0, medium: 0, low: 0 });
      const entry = map.get(t)!;
      const sev = (r.severity || 'low') as keyof typeof entry;
      if (sev in entry) entry[sev]++;
    });
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => (b.critical + b.high + b.medium + b.low) - (a.critical + a.high + a.medium + a.low));
  }, [filtered]);

  // Linked vs unlinked
  const linkedData = useMemo(() => {
    const linked = filtered.filter(r => r.contribution_id).length;
    const unlinked = filtered.length - linked;
    if (filtered.length === 0) return [];
    return [
      { name: 'Liée à contrib.', value: linked },
      { name: 'Indépendante', value: unlinked },
    ];
  }, [filtered]);

  const stats = useMemo(() => {
    const critical = filtered.filter(r => r.severity === 'critical' || r.severity === 'high').length;
    const medium = filtered.filter(r => r.severity === 'medium').length;
    const low = filtered.filter(r => r.severity === 'low').length;
    const withContribution = filtered.filter(r => r.contribution_id).length;
    return { critical, medium, low, withContribution };
  }, [filtered]);

  const ct = (key: string, fallback: string) => getChartConfig(key)?.custom_title || fallback;
  const v = isChartVisible;

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: ct('kpi-total', 'Total'), value: filtered.length, cls: 'text-red-600' },
    { key: 'kpi-critical', label: ct('kpi-critical', 'Critiques/Élevées'), value: stats.critical, cls: 'text-rose-600', tooltip: pct(stats.critical, filtered.length) },
    { key: 'kpi-medium', label: ct('kpi-medium', 'Moyennes'), value: stats.medium, cls: 'text-amber-600', tooltip: pct(stats.medium, filtered.length) },
    { key: 'kpi-low', label: ct('kpi-low', 'Faibles'), value: stats.low, cls: 'text-emerald-600', tooltip: pct(stats.low, filtered.length) },
    { key: 'kpi-linked', label: ct('kpi-linked', 'Liées contrib.'), value: stats.withContribution, cls: 'text-blue-600', tooltip: 'Tentatives liées à une contribution' },
  ].filter(k => v(k.key)), [filtered, stats, v, getChartConfig]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.fraudAttempts} filter={filter} onChange={setFilter} hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} statusField={filterConfig.statusField} />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {v('fraud-type') && <ChartCard title={ct('fraud-type', 'Type de fraude')} icon={ShieldAlert} data={byFraudType} type="bar-h" colorIndex={4} labelWidth={120}
          insight={generateInsight(byFraudType, 'bar-h', 'les types de fraude')} />}
        {v('severity') && <ChartCard title={ct('severity', 'Sévérité')} icon={AlertTriangle} data={bySeverity} type="pie" colorIndex={4}
          insight={stats.critical > 0 ? `${stats.critical} tentative${stats.critical > 1 ? 's' : ''} de sévérité critique ou élevée nécessitant une attention immédiate.` : generateInsight(bySeverity, 'pie', 'les niveaux de sévérité')} />}
        {v('type-severity-cross') && <StackedBarCard title={ct('type-severity-cross', 'Type × Sévérité')} data={typeSeverityCross} bars={[
          { dataKey: 'critical', name: 'Critique', color: CHART_COLORS[4] },
          { dataKey: 'high', name: 'Élevée', color: CHART_COLORS[6] },
          { dataKey: 'medium', name: 'Moyenne', color: CHART_COLORS[3] },
          { dataKey: 'low', name: 'Faible', color: CHART_COLORS[2] },
        ]} layout="vertical" labelWidth={100} maxItems={6}
          insight={generateStackedInsight(typeSeverityCross, [{ dataKey: 'critical', name: 'Critique' }, { dataKey: 'high', name: 'Élevée' }], 'croisement type/sévérité')} />}
        {v('linked') && <ChartCard title={ct('linked', 'Liées à contrib.')} icon={Link2} data={linkedData} type="donut" colorIndex={0} hidden={linkedData.length === 0}
          insight={generateInsight(linkedData, 'donut', 'le lien avec les contributions')} />}
        {v('geo') && <GeoCharts records={filtered} />}
        {v('evolution') && <ChartCard title={ct('evolution', 'Évolution')} icon={TrendingUp} data={trend} type="area" colorIndex={4} colSpan={2}
          insight={generateInsight(trend, 'area', 'les tentatives de fraude')} />}
      </div>
    </div>
    </FilterLabelContext.Provider>
  );
});
