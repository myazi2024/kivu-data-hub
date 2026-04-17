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

const TAB_KEY = 'mortgages';

export const MortgagesBlock: React.FC<Props> = memo(({ data }) => {
  const { filter, setFilter, filterLabel, filtered, filterConfig, v, ct, cx, ty, ord, exportCSV } = useBlockFilter(TAB_KEY, data.mortgages);

  const byCreditorType = useMemo(() => countBy(filtered, 'creditor_type'), [filtered]);
  const byStatus = useMemo(() => countBy(filtered, 'mortgage_status'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered, 'contract_date'), [filtered]);

  const amountBrackets = useMemo(() => {
    const brackets = [
      { name: '< 5 000 $', min: 0, max: 5000 },
      { name: '5k – 20k $', min: 5000, max: 20000 },
      { name: '20k – 50k $', min: 20000, max: 50000 },
      { name: '50k – 100k $', min: 50000, max: 100000 },
      { name: '> 100k $', min: 100000, max: Infinity },
    ];
    return brackets.map(b => ({
      name: b.name,
      value: filtered.filter(m => (m.mortgage_amount_usd || 0) >= b.min && (m.mortgage_amount_usd || 0) < b.max).length,
    })).filter(b => b.value > 0);
  }, [filtered]);

  const durationBrackets = useMemo(() => {
    const brackets = [
      { name: '≤ 12 mois', min: 0, max: 13 },
      { name: '13–36 mois', min: 13, max: 37 },
      { name: '37–60 mois', min: 37, max: 61 },
      { name: '> 60 mois', min: 61, max: Infinity },
    ];
    return brackets.map(b => ({
      name: b.name,
      value: filtered.filter(m => (m.duration_months || 0) >= b.min && (m.duration_months || 0) < b.max).length,
    })).filter(b => b.value > 0);
  }, [filtered]);

  const statusNorm = (s: string) => {
    const val = (s || '').trim().toLowerCase();
    if (['active', 'actif', 'en_cours'].includes(val)) return 'active';
    if (['paid', 'soldée', 'soldee', 'closed'].includes(val)) return 'paid';
    return val;
  };
  const active = filtered.filter(m => statusNorm(m.mortgage_status) === 'active').length;
  const paid = filtered.filter(m => statusNorm(m.mortgage_status) === 'paid').length;
  const totalAmount = filtered.reduce((s: number, m: any) => s + (m.mortgage_amount_usd || 0), 0);
  const avgAmount = filtered.length > 0 ? Math.round(totalAmount / filtered.length) : 0;
  const avgDuration = filtered.length > 0 ? Math.round(filtered.reduce((s: number, m: any) => s + (m.duration_months || 0), 0) / filtered.length) : 0;

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: ct('kpi-total', 'Total'), value: filtered.length, cls: 'text-indigo-600' },
    { key: 'kpi-active', label: ct('kpi-active', 'Actives'), value: active, cls: 'text-emerald-600', tooltip: pct(active, filtered.length) },
    { key: 'kpi-paid', label: ct('kpi-paid', 'Soldées'), value: paid, cls: 'text-blue-600', tooltip: pct(paid, filtered.length) },
    { key: 'kpi-amount', label: ct('kpi-amount', 'Montant total'), value: `$${totalAmount.toLocaleString()}`, cls: 'text-amber-600' },
    { key: 'kpi-avg-amount', label: ct('kpi-avg-amount', 'Montant moy.'), value: `$${avgAmount.toLocaleString()}`, cls: 'text-rose-600' },
    { key: 'kpi-avg-duration', label: ct('kpi-avg-duration', 'Durée moy.'), value: avgDuration > 0 ? `${avgDuration} mois` : 'N/A', cls: 'text-violet-600' },
  ].filter(k => v(k.key)), [filtered, active, paid, totalAmount, avgAmount, avgDuration, v, ct]);

  const chartDefs = useMemo(() => [
    { key: 'creditor-type', el: () => <ChartCard title={ct('creditor-type', 'Type créancier')} data={byCreditorType} type={ty('creditor-type', 'donut')} colorIndex={0} insight={generateInsight(byCreditorType, 'donut', 'les types de créancier')} crossVariables={cx('creditor-type')} rawRecords={filtered} groupField="creditor_type" /> },
    { key: 'amount-brackets', el: () => <ChartCard title={ct('amount-brackets', 'Montants')} data={amountBrackets} type={ty('amount-brackets', 'bar-v')} colorIndex={1} insight={generateInsight(amountBrackets, 'bar-v', 'les montants hypothécaires')} crossVariables={cx('amount-brackets')} rawRecords={filtered} groupField="mortgage_amount_usd" /> },
    { key: 'status', el: () => <ChartCard title={ct('status', 'Statut')} data={byStatus} type={ty('status', 'pie')} colorIndex={2} insight={generateInsight(byStatus, 'pie', 'les statuts hypothécaires')} crossVariables={cx('status')} rawRecords={filtered} groupField="mortgage_status" /> },
    { key: 'duration', el: () => <ChartCard title={ct('duration', 'Durée (mois)')} data={durationBrackets} type={ty('duration', 'bar-v')} colorIndex={3} insight={generateInsight(durationBrackets, 'bar-v', 'les durées hypothécaires')} crossVariables={cx('duration')} rawRecords={filtered} groupField="duration_months" /> },
    { key: 'geo', el: () => <GeoCharts records={filtered} /> },
    { key: 'evolution', el: () => <ChartCard title={ct('evolution', 'Évolution')} data={trend} type={ty('evolution', 'area')} colorIndex={4} colSpan={2} icon={TrendingUp} insight={generateInsight(trend, 'area', "l'évolution des hypothèques")} /> },
  ].filter(d => v(d.key)).sort((a, b) => ord(a.key) - ord(b.key)), [filtered, byCreditorType, amountBrackets, byStatus, durationBrackets, trend, v, ct, cx, ty, ord]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
      <div className="space-y-2">
        <AnalyticsFilters data={data.mortgages} filter={filter} onChange={setFilter} hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} statusField={filterConfig.statusField} onExport={() => exportCSV(['parcel_id', 'province', 'creditor_type', 'mortgage_status', 'mortgage_amount_usd', 'duration_months', 'contract_date', 'created_at'])} />
        <KpiGrid items={kpiItems} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {chartDefs.map(d => <React.Fragment key={d.key}>{d.el()}</React.Fragment>)}
        </div>
      </div>
    </FilterLabelContext.Provider>
  );
});

MortgagesBlock.displayName = 'MortgagesBlock';
