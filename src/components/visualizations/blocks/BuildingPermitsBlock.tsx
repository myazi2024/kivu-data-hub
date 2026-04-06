import React, { useState, useMemo, memo, useContext, useEffect } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, buildFilterLabel } from '@/utils/analyticsHelpers';
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
  useEffect(() => { setFilter(f => ({ ...f, province: mapProvince || undefined, ville: undefined })); }, [mapProvince]);
  const filterLabel = useMemo(() => buildFilterLabel(filter), [filter]);
  const { isChartVisible: v, getChartConfig } = useTabChartsConfig(TAB_KEY, defaultItems);
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

  const approved = filtered.filter(p => ['approved', 'approuvé'].includes(p.administrative_status)).length;
  const pending = filtered.filter(p => ['pending', 'en_attente'].includes(p.administrative_status)).length;
  const rejected = filtered.filter(p => ['rejected', 'rejeté'].includes(p.administrative_status)).length;
  const approvalRate = filtered.length > 0 ? Math.round((approved / filtered.length) * 100) : 0;

  const t = (key: string, fallback: string) => getChartConfig(key)?.custom_title || fallback;

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: t('kpi-total', 'Total'), value: filtered.length, cls: 'text-teal-600' },
    { key: 'kpi-approved', label: t('kpi-approved', 'Approuvées'), value: approved, cls: 'text-emerald-600', tooltip: pct(approved, filtered.length) },
    { key: 'kpi-pending', label: t('kpi-pending', 'En attente'), value: pending, cls: 'text-amber-600', tooltip: pct(pending, filtered.length) },
    { key: 'kpi-rejected', label: t('kpi-rejected', 'Rejetées'), value: rejected, cls: 'text-red-600', tooltip: pct(rejected, filtered.length) },
    { key: 'kpi-approval-rate', label: t('kpi-approval-rate', 'Taux approbation'), value: `${approvalRate}%`, cls: 'text-blue-600' },
  ].filter(k => v(k.key)), [filtered, approved, pending, rejected, approvalRate, v, getChartConfig]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
      <div className="space-y-2">
        <AnalyticsFilters data={data.buildingPermits} filter={filter} onChange={setFilter} />
        <KpiGrid items={kpiItems} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {v('status') && <ChartCard title={t('status', 'Statut administratif')} data={byStatus} type="bar-v" colorIndex={0} insight={generateInsight(byStatus, 'bar-v', 'les statuts des autorisations')} />}
          {v('current-status') && <ChartCard title={t('current-status', 'En cours vs Expiré')} data={byCurrent} type="pie" colorIndex={1} insight={generateInsight(byCurrent, 'pie', 'la validité des permis')} />}
          {v('issuing-service') && <ChartCard title={t('issuing-service', 'Service émetteur')} data={byService} type="bar-h" colorIndex={2} labelWidth={100} insight={generateInsight(byService, 'bar-h', 'les services émetteurs')} />}
          {v('validity-period') && <ChartCard title={t('validity-period', 'Période de validité')} data={validityBrackets} type="bar-v" colorIndex={3} insight={generateInsight(validityBrackets, 'bar-v', 'les périodes de validité')} />}
          {v('geo') && <GeoCharts records={filtered} />}
          {v('evolution') && <ChartCard title={t('evolution', 'Évolution')} data={trend} type="area" colorIndex={4} colSpan={2} icon={TrendingUp} insight={generateInsight(trend, 'area', "l'évolution des autorisations")} />}
        </div>
      </div>
    </FilterLabelContext.Provider>
  );
});

BuildingPermitsBlock.displayName = 'BuildingPermitsBlock';
