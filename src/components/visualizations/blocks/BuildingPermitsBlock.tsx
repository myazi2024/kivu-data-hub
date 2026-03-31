import React, { useState, useMemo, memo, useContext, useEffect } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, CHART_COLORS, buildFilterLabel } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { FileCheck, CheckCircle, Clock, XCircle, TrendingUp } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { MapProvinceContext } from '../filters/AnalyticsFilters';
import { generateInsight } from '@/utils/chartInsights';
import { useTabChartsConfig, ANALYTICS_TABS_REGISTRY } from '@/hooks/useAnalyticsChartsConfig';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'building-permits';
const defaultItems = [...ANALYTICS_TABS_REGISTRY[TAB_KEY].kpis, ...ANALYTICS_TABS_REGISTRY[TAB_KEY].charts];

export const BuildingPermitsBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const mapProvince = useContext(MapProvinceContext);
  useEffect(() => { setFilter(f => ({ ...defaultFilter, province: mapProvince || undefined })); }, [mapProvince]);
  const filterLabel = useMemo(() => buildFilterLabel(filter), [filter]);
  const { isChartVisible, getChartConfig } = useTabChartsConfig(TAB_KEY, defaultItems);
  const filtered = useMemo(() => applyFilters(data.buildingPermits, filter), [data.buildingPermits, filter]);

  const byStatus = useMemo(() => countBy(filtered, 'administrative_status'), [filtered]);
  const byService = useMemo(() => countBy(filtered, 'issuing_service'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered, 'issue_date'), [filtered]);

  const byCurrent = useMemo(() => {
    const current = filtered.filter(p => p.is_current).length;
    const expired = filtered.filter(p => !p.is_current).length;
    return [
      { name: 'En cours', value: current },
      { name: 'Expiré', value: expired },
    ].filter(d => d.value > 0);
  }, [filtered]);

  const validityBrackets = useMemo(() => {
    const brackets = [
      { name: '≤ 6 mois', min: 0, max: 7 },
      { name: '7–12 mois', min: 7, max: 13 },
      { name: '13–24 mois', min: 13, max: 25 },
      { name: '> 24 mois', min: 25, max: Infinity },
    ];
    return brackets.map(b => ({
      name: b.name,
      value: filtered.filter(p => (p.validity_period_months || 0) >= b.min && (p.validity_period_months || 0) < b.max).length,
    })).filter(b => b.value > 0);
  }, [filtered]);

  const approved = filtered.filter(p => p.administrative_status === 'approved' || p.administrative_status === 'approuvé').length;
  const pending = filtered.filter(p => p.administrative_status === 'pending' || p.administrative_status === 'en_attente').length;
  const rejected = filtered.filter(p => p.administrative_status === 'rejected' || p.administrative_status === 'rejeté').length;
  const approvalRate = filtered.length > 0 ? Math.round((approved / filtered.length) * 100) : 0;

  const dt = (key: string, fallback: string) => getChartConfig(key)?.custom_title || fallback;

  const kpis = [
    { key: 'kpi-total', label: dt('kpi-total', 'Total'), value: filtered.length, icon: FileCheck },
    { key: 'kpi-approved', label: dt('kpi-approved', 'Approuvées'), value: approved, icon: CheckCircle },
    { key: 'kpi-pending', label: dt('kpi-pending', 'En attente'), value: pending, icon: Clock },
    { key: 'kpi-rejected', label: dt('kpi-rejected', 'Rejetées'), value: rejected, icon: XCircle },
    { key: 'kpi-approval-rate', label: dt('kpi-approval-rate', 'Taux approbation'), value: `${approvalRate}%`, icon: TrendingUp },
  ].filter(k => isChartVisible(k.key));

  return (
    <FilterLabelContext.Provider value={filterLabel}>
      <div className="space-y-3">
        <AnalyticsFilters data={data.buildingPermits} filter={filter} onChange={setFilter} />
        <KpiGrid kpis={kpis} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {isChartVisible('status') && <ChartCard title={dt('status', 'Statut')} data={byStatus} config={getChartConfig('status')} insight={generateInsight(byStatus, dt('status', 'Statut'))} />}
          {isChartVisible('request-type') && <ChartCard title={dt('request-type', 'En cours vs Expiré')} data={byCurrent} config={getChartConfig('request-type')} insight={generateInsight(byCurrent, dt('request-type', 'En cours vs Expiré'))} />}
          {isChartVisible('construction-type') && <ChartCard title={dt('construction-type', 'Service émetteur')} data={byService} config={getChartConfig('construction-type')} insight={generateInsight(byService, dt('construction-type', 'Service émetteur'))} />}
          {isChartVisible('declared-usage') && <ChartCard title={dt('declared-usage', 'Validité')} data={validityBrackets} config={getChartConfig('declared-usage')} insight={generateInsight(validityBrackets, dt('declared-usage', 'Validité'))} />}
          {isChartVisible('geo') && <GeoCharts data={filtered} title={dt('geo', 'Géographie')} />}
          {isChartVisible('evolution') && <ChartCard title={dt('evolution', 'Évolution')} data={trend} config={getChartConfig('evolution')} className="md:col-span-2" insight={generateInsight(trend, dt('evolution', 'Évolution'))} />}
        </div>
      </div>
    </FilterLabelContext.Provider>
  );
});

BuildingPermitsBlock.displayName = 'BuildingPermitsBlock';
