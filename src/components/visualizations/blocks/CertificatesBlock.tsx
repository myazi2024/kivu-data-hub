import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Award, TrendingUp, CheckCircle } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard } from '../shared/ChartCard';
import { exportRecordsToCSV } from '@/utils/csvExport';

interface Props { data: LandAnalyticsData; }

export const CertificatesBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.certificates, filter, 'generated_at'), [data.certificates, filter]);

  const byType = useMemo(() => countBy(filtered, 'certificate_type'), [filtered]);
  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered, 'generated_at'), [filtered]);

  const stats = useMemo(() => {
    const generated = filtered.filter(r => r.status === 'generated' || r.status === 'completed').length;
    const pending = filtered.filter(r => r.status === 'pending').length;
    return { generated, pending };
  }, [filtered]);

  const handleExport = useCallback(() => {
    exportRecordsToCSV(filtered, `certificats-${new Date().toISOString().slice(0,10)}`, [
      'id', 'certificate_type', 'parcel_number', 'recipient_name', 'reference_number', 'status', 'generated_at'
    ]);
  }, [filtered]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.certificates} filter={filter} onChange={setFilter} onExport={handleExport} hidePaymentStatus dateField="generated_at" />
      <KpiGrid items={[
        { label: 'Total', value: filtered.length, cls: 'text-primary' },
        { label: 'Générés', value: stats.generated, cls: 'text-emerald-600', tooltip: pct(stats.generated, filtered.length) },
        { label: 'En attente', value: stats.pending, cls: 'text-amber-600', tooltip: pct(stats.pending, filtered.length) },
      ]} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ChartCard title="Type certificat" icon={Award} data={byType} type="bar-h" colorIndex={0} labelWidth={120} />
        <ChartCard title="Statut" icon={CheckCircle} data={byStatus} type="pie" colorIndex={2} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={0} colSpan={2} />
      </div>
    </div>
  );
});
