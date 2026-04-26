import React, { useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { ShieldAlert, AlertTriangle, Clock, FileText } from 'lucide-react';
import { pct } from '@/utils/analyticsConstants';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, FilterLabelContext } from '../shared/ChartCard';
import { BlockUnscopedRecordsProvider } from '../shared/BlockUnscopedRecordsContext';
import { GeoCharts } from '../shared/GeoCharts';
import { generateInsight } from '@/utils/chartInsights';
import { useBlockFilter } from '@/hooks/useBlockFilter';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'servitudes';

/** Extract servitude entries from a single contribution row */
function extractServitudes(row: any): any[] {
  const sd = row.servitude_data;
  if (!sd) return [];
  if (Array.isArray(sd)) return sd;
  if (Array.isArray(sd.servitudes)) return sd.servitudes;
  if (Array.isArray(sd.items)) return sd.items;
  if (typeof sd === 'object') return [sd];
  return [];
}

export const ServitudesBlock: React.FC<Props> = memo(({ data }) => {
  const { filter, setFilter, filterLabel, filtered, filteredUnscoped, filterConfig, v, ct, cx, ty, ord  } = useBlockFilter(TAB_KEY, data.contributions);

  // Parcels with at least one servitude
  const encumbered = useMemo(() => filtered.filter(r => extractServitudes(r).length > 0), [filtered]);

  const encumberedDist = useMemo(() => {
    const e = encumbered.length;
    const free = filtered.length - e;
    return [
      ...(e > 0 ? [{ name: 'Grevées', value: e }] : []),
      ...(free > 0 ? [{ name: 'Libres', value: free }] : []),
    ];
  }, [filtered, encumbered]);

  const byServitudeType = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(r => {
      extractServitudes(r).forEach((s: any) => {
        const t = s?.type || s?.servitude_type || s?.nature || 'Non spécifié';
        map.set(String(t), (map.get(String(t)) || 0) + 1);
      });
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const byBeneficiary = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(r => {
      extractServitudes(r).forEach((s: any) => {
        const b = s?.beneficiary || s?.beneficiaire || s?.holder;
        if (b) map.set(String(b), (map.get(String(b)) || 0) + 1);
      });
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filtered]);

  const durationDist = useMemo(() => {
    const buckets = [
      { name: '< 1 an', min: 0, max: 1 },
      { name: '1-5 ans', min: 1, max: 5 },
      { name: '5-10 ans', min: 5, max: 10 },
      { name: '10-25 ans', min: 10, max: 25 },
      { name: '> 25 ans / perpétuel', min: 25, max: Infinity },
    ];
    const counts = new Array(buckets.length).fill(0);
    filtered.forEach(r => {
      extractServitudes(r).forEach((s: any) => {
        const d = s?.duration_years ?? s?.duree_annees ?? s?.years;
        if (d == null || d <= 0) return;
        for (let i = 0; i < buckets.length; i++) {
          if (d >= buckets[i].min && d < buckets[i].max) { counts[i]++; break; }
        }
      });
    });
    return buckets.map((b, i) => ({ name: b.name, value: counts[i] })).filter(b => b.value > 0);
  }, [filtered]);

  const servitudesPerParcel = useMemo(() => {
    const map = new Map<string, number>();
    encumbered.forEach(r => {
      const n = extractServitudes(r).length;
      const k = n === 1 ? '1' : n === 2 ? '2' : n === 3 ? '3' : n <= 5 ? '4-5' : '6+';
      map.set(k, (map.get(k) || 0) + 1);
    });
    const order = ['1', '2', '3', '4-5', '6+'];
    return order.filter(k => map.has(k)).map(k => ({ name: k, value: map.get(k)! }));
  }, [encumbered]);

  const totalServitudes = useMemo(() => filtered.reduce((s, r) => s + extractServitudes(r).length, 0), [filtered]);
  const distinctTypes = useMemo(() => byServitudeType.length, [byServitudeType]);

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: ct('kpi-total', 'Parcelles analysées'), value: filtered.length, cls: 'text-primary' },
    { key: 'kpi-encumbered', label: ct('kpi-encumbered', 'Grevées'), value: encumbered.length, cls: 'text-amber-600', tooltip: pct(encumbered.length, filtered.length) },
    { key: 'kpi-servitudes', label: ct('kpi-servitudes', 'Servitudes'), value: totalServitudes, cls: 'text-rose-600', tooltip: 'Total servitudes recensées' },
    { key: 'kpi-types', label: ct('kpi-types', 'Types distincts'), value: distinctTypes, cls: 'text-indigo-600' },
  ].filter(k => v(k.key)), [filtered, encumbered, totalServitudes, distinctTypes, v, ct]);

  const chartDefs = useMemo(() => [
    { key: 'encumbered-distribution', el: () => <ChartCard title={ct('encumbered-distribution', 'Parcelles grevées vs libres')} icon={ShieldAlert} data={encumberedDist} type={ty('encumbered-distribution', 'pie')} colorIndex={4} hidden={encumberedDist.length === 0}
      insight={encumbered.length > 0 ? `${pct(encumbered.length, filtered.length)} des parcelles déclarent au moins une servitude.` : 'Aucune servitude déclarée.'} /> },
    { key: 'servitude-type', el: () => <ChartCard title={ct('servitude-type', 'Types de servitude')} icon={AlertTriangle} data={byServitudeType} type={ty('servitude-type', 'bar-h')} colorIndex={3} hidden={byServitudeType.length === 0}
      insight={generateInsight(byServitudeType, 'bar-h', 'les types de servitude')} /> },
    { key: 'beneficiary', el: () => <ChartCard title={ct('beneficiary', 'Bénéficiaires')} icon={FileText} data={byBeneficiary} type={ty('beneficiary', 'bar-h')} colorIndex={5} hidden={byBeneficiary.length === 0}
      insight={generateInsight(byBeneficiary, 'bar-h', 'les bénéficiaires')} /> },
    { key: 'duration', el: () => <ChartCard title={ct('duration', 'Durée des servitudes')} icon={Clock} data={durationDist} type={ty('duration', 'bar-v')} colorIndex={6} hidden={durationDist.length === 0}
      insight={generateInsight(durationDist, 'bar-v', 'les durées de servitude')} /> },
    { key: 'servitudes-per-parcel', el: () => <ChartCard title={ct('servitudes-per-parcel', 'Servitudes par parcelle')} data={servitudesPerParcel} type={ty('servitudes-per-parcel', 'bar-v')} colorIndex={7} hidden={servitudesPerParcel.length === 0}
      insight={generateInsight(servitudesPerParcel, 'bar-v', 'la concentration de servitudes')} /> },
    { key: 'geo', el: () => <GeoCharts records={encumbered} /> },
  ].filter(d => v(d.key)).sort((a, b) => ord(a.key) - ord(b.key)), [filtered, encumbered, encumberedDist, byServitudeType, byBeneficiary, durationDist, servitudesPerParcel, v, ct, ty, ord]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <BlockUnscopedRecordsProvider records={filteredUnscoped}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.contributions} filter={filter} onChange={setFilter} hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} statusField={filterConfig.statusField} />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {chartDefs.map(d => <React.Fragment key={d.key}>{d.el()}</React.Fragment>)}
      </div>
    </div>
    </BlockUnscopedRecordsProvider>
    </FilterLabelContext.Provider>
  );
});
