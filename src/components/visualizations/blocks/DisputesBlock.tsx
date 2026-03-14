import React, { useState, useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, CHART_COLORS } from '@/utils/analyticsHelpers';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { AlertTriangle, Scale, TrendingUp } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, StackedBarCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';

interface Props { data: LandAnalyticsData; }

export const DisputesBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.disputes, filter), [data.disputes, filter]);
  const enCours = useMemo(() => filtered.filter(d => d.current_status !== 'resolved' && d.current_status !== 'closed'), [filtered]);
  const resolus = useMemo(() => filtered.filter(d => d.current_status === 'resolved' || d.current_status === 'closed'), [filtered]);
  const byNature = useMemo(() => countBy(filtered, 'dispute_nature'), [filtered]);
  const byType = useMemo(() => countBy(filtered, 'dispute_type'), [filtered]);
  const byStatus = useMemo(() => countBy(filtered, 'current_status'), [filtered]);
  const byResolutionLevel = useMemo(() => countBy(enCours, 'resolution_level'), [enCours]);
  const byProvince = useMemo(() => countBy(filtered, 'province'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);
  const natureStatusCross = useMemo(() => {
    const map = new Map<string, { enCours: number; resolu: number }>();
    filtered.forEach(d => {
      const n = d.dispute_nature || 'Non spécifié';
      if (!map.has(n)) map.set(n, { enCours: 0, resolu: 0 });
      const e = map.get(n)!;
      if (d.current_status === 'resolved' || d.current_status === 'closed') e.resolu++; else e.enCours++;
    });
    return Array.from(map.entries()).map(([name, d]) => ({ name, ...d })).sort((a, b) => (b.enCours + b.resolu) - (a.enCours + a.resolu));
  }, [filtered]);
  const resolutionStatus = useMemo(() => [{ name: 'En cours', value: enCours.length }, { name: 'Résolus', value: resolus.length }], [enCours, resolus]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.disputes} filter={filter} onChange={setFilter} />
      <KpiGrid items={[
        { label: 'Total', value: filtered.length, cls: 'text-red-600' },
        { label: 'En cours', value: enCours.length, cls: 'text-amber-600' },
        { label: 'Résolus', value: resolus.length, cls: 'text-emerald-600' },
        { label: 'Natures', value: byNature.length, cls: 'text-purple-600' },
      ]} />
      <div className="grid grid-cols-2 gap-2">
        <ChartCard title="Nature" icon={AlertTriangle} iconColor="text-red-500" data={byNature} type="bar-h" colorIndex={4} labelWidth={110} />
        <ChartCard title="En cours vs Résolus" data={resolutionStatus} type="pie" colorIndex={3} />
        <ChartCard title="Statut détaillé" data={byStatus} type="bar-v" colorIndex={8} />
        <ChartCard title="Type litige" data={byType} type="donut" colorIndex={0} />
        <ChartCard title="Résolution (en cours)" icon={Scale} iconColor="text-purple-500" data={byResolutionLevel} type="bar-h" colorIndex={5} labelWidth={100} />
        <StackedBarCard title="Nature × Résolution" data={natureStatusCross} bars={[
          { dataKey: 'enCours', name: 'En cours', color: CHART_COLORS[3] },
          { dataKey: 'resolu', name: 'Résolus', color: CHART_COLORS[2] },
        ]} layout="vertical" labelWidth={90} maxItems={6} />
        <ChartCard title="Par province" data={byProvince} type="bar-v" colorIndex={4} hidden={byProvince.length === 0} />
        <GeoCharts records={filtered} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={4} colSpan={2} />
      </div>
    </div>
  );
});
