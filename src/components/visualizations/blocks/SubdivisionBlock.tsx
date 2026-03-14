import React, { useState, useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth } from '@/utils/analyticsHelpers';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Scissors, TrendingUp } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';

interface Props { data: LandAnalyticsData; }

export const SubdivisionBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.subdivisionRequests, filter), [data.subdivisionRequests, filter]);
  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const byProvince = useMemo(() => countBy(filtered, 'province'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);
  const totalLots = useMemo(() => filtered.reduce((s, r) => s + (r.number_of_lots || 0), 0), [filtered]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.subdivisionRequests} filter={filter} onChange={setFilter} />
      <KpiGrid items={[
        { label: 'Total', value: filtered.length, cls: 'text-teal-600' },
        { label: 'Lots prévus', value: totalLots, cls: 'text-blue-600' },
        { label: 'Approuvées', value: filtered.filter(r => r.status === 'approved').length, cls: 'text-emerald-600' },
      ]} />
      <div className="grid grid-cols-2 gap-2">
        <ChartCard title="Statut" icon={Scissors} data={byStatus} type="pie" colorIndex={7} />
        <ChartCard title="Par province" data={byProvince} type="bar-h" colorIndex={7} labelWidth={80} hidden={byProvince.length === 0} />
        <GeoCharts records={filtered} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={7} colSpan={2} />
      </div>
    </div>
  );
});
