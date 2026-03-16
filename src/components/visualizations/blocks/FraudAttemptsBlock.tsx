import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { ShieldAlert, TrendingUp, AlertTriangle } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard } from '../shared/ChartCard';
import { exportRecordsToCSV } from '@/utils/csvExport';
import { generateInsight } from '@/utils/chartInsights';

interface Props { data: LandAnalyticsData; }

export const FraudAttemptsBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.fraudAttempts, filter), [data.fraudAttempts, filter]);

  const byFraudType = useMemo(() => countBy(filtered, 'fraud_type'), [filtered]);
  const bySeverity = useMemo(() => countBy(filtered, 'severity'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  const stats = useMemo(() => {
    const critical = filtered.filter(r => r.severity === 'critical' || r.severity === 'high').length;
    const medium = filtered.filter(r => r.severity === 'medium').length;
    const low = filtered.filter(r => r.severity === 'low').length;
    const withContribution = filtered.filter(r => r.contribution_id).length;
    return { critical, medium, low, withContribution };
  }, [filtered]);

  const handleExport = useCallback(() => {
    exportRecordsToCSV(filtered, `fraudes-${new Date().toISOString().slice(0,10)}`, [
      'id', 'fraud_type', 'severity', 'description', 'contribution_id', 'user_id', 'created_at'
    ]);
  }, [filtered]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.fraudAttempts} filter={filter} onChange={setFilter} onExport={handleExport} hidePaymentStatus hideStatus />
      <KpiGrid items={[
        { label: 'Total', value: filtered.length, cls: 'text-red-600' },
        { label: 'Critiques/Élevées', value: stats.critical, cls: 'text-rose-600', tooltip: pct(stats.critical, filtered.length) },
        { label: 'Moyennes', value: stats.medium, cls: 'text-amber-600', tooltip: pct(stats.medium, filtered.length) },
        { label: 'Faibles', value: stats.low, cls: 'text-emerald-600', tooltip: pct(stats.low, filtered.length) },
        { label: 'Liées contrib.', value: stats.withContribution, cls: 'text-blue-600', tooltip: 'Tentatives liées à une contribution' },
      ]} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ChartCard title="Type de fraude" icon={ShieldAlert} data={byFraudType} type="bar-h" colorIndex={4} labelWidth={120}
          insight={generateInsight(byFraudType, 'bar-h', 'les types de fraude')} />
        <ChartCard title="Sévérité" icon={AlertTriangle} data={bySeverity} type="pie" colorIndex={4}
          insight={stats.critical > 0 ? `${stats.critical} tentative${stats.critical > 1 ? 's' : ''} de sévérité critique ou élevée nécessitant une attention immédiate.` : generateInsight(bySeverity, 'pie', 'les niveaux de sévérité')} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={4} colSpan={2}
          insight={generateInsight(trend, 'area', 'les tentatives de fraude')} />
      </div>
    </div>
  );
});
