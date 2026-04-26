import React, { useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { countBy, trendByMonth } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { TrendingUp } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, FilterLabelContext } from '../shared/ChartCard';
import { BlockUnscopedRecordsProvider } from '../shared/BlockUnscopedRecordsContext';
import { GeoCharts } from '../shared/GeoCharts';
import { generateInsight } from '@/utils/chartInsights';
import { useBlockFilter } from '@/hooks/useBlockFilter';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'taxes';

export const TaxesBlock: React.FC<Props> = memo(({ data }) => {
  const { filter, setFilter, filterLabel, filtered, filteredUnscoped, filterConfig, v, ct, cx, ty, ord, exportCSV  } = useBlockFilter(TAB_KEY, data.taxHistory);

  const byStatus = useMemo(() => countBy(filtered, 'payment_status'), [filtered]);
  const byYear = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((t: any) => { const y = String(t.tax_year || '(Non renseigné)'); map.set(y, (map.get(y) || 0) + 1); });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);
  const trend = useMemo(() => trendByMonth(filtered, 'payment_date'), [filtered]);

  const amountBrackets = useMemo(() => {
    const brackets = [
      { name: '< 50 $', min: 0, max: 50 },
      { name: '50 – 200 $', min: 50, max: 200 },
      { name: '200 – 500 $', min: 200, max: 500 },
      { name: '> 500 $', min: 500, max: Infinity },
    ];
    return brackets.map(b => ({
      name: b.name,
      value: filtered.filter((t: any) => (t.amount_usd || 0) >= b.min && (t.amount_usd || 0) < b.max).length,
    })).filter(b => b.value > 0);
  }, [filtered]);

  const statusNorm = (s: string) => {
    const val = (s || '').trim().toLowerCase();
    if (['paid', 'payé', 'payée'].includes(val)) return 'paid';
    if (['pending', 'en_attente', 'unpaid', 'en attente', 'impayé'].includes(val)) return 'pending';
    return val;
  };
  const totalAmount = filtered.reduce((s: number, t: any) => s + (t.amount_usd || 0), 0);
  const paid = filtered.filter((t: any) => statusNorm(t.payment_status) === 'paid').length;
  const paidAmount = filtered.filter((t: any) => statusNorm(t.payment_status) === 'paid').reduce((s: number, t: any) => s + (t.amount_usd || 0), 0);
  const pendingCount = filtered.filter((t: any) => statusNorm(t.payment_status) === 'pending').length;
  const avgAmount = filtered.length > 0 ? Math.round(totalAmount / filtered.length) : 0;
  const recoveryRate = totalAmount > 0 ? `${Math.round((paidAmount / totalAmount) * 100)}%` : 'N/A';

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: ct('kpi-total', 'Total déclarations'), value: filtered.length, cls: 'text-purple-600' },
    { key: 'kpi-revenue', label: ct('kpi-revenue', 'Montant total'), value: `$${totalAmount.toLocaleString()}`, cls: 'text-emerald-600' },
    { key: 'kpi-pending', label: ct('kpi-pending', 'En attente'), value: pendingCount, cls: 'text-amber-600', tooltip: pct(pendingCount, filtered.length) },
    { key: 'kpi-approved', label: ct('kpi-approved', 'Payées'), value: paid, cls: 'text-blue-600', tooltip: pct(paid, filtered.length) },
    { key: 'kpi-recovery', label: ct('kpi-recovery', 'Recouvrement'), value: recoveryRate, cls: 'text-rose-600', tooltip: `Payé: $${paidAmount.toLocaleString()}` },
    { key: 'kpi-avg', label: ct('kpi-avg', 'Montant moy.'), value: `$${avgAmount.toLocaleString()}`, cls: 'text-violet-600' },
  ].filter(k => v(k.key)), [filtered, totalAmount, pendingCount, paid, recoveryRate, paidAmount, avgAmount, v, ct]);

  const chartDefs = useMemo(() => [
    { key: 'status', el: () => <ChartCard title={ct('status', 'Statut paiement')} data={byStatus} type={ty('status', 'bar-v')} colorIndex={0} insight={generateInsight(byStatus, 'bar-v', 'les statuts de taxe')} crossVariables={cx('status')} rawRecords={filtered} groupField="payment_status" /> },
    { key: 'fiscal-year', el: () => <ChartCard title={ct('fiscal-year', 'Exercice fiscal')} data={byYear} type={ty('fiscal-year', 'bar-v')} colorIndex={1} insight={generateInsight(byYear, 'bar-v', 'les exercices fiscaux')} crossVariables={cx('fiscal-year')} rawRecords={filtered} groupField="tax_year" /> },
    { key: 'amount-range', el: () => <ChartCard title={ct('amount-range', 'Tranche montant')} data={amountBrackets} type={ty('amount-range', 'bar-h')} colorIndex={2} insight={generateInsight(amountBrackets, 'bar-h', 'les tranches de montant')} crossVariables={cx('amount-range')} rawRecords={filtered} groupField="amount_usd" /> },
    { key: 'geo', el: () => <GeoCharts records={filtered} /> },
    { key: 'evolution', el: () => <ChartCard title={ct('evolution', 'Évolution')} data={trend} type={ty('evolution', 'area')} colorIndex={3} colSpan={2} icon={TrendingUp} insight={generateInsight(trend, 'area', "l'évolution des taxes")} /> },
  ].filter(d => v(d.key)).sort((a, b) => ord(a.key) - ord(b.key)), [filtered, byStatus, byYear, amountBrackets, trend, v, ct, cx, ty, ord]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
      <BlockUnscopedRecordsProvider records={filteredUnscoped}>
      <div className="space-y-2">
        <AnalyticsFilters data={data.taxHistory} filter={filter} onChange={setFilter} hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} statusField={filterConfig.statusField} />
        <KpiGrid items={kpiItems} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {chartDefs.map(d => <React.Fragment key={d.key}>{d.el()}</React.Fragment>)}
        </div>
      </div>
    </BlockUnscopedRecordsProvider>
    </FilterLabelContext.Provider>
  );
});

TaxesBlock.displayName = 'TaxesBlock';
