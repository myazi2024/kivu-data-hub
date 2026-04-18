import React, { useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { ShieldCheck, AlertTriangle, GitCompare, History, FileWarning, Scale } from 'lucide-react';
import { pct } from '@/utils/analyticsConstants';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { generateInsight } from '@/utils/chartInsights';
import { useBlockFilter } from '@/hooks/useBlockFilter';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'consistency';

/** Safely extract an array from a JSONB field that may be array, {items|entries|history}, or single object */
function toArray(field: any): any[] {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  if (Array.isArray(field.items)) return field.items;
  if (Array.isArray(field.entries)) return field.entries;
  if (Array.isArray(field.history)) return field.history;
  if (typeof field === 'object') return [field];
  return [];
}

export const ConsistencyBlock: React.FC<Props> = memo(({ data }) => {
  const { filter, setFilter, filterLabel, filtered, filterConfig, v, ct, cx, ty, ord } = useBlockFilter(TAB_KEY, data.contributions);

  // Index officials by parcel_number for fast lookup
  const officialTaxByParcel = useMemo(() => {
    const map = new Map<string, number>();
    (data.taxHistory || []).forEach((t: any) => {
      const k = String(t.parcel_number || t.parcels?.parcel_number || '').trim();
      if (k) map.set(k, (map.get(k) || 0) + 1);
    });
    return map;
  }, [data.taxHistory]);

  const officialMortgageByParcel = useMemo(() => {
    const map = new Map<string, number>();
    (data.mortgages || []).forEach((m: any) => {
      const k = String(m.parcel_number || m.parcels?.parcel_number || '').trim();
      if (k) map.set(k, (map.get(k) || 0) + 1);
    });
    return map;
  }, [data.mortgages]);

  const officialDisputeByParcel = useMemo(() => {
    const map = new Map<string, number>();
    (data.disputes || []).forEach((d: any) => {
      const k = String(d.parcel_number || '').trim();
      if (k) map.set(k, (map.get(k) || 0) + 1);
    });
    return map;
  }, [data.disputes]);

  // ---- Tax consistency ----
  const taxComparison = useMemo(() => {
    let declared = 0, official = 0, both = 0, declaredOnly = 0, officialOnly = 0;
    filtered.forEach(r => {
      const decl = toArray(r.tax_history).length > 0;
      const off = (officialTaxByParcel.get(String(r.parcel_number || '').trim()) || 0) > 0;
      if (decl) declared++;
      if (off) official++;
      if (decl && off) both++;
      else if (decl && !off) declaredOnly++;
      else if (!decl && off) officialOnly++;
    });
    return { declared, official, both, declaredOnly, officialOnly };
  }, [filtered, officialTaxByParcel]);

  const taxComparisonChart = useMemo(() => [
    { name: 'Cohérent (déclaré + officiel)', value: taxComparison.both },
    { name: 'Déclaré uniquement', value: taxComparison.declaredOnly },
    { name: 'Officiel uniquement', value: taxComparison.officialOnly },
  ].filter(x => x.value > 0), [taxComparison]);

  // ---- Mortgage consistency ----
  const mortgageComparison = useMemo(() => {
    let declared = 0, official = 0, both = 0, declaredOnly = 0, officialOnly = 0;
    filtered.forEach(r => {
      const decl = toArray(r.mortgage_history).length > 0;
      const off = (officialMortgageByParcel.get(String(r.parcel_number || '').trim()) || 0) > 0;
      if (decl) declared++;
      if (off) official++;
      if (decl && off) both++;
      else if (decl && !off) declaredOnly++;
      else if (!decl && off) officialOnly++;
    });
    return { declared, official, both, declaredOnly, officialOnly };
  }, [filtered, officialMortgageByParcel]);

  const mortgageComparisonChart = useMemo(() => [
    { name: 'Cohérent (déclaré + officiel)', value: mortgageComparison.both },
    { name: 'Déclaré uniquement', value: mortgageComparison.declaredOnly },
    { name: 'Officiel uniquement', value: mortgageComparison.officialOnly },
  ].filter(x => x.value > 0), [mortgageComparison]);

  // ---- Dispute consistency ----
  const disputeComparison = useMemo(() => {
    let declared = 0, official = 0, both = 0, declaredOnly = 0, officialOnly = 0;
    filtered.forEach(r => {
      const decl = !!r.has_dispute || toArray(r.dispute_data).length > 0;
      const off = (officialDisputeByParcel.get(String(r.parcel_number || '').trim()) || 0) > 0;
      if (decl) declared++;
      if (off) official++;
      if (decl && off) both++;
      else if (decl && !off) declaredOnly++;
      else if (!decl && off) officialOnly++;
    });
    return { declared, official, both, declaredOnly, officialOnly };
  }, [filtered, officialDisputeByParcel]);

  const disputeComparisonChart = useMemo(() => [
    { name: 'Cohérent (déclaré + officiel)', value: disputeComparison.both },
    { name: 'Déclaré uniquement', value: disputeComparison.declaredOnly },
    { name: 'Officiel uniquement', value: disputeComparison.officialOnly },
  ].filter(x => x.value > 0), [disputeComparison]);

  // ---- Corrective contributions (linked to original parcel) ----
  const correctiveStats = useMemo(() => {
    const corrective = filtered.filter(r => !!r.original_parcel_id);
    const initial = filtered.length - corrective.length;
    return {
      corrective: corrective.length,
      initial,
      list: [
        { name: 'Initiales', value: initial },
        { name: 'Correctives', value: corrective.length },
      ].filter(x => x.value > 0),
    };
  }, [filtered]);

  // ---- Ownership history declared ----
  const ownershipDeclared = useMemo(() => {
    const withHist = filtered.filter(r => toArray(r.ownership_history).length > 0);
    return {
      count: withHist.length,
      list: [
        { name: 'Avec historique', value: withHist.length },
        { name: 'Sans historique', value: filtered.length - withHist.length },
      ].filter(x => x.value > 0),
    };
  }, [filtered]);

  // ---- Global incoherence rate ----
  const totalIncoherences = taxComparison.declaredOnly + taxComparison.officialOnly
    + mortgageComparison.declaredOnly + mortgageComparison.officialOnly
    + disputeComparison.declaredOnly + disputeComparison.officialOnly;
  const totalChecks = filtered.length * 3; // tax + mortgage + dispute
  const incoherenceRate = totalChecks > 0 ? (totalIncoherences / totalChecks) * 100 : 0;

  // Records with at least one incoherence (for geo)
  const incoherentRecords = useMemo(() => filtered.filter(r => {
    const k = String(r.parcel_number || '').trim();
    const taxDecl = toArray(r.tax_history).length > 0;
    const taxOff = (officialTaxByParcel.get(k) || 0) > 0;
    const mortDecl = toArray(r.mortgage_history).length > 0;
    const mortOff = (officialMortgageByParcel.get(k) || 0) > 0;
    const dispDecl = !!r.has_dispute || toArray(r.dispute_data).length > 0;
    const dispOff = (officialDisputeByParcel.get(k) || 0) > 0;
    return (taxDecl !== taxOff) || (mortDecl !== mortOff) || (dispDecl !== dispOff);
  }), [filtered, officialTaxByParcel, officialMortgageByParcel, officialDisputeByParcel]);

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: ct('kpi-total', 'Contributions analysées'), value: filtered.length, cls: 'text-primary' },
    { key: 'kpi-incoherence-rate', label: ct('kpi-incoherence-rate', 'Taux incohérence'), value: `${incoherenceRate.toFixed(1)}%`, cls: 'text-rose-600', tooltip: `${totalIncoherences} écarts sur ${totalChecks} vérifications` },
    { key: 'kpi-tax-mismatch', label: ct('kpi-tax-mismatch', 'Écarts taxes'), value: taxComparison.declaredOnly + taxComparison.officialOnly, cls: 'text-amber-600' },
    { key: 'kpi-mortgage-mismatch', label: ct('kpi-mortgage-mismatch', 'Écarts hypothèques'), value: mortgageComparison.declaredOnly + mortgageComparison.officialOnly, cls: 'text-amber-600' },
    { key: 'kpi-dispute-mismatch', label: ct('kpi-dispute-mismatch', 'Écarts litiges'), value: disputeComparison.declaredOnly + disputeComparison.officialOnly, cls: 'text-amber-600' },
    { key: 'kpi-corrective', label: ct('kpi-corrective', 'Contributions correctives'), value: correctiveStats.corrective, cls: 'text-indigo-600', tooltip: pct(correctiveStats.corrective, filtered.length) },
    { key: 'kpi-ownership-declared', label: ct('kpi-ownership-declared', 'Avec historique propriété'), value: ownershipDeclared.count, cls: 'text-emerald-600', tooltip: pct(ownershipDeclared.count, filtered.length) },
  ].filter(k => v(k.key)), [filtered, incoherenceRate, totalIncoherences, totalChecks, taxComparison, mortgageComparison, disputeComparison, correctiveStats, ownershipDeclared, v, ct]);

  const chartDefs = useMemo(() => [
    {
      key: 'tax-comparison', el: () => <ChartCard title={ct('tax-comparison', 'Cohérence taxes (déclaré vs officiel)')} icon={Scale} data={taxComparisonChart} type={ty('tax-comparison', 'pie')} colorIndex={3} hidden={taxComparisonChart.length === 0}
        insight={taxComparison.declaredOnly + taxComparison.officialOnly > 0
          ? `${taxComparison.declaredOnly + taxComparison.officialOnly} écarts détectés entre déclaratif CCC et table officielle.`
          : 'Aucun écart détecté.'} />
    },
    {
      key: 'mortgage-comparison', el: () => <ChartCard title={ct('mortgage-comparison', 'Cohérence hypothèques')} icon={Scale} data={mortgageComparisonChart} type={ty('mortgage-comparison', 'pie')} colorIndex={5} hidden={mortgageComparisonChart.length === 0}
        insight={generateInsight(mortgageComparisonChart, 'pie', 'la cohérence hypothèques')} />
    },
    {
      key: 'dispute-comparison', el: () => <ChartCard title={ct('dispute-comparison', 'Cohérence litiges')} icon={AlertTriangle} data={disputeComparisonChart} type={ty('dispute-comparison', 'pie')} colorIndex={4} hidden={disputeComparisonChart.length === 0}
        insight={generateInsight(disputeComparisonChart, 'pie', 'la cohérence litiges')} />
    },
    {
      key: 'corrective', el: () => <ChartCard title={ct('corrective', 'Initiales vs Correctives')} icon={GitCompare} data={correctiveStats.list} type={ty('corrective', 'donut')} colorIndex={6} hidden={correctiveStats.list.length === 0}
        insight={correctiveStats.corrective > 0 ? `${pct(correctiveStats.corrective, filtered.length)} des contributions sont des corrections d'une parcelle existante.` : 'Aucune contribution corrective.'} />
    },
    {
      key: 'ownership-declared', el: () => <ChartCard title={ct('ownership-declared', 'Historique propriété déclaré')} icon={History} data={ownershipDeclared.list} type={ty('ownership-declared', 'donut')} colorIndex={2} hidden={ownershipDeclared.list.length === 0}
        insight={generateInsight(ownershipDeclared.list, 'donut', 'la déclaration historique propriété')} />
    },
    { key: 'geo', el: () => <GeoCharts records={incoherentRecords} /> },
  ].filter(d => v(d.key)).sort((a, b) => ord(a.key) - ord(b.key)), [taxComparisonChart, mortgageComparisonChart, disputeComparisonChart, correctiveStats, ownershipDeclared, incoherentRecords, taxComparison, filtered, v, ct, ty, ord]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
      <div className="space-y-2">
        <AnalyticsFilters data={data.contributions} filter={filter} onChange={setFilter} hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} statusField={filterConfig.statusField} />
        <KpiGrid items={kpiItems} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {chartDefs.map(d => <React.Fragment key={d.key}>{d.el()}</React.Fragment>)}
        </div>
      </div>
    </FilterLabelContext.Provider>
  );
});
