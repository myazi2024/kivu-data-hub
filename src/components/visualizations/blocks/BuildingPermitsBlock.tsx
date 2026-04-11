import React, { useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { countBy, trendByMonth } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { TrendingUp } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { generateInsight } from '@/utils/chartInsights';
import { useBlockFilter } from '@/hooks/useBlockFilter';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'building-permits';

export const BuildingPermitsBlock: React.FC<Props> = memo(({ data }) => {
  const { filter, setFilter, filterLabel, filtered, filterConfig, v, ct, cx } = useBlockFilter(TAB_KEY, data.buildingPermits);

  const byStatus = useMemo(() => countBy(filtered, 'administrative_status'), [filtered]);
  const byService = useMemo(() => countBy(filtered, 'issuing_service'), [filtered]);
  const byPermitType = useMemo(() => {
    const types = filtered.map(p => {
      const num = (p.permit_number || '').toLowerCase();
      if (num.includes('reg') || num.includes('régul')) return 'Régularisation';
      return 'Construction';
    });
    const map = new Map<string, number>();
    types.forEach(t => map.set(t, (map.get(t) || 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filtered]);
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

  const statusNorm = (s: string) => {
    const low = (s || '').toLowerCase().trim();
    if (['approved', 'approuvé', 'conforme', 'délivré'].includes(low)) return 'approved';
    if (['pending', 'en_attente', 'en attente'].includes(low)) return 'pending';
    if (['rejected', 'rejeté', 'non conforme'].includes(low)) return 'rejected';
    return low;
  };
  const approved = filtered.filter(p => statusNorm(p.administrative_status) === 'approved').length;
  const pending = filtered.filter(p => statusNorm(p.administrative_status) === 'pending').length;
  const rejected = filtered.filter(p => statusNorm(p.administrative_status) === 'rejected').length;
  const approvalRate = filtered.length > 0 ? Math.round((approved / filtered.length) * 100) : 0;

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: ct('kpi-total', 'Total'), value: filtered.length, cls: 'text-teal-600' },
    { key: 'kpi-approved', label: ct('kpi-approved', 'Approuvées'), value: approved, cls: 'text-emerald-600', tooltip: pct(approved, filtered.length) },
    { key: 'kpi-pending', label: ct('kpi-pending', 'En attente'), value: pending, cls: 'text-amber-600', tooltip: pct(pending, filtered.length) },
    { key: 'kpi-rejected', label: ct('kpi-rejected', 'Rejetées'), value: rejected, cls: 'text-red-600', tooltip: pct(rejected, filtered.length) },
    { key: 'kpi-approval-rate', label: ct('kpi-approval-rate', 'Taux approbation'), value: `${approvalRate}%`, cls: 'text-blue-600' },
  ].filter(k => v(k.key)), [filtered, approved, pending, rejected, approvalRate, v, ct]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
      <div className="space-y-2">
        <AnalyticsFilters data={data.buildingPermits} filter={filter} onChange={setFilter} hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} statusField={filterConfig.statusField} />
        <KpiGrid items={kpiItems} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {v('status') && <ChartCard title={ct('status', 'Statut administratif')} data={byStatus} type="bar-v" colorIndex={0} insight={generateInsight(byStatus, 'bar-v', 'les statuts des autorisations')} crossVariables={cx('status')} rawRecords={filtered} groupField="administrative_status" />}
          {v('current-status') && <ChartCard title={ct('current-status', 'En cours vs Expiré')} data={byCurrent} type="pie" colorIndex={1} insight={generateInsight(byCurrent, 'pie', 'la validité des permis')} crossVariables={cx('current-status')} rawRecords={filtered} groupField="is_current" />}
          {v('issuing-service') && <ChartCard title={ct('issuing-service', 'Service émetteur')} data={byService} type="bar-h" colorIndex={2} labelWidth={100} insight={generateInsight(byService, 'bar-h', 'les services émetteurs')} crossVariables={cx('issuing-service')} rawRecords={filtered} groupField="issuing_service" />}
          {v('validity-period') && <ChartCard title={ct('validity-period', 'Période de validité')} data={validityBrackets} type="bar-v" colorIndex={3} insight={generateInsight(validityBrackets, 'bar-v', 'les périodes de validité')} crossVariables={cx('validity-period')} rawRecords={filtered} groupField="validity_period_months" />}
          {v('permit-type') && <ChartCard title={ct('permit-type', 'Type de permis')} data={byPermitType} type="pie" colorIndex={5} hidden={byPermitType.length === 0} insight={generateInsight(byPermitType, 'pie', 'les types de permis')} crossVariables={cx('permit-type')} rawRecords={filtered} groupField="permit_number" />}
          {v('geo') && <GeoCharts records={filtered} />}
          {v('evolution') && <ChartCard title={ct('evolution', 'Évolution')} data={trend} type="area" colorIndex={4} colSpan={2} icon={TrendingUp} insight={generateInsight(trend, 'area', "l'évolution des autorisations")} />}
        </div>
      </div>
    </FilterLabelContext.Provider>
  );
});

BuildingPermitsBlock.displayName = 'BuildingPermitsBlock';
