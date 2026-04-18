import React, { useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Ruler, Calendar, Users, TrendingUp, FileCheck } from 'lucide-react';
import { pct } from '@/utils/analyticsConstants';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { generateInsight } from '@/utils/chartInsights';
import { trendByMonth } from '@/utils/analyticsHelpers';
import { useBlockFilter } from '@/hooks/useBlockFilter';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'boundary';

function extractBoundaries(row: any): any[] {
  const bh = row.boundary_history;
  if (!bh) return [];
  if (Array.isArray(bh)) return bh;
  if (Array.isArray(bh.entries)) return bh.entries;
  if (Array.isArray(bh.history)) return bh.history;
  if (typeof bh === 'object') return [bh];
  return [];
}

export const BoundaryBlock: React.FC<Props> = memo(({ data }) => {
  const { filter, setFilter, filterLabel, filtered, filterConfig, v, ct, ty, ord } = useBlockFilter(TAB_KEY, data.contributions);

  const withBoundary = useMemo(() => filtered.filter(r => extractBoundaries(r).length > 0), [filtered]);

  const coverage = useMemo(() => {
    const w = withBoundary.length;
    const wo = filtered.length - w;
    return [
      ...(w > 0 ? [{ name: 'Avec bornage', value: w }] : []),
      ...(wo > 0 ? [{ name: 'Sans bornage', value: wo }] : []),
    ];
  }, [filtered, withBoundary]);

  const ageDist = useMemo(() => {
    const buckets = [
      { name: '< 1 an', min: 0, max: 1 },
      { name: '1-3 ans', min: 1, max: 3 },
      { name: '3-5 ans', min: 3, max: 5 },
      { name: '5-10 ans', min: 5, max: 10 },
      { name: '10-20 ans', min: 10, max: 20 },
      { name: '> 20 ans', min: 20, max: Infinity },
    ];
    const counts = new Array(buckets.length).fill(0);
    const now = Date.now();
    filtered.forEach(r => {
      extractBoundaries(r).forEach((b: any) => {
        const d = b?.survey_date || b?.date || b?.bornage_date;
        if (!d) return;
        const t = new Date(d).getTime();
        if (isNaN(t)) return;
        const years = (now - t) / (1000 * 60 * 60 * 24 * 365.25);
        if (years < 0) return;
        for (let i = 0; i < buckets.length; i++) {
          if (years >= buckets[i].min && years < buckets[i].max) { counts[i]++; break; }
        }
      });
    });
    return buckets.map((b, i) => ({ name: b.name, value: counts[i] })).filter(b => b.value > 0);
  }, [filtered]);

  const byPurpose = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(r => {
      extractBoundaries(r).forEach((b: any) => {
        const p = b?.boundary_purpose || b?.purpose || b?.motif;
        if (p) map.set(String(p), (map.get(String(p)) || 0) + 1);
      });
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const bySurveyor = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(r => {
      extractBoundaries(r).forEach((b: any) => {
        const s = b?.surveyor_name || b?.surveyor || b?.geometre;
        if (s) map.set(String(s), (map.get(String(s)) || 0) + 1);
      });
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filtered]);

  const trend = useMemo(() => {
    const records: any[] = [];
    filtered.forEach(r => {
      extractBoundaries(r).forEach((b: any) => {
        const d = b?.survey_date || b?.date;
        if (d) records.push({ created_at: d });
      });
    });
    return trendByMonth(records);
  }, [filtered]);

  const totalBoundaries = useMemo(() => filtered.reduce((s, r) => s + extractBoundaries(r).length, 0), [filtered]);
  const distinctSurveyors = useMemo(() => bySurveyor.length, [bySurveyor]);

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: ct('kpi-total', 'Parcelles analysées'), value: filtered.length, cls: 'text-primary' },
    { key: 'kpi-with-boundary', label: ct('kpi-with-boundary', 'Avec bornage'), value: withBoundary.length, cls: 'text-emerald-600', tooltip: pct(withBoundary.length, filtered.length) },
    { key: 'kpi-boundaries', label: ct('kpi-boundaries', 'Procès-verbaux'), value: totalBoundaries, cls: 'text-blue-600' },
    { key: 'kpi-surveyors', label: ct('kpi-surveyors', 'Géomètres'), value: distinctSurveyors, cls: 'text-violet-600' },
  ].filter(k => v(k.key)), [filtered, withBoundary, totalBoundaries, distinctSurveyors, v, ct]);

  const chartDefs = useMemo(() => [
    { key: 'coverage', el: () => <ChartCard title={ct('coverage', 'Couverture bornage')} icon={FileCheck} data={coverage} type={ty('coverage', 'pie')} colorIndex={2} hidden={coverage.length === 0}
      insight={withBoundary.length > 0 ? `${pct(withBoundary.length, filtered.length)} des parcelles déclarent un historique de bornage.` : 'Aucun bornage déclaré.'} /> },
    { key: 'age', el: () => <ChartCard title={ct('age', 'Ancienneté du bornage')} icon={Calendar} data={ageDist} type={ty('age', 'bar-v')} colorIndex={3} hidden={ageDist.length === 0}
      insight={generateInsight(ageDist, 'bar-v', "l'ancienneté des bornages")} /> },
    { key: 'purpose', el: () => <ChartCard title={ct('purpose', 'Motif de bornage')} icon={Ruler} data={byPurpose} type={ty('purpose', 'bar-h')} colorIndex={5} hidden={byPurpose.length === 0}
      insight={generateInsight(byPurpose, 'bar-h', 'les motifs de bornage')} /> },
    { key: 'surveyor', el: () => <ChartCard title={ct('surveyor', 'Géomètres')} icon={Users} data={bySurveyor} type={ty('surveyor', 'bar-h')} colorIndex={7} hidden={bySurveyor.length === 0}
      insight={generateInsight(bySurveyor, 'bar-h', 'les géomètres')} /> },
    { key: 'geo', el: () => <GeoCharts records={withBoundary} /> },
    { key: 'evolution', el: () => <ChartCard title={ct('evolution', 'Évolution bornages')} icon={TrendingUp} data={trend} type={ty('evolution', 'area')} colorIndex={0} colSpan={2} hidden={trend.length === 0}
      insight={generateInsight(trend, 'area', 'les opérations de bornage')} /> },
  ].filter(d => v(d.key)).sort((a, b) => ord(a.key) - ord(b.key)), [filtered, withBoundary, coverage, ageDist, byPurpose, bySurveyor, trend, v, ct, ty, ord]);

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
