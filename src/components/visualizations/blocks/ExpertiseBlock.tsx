import React, { useState, useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth } from '@/utils/analyticsHelpers';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Search, TrendingUp } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';

interface Props { data: LandAnalyticsData; }

export const ExpertiseBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.expertiseRequests, filter), [data.expertiseRequests, filter]);
  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const byProvince = useMemo(() => countBy(filtered, 'province'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.expertiseRequests} filter={filter} onChange={setFilter} />
      <KpiGrid items={[
        { label: 'Total', value: filtered.length, cls: 'text-violet-600' },
        { label: 'Complétées', value: filtered.filter(r => r.status === 'completed').length, cls: 'text-emerald-600' },
        { label: 'En cours', value: filtered.filter(r => ['pending', 'in_progress', 'assigned'].includes(r.status)).length, cls: 'text-amber-600' },
      ]} />
      <div className="grid grid-cols-2 gap-2">
        <ChartCard title="Statut" icon={Search} data={byStatus} type="pie" colorIndex={5} />
        <ChartCard title="Par province" data={byProvince} type="bar-h" colorIndex={5} labelWidth={80} />
        <GeoCharts records={filtered} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={5} colSpan={2} />
      </div>
    </div>
  );
});
