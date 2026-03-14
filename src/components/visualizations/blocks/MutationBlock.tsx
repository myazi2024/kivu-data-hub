import React, { useState, useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth } from '@/utils/analyticsHelpers';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { ArrowRightLeft, TrendingUp } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';

interface Props { data: LandAnalyticsData; }

export const MutationBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.mutationRequests, filter), [data.mutationRequests, filter]);
  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const byType = useMemo(() => countBy(filtered, 'mutation_type'), [filtered]);
  const byProvince = useMemo(() => countBy(filtered, 'province'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.mutationRequests} filter={filter} onChange={setFilter} />
      <KpiGrid items={[
        { label: 'Total', value: filtered.length, cls: 'text-orange-600' },
        { label: 'Approuvées', value: filtered.filter(r => r.status === 'approved').length, cls: 'text-emerald-600' },
        { label: 'En attente', value: filtered.filter(r => r.status === 'pending').length, cls: 'text-amber-600' },
      ]} />
      <div className="grid grid-cols-2 gap-2">
        <ChartCard title="Statut" icon={ArrowRightLeft} data={byStatus} type="pie" colorIndex={6} />
        <ChartCard title="Type mutation" data={byType} type="bar-h" colorIndex={6} labelWidth={100} />
        <ChartCard title="Par province" data={byProvince} type="bar-v" colorIndex={6} hidden={byProvince.length === 0} />
        <GeoCharts records={filtered} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={6} colSpan={2} />
      </div>
    </div>
  );
});
