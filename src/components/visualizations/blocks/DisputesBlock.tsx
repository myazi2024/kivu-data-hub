import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, CHART_COLORS } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { AlertTriangle, Scale, TrendingUp, Users } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, StackedBarCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { exportRecordsToCSV } from '@/utils/csvExport';
import { generateInsight, generateStackedInsight } from '@/utils/chartInsights';

interface Props { data: LandAnalyticsData; }

export const DisputesBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.disputes, filter), [data.disputes, filter]);

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

  const handleExport = useCallback(() => {
    exportRecordsToCSV(filtered, `litiges-${new Date().toISOString().slice(0,10)}`, [
      'id', 'parcel_number', 'dispute_nature', 'dispute_type', 'current_status', 'resolution_level',
      'declarant_quality', 'dispute_start_date', 'lifting_status', 'province', 'ville', 'commune', 'created_at'
    ]);
  }, [filtered]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.disputes} filter={filter} onChange={setFilter} onExport={handleExport}
        statusField="current_status" hidePaymentStatus
      />
      <KpiGrid items={[
        { label: 'Total', value: filtered.length, cls: 'text-red-600' },
        { label: 'En cours', value: enCours.length, cls: 'text-amber-600', tooltip: pct(enCours.length, filtered.length) },
        { label: 'Résolus', value: resolus.length, cls: 'text-emerald-600', tooltip: pct(resolus.length, filtered.length) },
        { label: 'Taux résolution', value: pct(resolus.length, filtered.length), cls: 'text-purple-600' },
        { label: 'Durée moy.', value: avgDuration > 0 ? `${avgDuration}j` : 'N/A', cls: 'text-blue-600', tooltip: 'Durée moyenne des litiges (jours)' },
      ]} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ChartCard title="Nature" icon={AlertTriangle} iconColor="text-red-500" data={byNature} type="bar-h" colorIndex={4} labelWidth={110}
          insight={generateInsight(byNature, 'bar-h', 'les natures de litige')} />
        <ChartCard title="En cours vs Résolus" data={resolutionStatus} type="pie" colorIndex={3}
          insight={`${pct(resolus.length, filtered.length)} des litiges sont résolus à ce jour.`} />
        <ChartCard title="Statut détaillé" data={byStatus} type="bar-v" colorIndex={8}
          insight={generateInsight(byStatus, 'bar-v', 'les statuts détaillés')} />
        <ChartCard title="Type litige" data={byType} type="donut" colorIndex={0}
          insight={generateInsight(byType, 'donut', 'les types de litige')} />
        <ChartCard title="Niveau résolution" icon={Scale} iconColor="text-purple-500" data={byResolutionLevel} type="bar-h" colorIndex={5} labelWidth={100}
          insight={generateInsight(byResolutionLevel, 'bar-h', 'les niveaux de résolution')} />
        <ChartCard title="Qualité déclarant" icon={Users} data={byDeclarantQuality} type="donut" colorIndex={1} hidden={byDeclarantQuality.length === 0}
          insight={generateInsight(byDeclarantQuality, 'donut', 'les déclarants')} />
        <StackedBarCard title="Nature × Résolution" data={natureStatusCross} bars={[
          { dataKey: 'enCours', name: 'En cours', color: CHART_COLORS[3] },
          { dataKey: 'resolu', name: 'Résolus', color: CHART_COLORS[2] },
        ]} layout="vertical" labelWidth={90} maxItems={6}
          insight={generateStackedInsight(natureStatusCross, [{ dataKey: 'enCours', name: 'En cours' }, { dataKey: 'resolu', name: 'Résolus' }], 'croisement nature/résolution')} />
        <GeoCharts records={filtered} />
        <ChartCard title="Taux résolution %" icon={TrendingUp} data={resolutionTrend} type="area" colorIndex={2} colSpan={2} hidden={resolutionTrend.length < 2}
          insight={generateInsight(resolutionTrend, 'area', 'le taux de résolution mensuel')} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={4} colSpan={2}
          insight={generateInsight(trend, 'area', 'les litiges')} />
      </div>
    </div>
  );
});
