import React, { useState, useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth } from '@/utils/analyticsHelpers';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { ShieldCheck, Scale, TrendingUp } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';

interface Props { data: LandAnalyticsData; }

export const DisputeLiftingBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const liftingDisputes = useMemo(() => data.disputes.filter(d => d.lifting_status || d.lifting_request_reference), [data.disputes]);
  const filtered = useMemo(() => applyFilters(liftingDisputes, filter), [liftingDisputes, filter]);
  const byLiftingStatus = useMemo(() => countBy(filtered, 'lifting_status'), [filtered]);
  const byResolutionLevel = useMemo(() => countBy(filtered, 'resolution_level'), [filtered]);
  const byNature = useMemo(() => countBy(filtered, 'dispute_nature'), [filtered]);
  const byProvince = useMemo(() => countBy(filtered, 'province'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={liftingDisputes} filter={filter} onChange={setFilter} />
      <KpiGrid items={[
        { label: 'Total levées', value: filtered.length, cls: 'text-sky-600' },
        { label: 'Approuvées', value: filtered.filter(d => d.lifting_status === 'approved').length, cls: 'text-emerald-600' },
        { label: 'En attente', value: filtered.filter(d => d.lifting_status === 'pending' || d.lifting_status === 'demande_levee').length, cls: 'text-amber-600' },
      ]} />
      <div className="grid grid-cols-2 gap-2">
        <ChartCard title="Statut levée" icon={ShieldCheck} data={byLiftingStatus} type="pie" colorIndex={9} />
        <ChartCard title="Niveau résolution" icon={Scale} iconColor="text-purple-500" data={byResolutionLevel} type="bar-h" colorIndex={9} labelWidth={100} />
        <ChartCard title="Nature litige" data={byNature} type="bar-h" colorIndex={4} labelWidth={100} />
        <ChartCard title="Par province" data={byProvince} type="bar-v" colorIndex={9} hidden={byProvince.length === 0} />
        <GeoCharts records={filtered} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={9} colSpan={2} />
      </div>
    </div>
  );
});
