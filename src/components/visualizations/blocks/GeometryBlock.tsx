import React, { useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Ruler, Maximize, Compass, Map as MapIcon, Hexagon } from 'lucide-react';
import { pct } from '@/utils/analyticsConstants';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, FilterLabelContext } from '../shared/ChartCard';
import { BlockUnscopedRecordsProvider } from '../shared/BlockUnscopedRecordsContext';
import { GeoCharts } from '../shared/GeoCharts';
import { generateInsight } from '@/utils/chartInsights';
import { surfaceDistribution } from '@/utils/analyticsHelpers';
import { useBlockFilter } from '@/hooks/useBlockFilter';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'geometry';

function extractSides(row: any): any[] {
  const ps = row.parcel_sides;
  if (!ps) return [];
  if (Array.isArray(ps)) return ps;
  if (Array.isArray(ps.sides)) return ps.sides;
  return [];
}

function getSideLength(s: any): number | null {
  const v = s?.length ?? s?.length_m ?? s?.distance ?? s?.value;
  return typeof v === 'number' && v > 0 ? v : null;
}

function extractRoadSides(row: any): any[] {
  const rs = row.road_sides;
  if (!rs) return [];
  if (Array.isArray(rs)) return rs;
  if (Array.isArray(rs.sides)) return rs.sides;
  return [];
}

function extractGpsVertices(row: any): number {
  const gps = row.gps_coordinates;
  if (!gps) return 0;
  if (Array.isArray(gps)) return gps.length;
  if (Array.isArray(gps.coordinates)) return gps.coordinates.length;
  if (Array.isArray(gps.vertices)) return gps.vertices.length;
  return 0;
}

export const GeometryBlock: React.FC<Props> = memo(({ data }) => {
  const { filter, setFilter, filterLabel, filtered, filteredUnscoped, filterConfig, v, ct, ty, ord  } = useBlockFilter(TAB_KEY, data.contributions);

  const areaDist = useMemo(() => surfaceDistribution(filtered), [filtered]);

  // Side length distribution (m)
  const sideLengthDist = useMemo(() => {
    const buckets = [
      { name: '< 10 m', min: 0, max: 10 },
      { name: '10-25 m', min: 10, max: 25 },
      { name: '25-50 m', min: 25, max: 50 },
      { name: '50-100 m', min: 50, max: 100 },
      { name: '> 100 m', min: 100, max: Infinity },
    ];
    const counts = new Array(buckets.length).fill(0);
    filtered.forEach(r => {
      extractSides(r).forEach((s: any) => {
        const len = getSideLength(s);
        if (len == null) return;
        for (let i = 0; i < buckets.length; i++) {
          if (len >= buckets[i].min && len < buckets[i].max) { counts[i]++; break; }
        }
      });
    });
    return buckets.map((b, i) => ({ name: b.name, value: counts[i] })).filter(b => b.value > 0);
  }, [filtered]);

  // Perimeter distribution (sum of sides)
  const perimeterDist = useMemo(() => {
    const buckets = [
      { name: '< 50 m', min: 0, max: 50 },
      { name: '50-100 m', min: 50, max: 100 },
      { name: '100-200 m', min: 100, max: 200 },
      { name: '200-500 m', min: 200, max: 500 },
      { name: '> 500 m', min: 500, max: Infinity },
    ];
    const counts = new Array(buckets.length).fill(0);
    filtered.forEach(r => {
      const sides = extractSides(r);
      if (sides.length === 0) return;
      const perim = sides.reduce((acc: number, s: any) => acc + (getSideLength(s) || 0), 0);
      if (perim <= 0) return;
      for (let i = 0; i < buckets.length; i++) {
        if (perim >= buckets[i].min && perim < buckets[i].max) { counts[i]++; break; }
      }
    });
    return buckets.map((b, i) => ({ name: b.name, value: counts[i] })).filter(b => b.value > 0);
  }, [filtered]);

  // Number of sides per parcel
  const sidesCountDist = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(r => {
      const n = extractSides(r).length;
      if (n === 0) return;
      const k = n === 3 ? '3 (triangle)' : n === 4 ? '4 (quadr.)' : n === 5 ? '5' : n === 6 ? '6' : n <= 8 ? '7-8' : '9+';
      map.set(k, (map.get(k) || 0) + 1);
    });
    const order = ['3 (triangle)', '4 (quadr.)', '5', '6', '7-8', '9+'];
    return order.filter(k => map.has(k)).map(k => ({ name: k, value: map.get(k)! }));
  }, [filtered]);

  // Road access (% parcels with at least one side on a road)
  const roadAccessData = useMemo(() => {
    let withAccess = 0, without = 0;
    filtered.forEach(r => {
      const sides = extractRoadSides(r);
      const hasRoad = sides.some((s: any) => s === true || s?.has_road === true || s?.is_road === true || s?.road === true);
      if (sides.length > 0) {
        if (hasRoad) withAccess++; else without++;
      }
    });
    return [
      ...(withAccess > 0 ? [{ name: 'Avec accès route', value: withAccess }] : []),
      ...(without > 0 ? [{ name: 'Sans accès', value: without }] : []),
    ];
  }, [filtered]);

  // Number of road sides
  const roadSidesCountDist = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(r => {
      const sides = extractRoadSides(r);
      const count = sides.filter((s: any) => s === true || s?.has_road === true || s?.is_road === true || s?.road === true).length;
      if (count === 0) return;
      const k = String(count);
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => parseInt(a.name) - parseInt(b.name));
  }, [filtered]);

  // GPS polygon coverage (% parcels with GPS vertices)
  const gpsCoverageData = useMemo(() => {
    let withGps = 0, without = 0;
    filtered.forEach(r => {
      const n = extractGpsVertices(r);
      if (n >= 3) withGps++; else without++;
    });
    return [
      ...(withGps > 0 ? [{ name: 'Avec polygone GPS', value: withGps }] : []),
      ...(without > 0 ? [{ name: 'Sans polygone', value: without }] : []),
    ];
  }, [filtered]);

  const gpsCoverageCount = useMemo(() => filtered.filter(r => extractGpsVertices(r) >= 3).length, [filtered]);
  const withSidesCount = useMemo(() => filtered.filter(r => extractSides(r).length > 0).length, [filtered]);

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: ct('kpi-total', 'Parcelles analysées'), value: filtered.length, cls: 'text-primary' },
    { key: 'kpi-with-sides', label: ct('kpi-with-sides', 'Avec dimensions'), value: withSidesCount, cls: 'text-blue-600', tooltip: pct(withSidesCount, filtered.length) },
    { key: 'kpi-with-gps', label: ct('kpi-with-gps', 'Avec GPS'), value: gpsCoverageCount, cls: 'text-emerald-600', tooltip: pct(gpsCoverageCount, filtered.length) },
  ].filter(k => v(k.key)), [filtered, withSidesCount, gpsCoverageCount, v, ct]);

  const chartDefs = useMemo(() => [
    { key: 'area-distribution', el: () => <ChartCard title={ct('area-distribution', 'Distribution surface')} icon={Maximize} data={areaDist} type={ty('area-distribution', 'bar-v')} colorIndex={2} hidden={areaDist.length === 0}
      insight={generateInsight(areaDist, 'bar-v', 'les surfaces de parcelle')} /> },
    { key: 'side-length', el: () => <ChartCard title={ct('side-length', 'Longueur des côtés')} icon={Ruler} data={sideLengthDist} type={ty('side-length', 'bar-v')} colorIndex={3} hidden={sideLengthDist.length === 0}
      insight={generateInsight(sideLengthDist, 'bar-v', 'les longueurs de côté')} /> },
    { key: 'perimeter', el: () => <ChartCard title={ct('perimeter', 'Périmètre des parcelles')} icon={Hexagon} data={perimeterDist} type={ty('perimeter', 'bar-v')} colorIndex={5} hidden={perimeterDist.length === 0}
      insight={generateInsight(perimeterDist, 'bar-v', 'les périmètres')} /> },
    { key: 'sides-count', el: () => <ChartCard title={ct('sides-count', 'Forme (nb de côtés)')} icon={Hexagon} data={sidesCountDist} type={ty('sides-count', 'bar-v')} colorIndex={6} hidden={sidesCountDist.length === 0}
      insight={generateInsight(sidesCountDist, 'bar-v', 'la forme des parcelles')} /> },
    { key: 'road-access', el: () => <ChartCard title={ct('road-access', 'Accès routier')} icon={Compass} data={roadAccessData} type={ty('road-access', 'pie')} colorIndex={7} hidden={roadAccessData.length === 0}
      insight={generateInsight(roadAccessData, 'pie', "l'accès routier")} /> },
    { key: 'road-sides-count', el: () => <ChartCard title={ct('road-sides-count', 'Nb côtés sur voie')} icon={Compass} data={roadSidesCountDist} type={ty('road-sides-count', 'bar-v')} colorIndex={8} hidden={roadSidesCountDist.length === 0}
      insight={generateInsight(roadSidesCountDist, 'bar-v', 'le nombre de côtés sur voie')} /> },
    { key: 'gps-coverage', el: () => <ChartCard title={ct('gps-coverage', 'Couverture GPS')} icon={MapIcon} data={gpsCoverageData} type={ty('gps-coverage', 'donut')} colorIndex={10} hidden={gpsCoverageData.length === 0}
      insight={gpsCoverageCount > 0 ? `${pct(gpsCoverageCount, filtered.length)} des parcelles disposent d'un polygone GPS exploitable.` : 'Aucun polygone GPS exploitable.'} /> },
    { key: 'geo', el: () => <GeoCharts records={filtered} /> },
  ].filter(d => v(d.key)).sort((a, b) => ord(a.key) - ord(b.key)), [filtered, areaDist, sideLengthDist, perimeterDist, sidesCountDist, roadAccessData, roadSidesCountDist, gpsCoverageData, gpsCoverageCount, v, ct, ty, ord]);

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
