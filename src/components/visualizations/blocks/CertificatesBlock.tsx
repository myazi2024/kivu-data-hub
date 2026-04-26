import React, { useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { countBy, trendByMonth, CHART_COLORS } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Award, TrendingUp, CheckCircle } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, StackedBarCard, FilterLabelContext } from '../shared/ChartCard';
import { BlockUnscopedRecordsProvider } from '../shared/BlockUnscopedRecordsContext';
import { GeoCharts } from '../shared/GeoCharts';
import { generateInsight, generateStackedInsight } from '@/utils/chartInsights';
import { useBlockFilter } from '@/hooks/useBlockFilter';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'certificates';

export const CertificatesBlock: React.FC<Props> = memo(({ data }) => {
  const { filter, setFilter, filterLabel, filtered, filteredUnscoped, filterConfig, v, ct, cx, ty, ord, exportCSV  } = useBlockFilter(TAB_KEY, data.certificates);

  const byType = useMemo(() => countBy(filtered, 'certificate_type'), [filtered]);
  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered, 'generated_at'), [filtered]);

  const typeTrend = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    const types = new Set<string>();
    filtered.forEach(r => {
      if (!r.generated_at) return;
      const d = new Date(r.generated_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const t = r.certificate_type || '(Non renseigné)';
      types.add(t);
      if (!map.has(key)) map.set(key, new Map());
      const inner = map.get(key)!;
      inner.set(t, (inner.get(t) || 0) + 1);
    });
    return { 
      data: Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => {
        const [y, m] = k.split('-');
        const name = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('fr-FR', { year: '2-digit', month: 'short' });
        const obj: any = { name };
        types.forEach(t => obj[t] = v.get(t) || 0);
        return obj;
      }),
      types: Array.from(types),
    };
  }, [filtered]);

  const stats = useMemo(() => {
    const generated = filtered.filter(r => r.status === 'generated' || r.status === 'completed').length;
    const pending = filtered.filter(r => r.status === 'pending').length;
    const uniqueTypes = new Set(filtered.map(r => r.certificate_type)).size;
    return { generated, pending, uniqueTypes };
  }, [filtered]);

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: ct('kpi-total', 'Total'), value: filtered.length, cls: 'text-primary' },
    { key: 'kpi-generated', label: ct('kpi-generated', 'Générés'), value: stats.generated, cls: 'text-emerald-600', tooltip: pct(stats.generated, filtered.length) },
    { key: 'kpi-pending', label: ct('kpi-pending', 'En attente'), value: stats.pending, cls: 'text-amber-600', tooltip: pct(stats.pending, filtered.length) },
    { key: 'kpi-types', label: ct('kpi-types', 'Types distincts'), value: stats.uniqueTypes, cls: 'text-blue-600' },
  ].filter(k => v(k.key)), [filtered, stats, v, ct]);

  const chartDefs = useMemo(() => [
    { key: 'cert-type', el: () => <ChartCard title={ct('cert-type', 'Type certificat')} icon={Award} data={byType} type={ty('cert-type', 'bar-h')} colorIndex={0} labelWidth={120}
      insight={generateInsight(byType, 'bar-h', 'les types de certificat')} crossVariables={cx('cert-type')} rawRecords={filtered} groupField="certificate_type" /> },
    { key: 'status', el: () => <ChartCard title={ct('status', 'Statut')} icon={CheckCircle} data={byStatus} type={ty('status', 'pie')} colorIndex={2}
      insight={generateInsight(byStatus, 'pie', 'les statuts de certificat')} crossVariables={cx('status')} rawRecords={filtered} groupField="status" /> },
    { key: 'type-trend', el: () => typeTrend.data.length > 1 ? <StackedBarCard title={ct('type-trend', 'Type × Mois')} data={typeTrend.data}
      bars={typeTrend.types.map((t, i) => ({ dataKey: t, name: t, color: CHART_COLORS[i % CHART_COLORS.length] }))}
      maxItems={12}
      insight={generateStackedInsight(typeTrend.data, typeTrend.types.map(t => ({ dataKey: t, name: t })), 'l\'évolution des types de certificat')} /> : null },
    { key: 'geo', el: () => <GeoCharts records={filtered} /> },
    { key: 'evolution', el: () => <ChartCard title={ct('evolution', 'Évolution')} icon={TrendingUp} data={trend} type={ty('evolution', 'area')} colorIndex={0} colSpan={2}
      insight={generateInsight(trend, 'area', 'la génération de certificats')} /> },
  ].filter(d => v(d.key)).sort((a, b) => ord(a.key) - ord(b.key)), [filtered, byType, byStatus, typeTrend, trend, v, ct, cx, ty, ord]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <BlockUnscopedRecordsProvider records={filteredUnscoped}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.certificates} filter={filter} onChange={setFilter} hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} statusField={filterConfig.statusField} />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {chartDefs.map(d => <React.Fragment key={d.key}>{d.el()}</React.Fragment>)}
      </div>
    </div>
    </BlockUnscopedRecordsProvider>
    </FilterLabelContext.Provider>
  );
});
