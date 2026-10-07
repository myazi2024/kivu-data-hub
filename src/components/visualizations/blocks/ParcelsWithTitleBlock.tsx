import React, { useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { countBy, trendByMonth, surfaceDistribution, yearDecadeDistribution, recordBuildingHeightM } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Building, TrendingUp, Clock, ShieldCheck, Maximize, ArrowUpFromLine, Volume2, Ear, Home, Layers, Users, Gauge } from 'lucide-react';
import { SOUND_LABELS } from '@/constants/expertiseLabels';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, FilterLabelContext } from '../shared/ChartCard';
import { BlockUnscopedRecordsProvider } from '../shared/BlockUnscopedRecordsContext';
import { GeoCharts } from '../shared/GeoCharts';
import { generateInsight } from '@/utils/chartInsights';
import { normalizeConstructionType } from '@/utils/constructionTypeNormalizer';
import { normalizeDeclaredUsage } from '@/utils/declaredUsageNormalizer';
import { useBlockFilter } from '@/hooks/useBlockFilter';
import { applyFilters } from '@/utils/analyticsHelpers';
import * as CA from '@/utils/constructionAnalytics';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'parcels-titled';

export const ParcelsWithTitleBlock: React.FC<Props> = memo(({ data }) => {
  const { filter, setFilter, filterLabel, filtered: filteredParcels, filteredUnscoped, filterConfig, v, ct, cx, ty, ord } = useBlockFilter(TAB_KEY, data.parcels);
  const filteredContribs = useMemo(() => applyFilters(data.contributions, filter, filterConfig.dateField), [data.contributions, filter, filterConfig.dateField]);

  // Only built parcels (have a property_category that is not "Terrain nu")
  const builtParcels = useMemo(() => filteredParcels.filter(p => p.property_category && p.property_category !== 'Terrain nu'), [filteredParcels]);

  const normalizedParcels = useMemo(() =>
    builtParcels.map(p => ({
      ...p,
      construction_type: normalizeConstructionType(p.construction_type),
      declared_usage: normalizeDeclaredUsage(p.declared_usage),
    })),
    [builtParcels]);

  const charts = useMemo(() => ({
    byConstructionType: countBy(normalizedParcels, 'construction_type'),
    byConstructionNature: countBy(builtParcels, 'construction_nature'),
    byConstructionMaterials: countBy(builtParcels, 'construction_materials'),
    byStanding: countBy(builtParcels, 'standing'),
    byPropertyCategory: CA.propertyCategoryData(filteredParcels),
    byDeclaredUsage: countBy(normalizedParcels, 'declared_usage'),
    byDecade: yearDecadeDistribution(builtParcels, 'construction_year'),
  }), [filteredParcels, builtParcels, normalizedParcels]);

  const permitTypeData = useMemo(() => CA.permitStatusData(filteredContribs), [filteredContribs]);

  const buildingSizeData = useMemo(() => {
    const buckets = [
      { label: '< 50 m²', min: 0, max: 50 },
      { label: '50-100 m²', min: 50, max: 100 },
      { label: '100-200 m²', min: 100, max: 200 },
      { label: '200-500 m²', min: 200, max: 500 },
      { label: '> 500 m²', min: 500, max: Infinity },
    ];
    const counts = buckets.map(b => ({ name: b.label, value: 0, min: b.min, max: b.max }));
    filteredContribs.forEach(c => {
      const shapes = c.building_shapes;
      if (Array.isArray(shapes)) {
        shapes.forEach((s: any) => {
          const area = s?.areaSqm ?? (s?.width && s?.height ? s.width * s.height : null);
          if (area != null && area > 0) {
            const bucket = counts.find(b => area >= b.min && area < b.max);
            if (bucket) bucket.value++;
          }
        });
      }
    });
    return counts.filter(c => c.value > 0).map(({ name, value }) => ({ name, value }));
  }, [filteredContribs]);

  const buildingHeightData = useMemo(() => {
    const buckets = [
      { label: '< 3m', min: 0, max: 3 },
      { label: '3-6m', min: 3, max: 6 },
      { label: '6-10m', min: 6, max: 10 },
      { label: '10-15m', min: 10, max: 15 },
      { label: '> 15m', min: 15, max: Infinity },
    ];
    const counts = buckets.map(b => ({ name: b.label, value: 0, min: b.min, max: b.max }));
    const push = (h: number) => {
      const bucket = counts.find(b => h >= b.min && h < b.max);
      if (bucket) bucket.value++;
    };
    filteredContribs.forEach(c => {
      const shapes = c.building_shapes;
      let fromSketch = false;
      if (Array.isArray(shapes)) {
        shapes.forEach((s: any) => {
          const h = s?.heightM ?? s?.height_m;
          if (h != null && h > 0) { push(Number(h)); fromSketch = true; }
        });
      }
      // Declared height (Construction block) when the sketch carries none
      if (!fromSketch) {
        const declared = recordBuildingHeightM(c);
        if (declared) push(declared);
      }
    });
    return counts.filter(c => c.value > 0).map(({ name, value }) => ({ name, value }));
  }, [filteredContribs]);

  /** Apartment footprint (length × width) declared in the Construction block */
  const apartmentSizeData = useMemo(() => {
    const buckets = [
      { name: '< 30 m²', min: 0, max: 30 },
      { name: '30-60 m²', min: 30, max: 60 },
      { name: '60-100 m²', min: 60, max: 100 },
      { name: '100-150 m²', min: 100, max: 150 },
      { name: '> 150 m²', min: 150, max: Infinity },
    ];
    const counts = buckets.map(b => ({ ...b, value: 0 }));
    filteredContribs.forEach((c: any) => {
      const area = Number(c.apartment_length || 0) * Number(c.apartment_width || 0);
      if (area <= 0) return;
      const bucket = counts.find(b => area >= b.min && area < b.max);
      if (bucket) bucket.value++;
    });
    return counts.filter(c => c.value > 0).map(({ name, value }) => ({ name, value }));
  }, [filteredContribs]);

  /** Apartment orientation declared in the Construction block */
  const apartmentOrientationData = useMemo(() => {
    const map = new Map<string, number>();
    filteredContribs.forEach((c: any) => {
      if (!c.apartment_orientation) return;
      const k = String(c.apartment_orientation);
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredContribs]);


  const soundEnvData = useMemo(() => {
    const map = new Map<string, number>();
    filteredContribs.forEach(c => {
      const env = c.sound_environment;
      if (env) {
        const label = SOUND_LABELS[env] || env;
        map.set(label, (map.get(label) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredContribs]);

  const noiseSourcesData = useMemo(() => {
    const map = new Map<string, number>();
    filteredContribs.forEach(c => {
      const src = c.nearby_noise_sources;
      if (src && typeof src === 'string') {
        src.split(',').forEach(s => {
          const trimmed = s.trim();
          if (trimmed) map.set(trimmed, (map.get(trimmed) || 0) + 1);
        });
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredContribs]);

  const builtVsUnbuiltData = useMemo(() => {
    const built = filteredParcels.filter(p => p.property_category && p.property_category !== 'Terrain nu').length;
    const unbuilt = filteredParcels.filter(p => p.property_category === 'Terrain nu').length;
    return [
      { name: 'Construites', value: built },
      { name: 'Non construites', value: unbuilt },
    ].filter(d => d.value > 0);
  }, [filteredParcels]);

  const occupationData = useMemo(() => {
    const occupied = builtParcels.filter(p => p.is_occupied === true).length;
    const vacant = builtParcels.filter(p => p.is_occupied === false).length;
    return [
      ...(occupied > 0 ? [{ name: 'Habité', value: occupied }] : []),
      ...(vacant > 0 ? [{ name: 'Non habité', value: vacant }] : []),
    ];
  }, [builtParcels]);

  const floorDistData = useMemo(() => {
    const map = new Map<string, number>();
    builtParcels.forEach(p => {
      const f = p.floor_number;
      if (f != null && f !== '') {
        const label = f === '0' || f.toLowerCase() === 'rdc' ? 'RDC' : `${f} étage${parseInt(f) > 1 ? 's' : ''}`;
        map.set(label, (map.get(label) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [builtParcels]);

  const multiConstructionCount = useMemo(() =>
    builtParcels.filter(p => Array.isArray(p.additional_constructions) && p.additional_constructions.length > 0).length,
    [builtParcels]);

  const occupiedCount = useMemo(() => builtParcels.filter(p => p.is_occupied === true).length, [builtParcels]);
  const totalHostingCapacity = useMemo(() => builtParcels.reduce((s, p) => s + (p.hosting_capacity || 0), 0), [builtParcels]);
  const parcelsWithCapacity = useMemo(() => builtParcels.filter(p => (p.hosting_capacity || 0) > 0), [builtParcels]);
  const avgHostingCapacity = useMemo(() => parcelsWithCapacity.length > 0 ? Math.round(totalHostingCapacity / parcelsWithCapacity.length) : 0, [totalHostingCapacity, parcelsWithCapacity]);

  const hostingCapacityData = useMemo(() => {
    const buckets = [
      { label: '1-2 pers', min: 1, max: 3 },
      { label: '3-5 pers', min: 3, max: 6 },
      { label: '6-10 pers', min: 6, max: 11 },
      { label: '11-20 pers', min: 11, max: 21 },
      { label: '21-50 pers', min: 21, max: 51 },
      { label: '> 50 pers', min: 51, max: Infinity },
    ];
    const counts = buckets.map(b => ({ name: b.label, value: 0, min: b.min, max: b.max }));
    parcelsWithCapacity.forEach(p => {
      const c = p.hosting_capacity || 0;
      const bucket = counts.find(b => c >= b.min && c < b.max);
      if (bucket) bucket.value++;
    });
    return counts.filter(c => c.value > 0).map(({ name, value }) => ({ name, value }));
  }, [parcelsWithCapacity]);

  const occupancyPressureData = useMemo(() => {
    const buckets: Record<string, number> = { 'Sous-occupé': 0, 'Équilibré': 0, 'Saturé': 0 };
    builtParcels.forEach(p => {
      const cap = p.hosting_capacity || 0;
      const occ = p.occupant_count || 0;
      if (cap > 0 && occ > 0) {
        const ratio = occ / cap;
        if (ratio < 0.5) buckets['Sous-occupé']++;
        else if (ratio <= 1) buckets['Équilibré']++;
        else buckets['Saturé']++;
      }
    });
    return Object.entries(buckets).filter(([, val]) => val > 0).map(([name, value]) => ({ name, value }));
  }, [builtParcels]);

  // Construction evolution trend (based on built parcels)
  const constructionTrend = useMemo(() => trendByMonth(builtParcels), [builtParcels]);

  // Indicateurs du bloc Construction du CCC (principale + supplémentaires)
  const flatConstr = useMemo(() => CA.flattenConstructions(builtParcels), [builtParcels]);
  const categoryRecords = useMemo(() => CA.flattenPropertyCategoryRecords(filteredParcels), [filteredParcels]);
  const flatContribConstr = useMemo(() => CA.flattenConstructions(filteredContribs), [filteredContribs]);
  const cccData = useMemo(() => ({
    status: CA.constructionStatusData(flatConstr),
    rented: CA.rentedData(flatConstr),
    config: CA.rentalConfigurationData(flatConstr),
    unitsCount: CA.rentalUnitsCountData(flatConstr),
    unitsOcc: CA.rentalUnitsOccupancyData(flatConstr),
    actual: CA.actualVsDeclaredData(flatContribConstr),
    opCap: CA.operationalCapacityData(flatContribConstr),
    boundary: CA.boundaryKindData(filteredParcels),
    road: CA.roadAccessData(filteredParcels),
    surface: CA.roadSurfaceData(filteredParcels),
    entrances: CA.entrancesData(filteredParcels),
  }), [flatConstr, flatContribConstr, filteredParcels]);
  const inProgressCount = useMemo(() => flatConstr.filter(c => c.status === 'in_progress').length, [flatConstr]);
  const rentedCount = useMemo(() => flatConstr.filter(c => c.isRented === true).length, [flatConstr]);
  const vacantUnits = useMemo(() => CA.vacantUnitsCount(flatConstr), [flatConstr]);

  const kpiItems = useMemo(() => [
    { key: 'kpi-constructions', label: ct('kpi-constructions', 'Constructions'), value: builtParcels.length, cls: 'text-primary' },
    { key: 'kpi-occupied', label: ct('kpi-occupied', 'Habitées'), value: occupiedCount, cls: 'text-teal-600', tooltip: pct(occupiedCount, builtParcels.length) },
    { key: 'kpi-hosting', label: ct('kpi-hosting', 'Cap. accueil'), value: totalHostingCapacity > 0 ? totalHostingCapacity.toLocaleString() : 'N/A', cls: 'text-indigo-600', tooltip: 'Capacité d\'accueil totale' },
    { key: 'kpi-avg-capacity', label: ct('kpi-avg-capacity', 'Cap. moy.'), value: avgHostingCapacity > 0 ? avgHostingCapacity.toLocaleString() : 'N/A', cls: 'text-cyan-600', tooltip: 'Capacité moyenne par construction' },
    { key: 'kpi-multi-constr', label: ct('kpi-multi-constr', 'Multi-constr.'), value: multiConstructionCount, cls: 'text-orange-600', tooltip: pct(multiConstructionCount, builtParcels.length) },
    { key: 'kpi-in-progress', label: ct('kpi-in-progress', 'En cours'), value: inProgressCount, cls: 'text-yellow-600', tooltip: pct(inProgressCount, flatConstr.length) },
    { key: 'kpi-rented', label: ct('kpi-rented', 'Mises en location'), value: rentedCount, cls: 'text-emerald-600', tooltip: pct(rentedCount, flatConstr.length) },
    { key: 'kpi-vacant-units', label: ct('kpi-vacant-units', 'Locaux vacants'), value: vacantUnits, cls: 'text-rose-600' },
  ].filter(k => v(k.key)), [flatConstr, inProgressCount, rentedCount, vacantUnits, builtParcels, occupiedCount, totalHostingCapacity, avgHostingCapacity, multiConstructionCount, v, ct]);

  const chartDefs = useMemo(() => [
    { key: 'construction-type', el: () => <ChartCard title={ct('construction-type', 'Construction')} icon={Building} data={charts.byConstructionType} type={ty('construction-type', 'bar-h')} colorIndex={3}
      insight={generateInsight(charts.byConstructionType, 'bar-h', 'les constructions')} crossVariables={cx('construction-type')} rawRecords={normalizedParcels} groupField="construction_type" /> },
    { key: 'construction-nature', el: () => <ChartCard title={ct('construction-nature', 'Nature construction')} data={charts.byConstructionNature} type={ty('construction-nature', 'bar-h')} colorIndex={7}
      insight="Répartition des matériaux et natures de construction par localisation." crossVariables={cx('construction-nature')} rawRecords={builtParcels} groupField="construction_nature" /> },
    { key: 'property-category', el: () => <ChartCard title={ct('property-category', 'Catégorie de bien')} data={charts.byPropertyCategory} type={ty('property-category', 'bar-h')} colorIndex={2} hidden={charts.byPropertyCategory.length === 0}
      insight={generateInsight(charts.byPropertyCategory, 'bar-h', 'les catégories de bien')} crossVariables={cx('property-category')} rawRecords={categoryRecords} groupField="property_category" /> },
    { key: 'built-vs-unbuilt', el: () => <ChartCard title={ct('built-vs-unbuilt', 'Construites vs Non construites')} data={builtVsUnbuiltData} type={ty('built-vs-unbuilt', 'pie')} colorIndex={11} hidden={builtVsUnbuiltData.length === 0}
      insight={generateInsight(builtVsUnbuiltData, 'pie', 'la construction des parcelles')} crossVariables={cx('built-vs-unbuilt')} rawRecords={filteredParcels} groupField="property_category" /> },
    { key: 'construction-materials', el: () => <ChartCard title={ct('construction-materials', 'Matériaux')} data={charts.byConstructionMaterials} type={ty('construction-materials', 'bar-h')} colorIndex={8} hidden={charts.byConstructionMaterials.length === 0}
      insight={generateInsight(charts.byConstructionMaterials, 'bar-h', 'les matériaux de construction')} crossVariables={cx('construction-materials')} rawRecords={builtParcels} groupField="construction_materials" /> },
    { key: 'standing', el: () => <ChartCard title={ct('standing', 'Standing')} data={charts.byStanding} type={ty('standing', 'donut')} colorIndex={6} hidden={charts.byStanding.length === 0}
      insight={generateInsight(charts.byStanding, 'donut', 'les niveaux de standing')} crossVariables={cx('standing')} rawRecords={builtParcels} groupField="standing" /> },
    { key: 'construction-decade', el: () => <ChartCard title={ct('construction-decade', 'Année construction')} icon={Clock} data={charts.byDecade} type={ty('construction-decade', 'bar-v')} colorIndex={0} hidden={charts.byDecade.length === 0}
      insight={generateInsight(charts.byDecade, 'bar-v', 'les décennies de construction')} crossVariables={cx('construction-decade')} rawRecords={builtParcels} groupField="construction_year" /> },
    { key: 'usage', el: () => <ChartCard title={ct('usage', 'Usage déclaré')} data={charts.byDeclaredUsage} type={ty('usage', 'bar-h')} colorIndex={5}
      insight={generateInsight(charts.byDeclaredUsage, 'bar-h', 'les usages déclarés')} crossVariables={cx('usage')} rawRecords={normalizedParcels} groupField="declared_usage" /> },
    { key: 'occupation', el: () => <ChartCard title={ct('occupation', 'Occupation')} icon={Home} data={occupationData} type={ty('occupation', 'pie')} colorIndex={12} hidden={occupationData.length === 0}
      insight={generateInsight(occupationData, 'pie', "l'occupation des constructions")} crossVariables={cx('occupation')} rawRecords={builtParcels} groupField="is_occupied" /> },
    { key: 'floor-dist', el: () => <ChartCard title={ct('floor-dist', 'Nombre d\'étages')} icon={Layers} data={floorDistData} type={ty('floor-dist', 'bar-v')} colorIndex={14} hidden={floorDistData.length === 0}
      insight={generateInsight(floorDistData, 'bar-v', 'la distribution des étages')} crossVariables={cx('floor-dist')} rawRecords={builtParcels} groupField="floor_number" /> },
    { key: 'hosting-capacity', el: () => <ChartCard title={ct('hosting-capacity', 'Capacité d\'accueil')} icon={Users} data={hostingCapacityData} type={ty('hosting-capacity', 'bar-v')} colorIndex={9} hidden={hostingCapacityData.length === 0}
      insight={generateInsight(hostingCapacityData, 'bar-v', "la capacité d'accueil des constructions")} crossVariables={cx('hosting-capacity')} rawRecords={parcelsWithCapacity} groupField="hosting_capacity" /> },
    { key: 'occupancy-pressure', el: () => <ChartCard title={ct('occupancy-pressure', 'Pression d\'occupation')} icon={Gauge} data={occupancyPressureData} type={ty('occupancy-pressure', 'donut')} colorIndex={13} hidden={occupancyPressureData.length === 0}
      insight={generateInsight(occupancyPressureData, 'donut', "la pression d'occupation (occupants vs capacité)")} crossVariables={cx('occupancy-pressure')} rawRecords={builtParcels} groupField="hosting_capacity" /> },
    { key: 'permit-type', el: () => <ChartCard title={ct('permit-type', 'Autorisation de bâtir')} icon={ShieldCheck} data={permitTypeData} type={ty('permit-type', 'donut')} colorIndex={4} hidden={permitTypeData.every(d => d.value === 0)}
      insight={generateInsight(permitTypeData, 'donut', 'les autorisations de bâtir')} crossVariables={cx('permit-type')} rawRecords={filteredContribs} groupField="building_permits" /> },
    { key: 'building-size', el: () => <ChartCard title={ct('building-size', 'Taille construction')} icon={Maximize} data={buildingSizeData} type={ty('building-size', 'bar-v')} colorIndex={2} hidden={buildingSizeData.length === 0}
      insight={generateInsight(buildingSizeData, 'bar-v', 'les tailles de construction')} crossVariables={cx('building-size')} rawRecords={filteredContribs} groupField="building_shapes" /> },
    { key: 'building-height', el: () => <ChartCard title={ct('building-height', 'Hauteur construction')} icon={ArrowUpFromLine} data={buildingHeightData} type={ty('building-height', 'bar-v')} colorIndex={5} hidden={buildingHeightData.length === 0}
      insight={generateInsight(buildingHeightData, 'bar-v', 'les hauteurs de construction')} crossVariables={cx('building-height')} rawRecords={filteredContribs} groupField="building_shapes" /> },
    { key: 'apartment-size', el: () => <ChartCard title={ct('apartment-size', 'Surface des appartements')} icon={Maximize} data={apartmentSizeData} type={ty('apartment-size', 'bar-v')} colorIndex={10} hidden={apartmentSizeData.length === 0}
      insight={generateInsight(apartmentSizeData, 'bar-v', 'les surfaces déclarées des appartements')} /> },
    { key: 'apartment-orientation', el: () => <ChartCard title={ct('apartment-orientation', 'Orientation des appartements')} data={apartmentOrientationData} type={ty('apartment-orientation', 'donut')} colorIndex={3} hidden={apartmentOrientationData.length === 0}
      insight={generateInsight(apartmentOrientationData, 'donut', 'les orientations déclarées')} crossVariables={cx('apartment-orientation')} rawRecords={filteredContribs} groupField="apartment_orientation" /> },
    { key: 'sound-env', el: () => <ChartCard title={ct('sound-env', 'Environnement sonore')} icon={Volume2} data={soundEnvData} type={ty('sound-env', 'donut')} colorIndex={10} hidden={soundEnvData.length === 0}
      insight={generateInsight(soundEnvData, 'donut', "l'environnement sonore")} crossVariables={cx('sound-env')} rawRecords={filteredContribs} groupField="sound_environment" /> },
    { key: 'noise-sources', el: () => <ChartCard title={ct('noise-sources', 'Sources de bruit')} icon={Ear} data={noiseSourcesData} type={ty('noise-sources', 'bar-v')} colorIndex={11} hidden={noiseSourcesData.length === 0}
      insight={generateInsight(noiseSourcesData, 'bar-v', 'les sources de bruit')} crossVariables={cx('noise-sources')} rawRecords={filteredContribs} groupField="nearby_noise_sources" /> },
    { key: 'construction-status', el: () => <ChartCard title={ct('construction-status', "État de la construction")} data={cccData.status} type={ty('construction-status', 'pie')} colorIndex={0} hidden={cccData.status.length === 0} insight={generateInsight(cccData.status, 'pie', "l'état des constructions")} crossVariables={cx('construction-status')} /> },
    { key: 'rented', el: () => <ChartCard title={ct('rented', "Mise en location")} data={cccData.rented} type={ty('rented', 'pie')} colorIndex={1} hidden={cccData.rented.length === 0} insight={generateInsight(cccData.rented, 'pie', "la mise en location")} crossVariables={cx('rented')} /> },
    { key: 'rental-config', el: () => <ChartCard title={ct('rental-config', "Mode de location")} data={cccData.config} type={ty('rental-config', 'donut')} colorIndex={2} hidden={cccData.config.length === 0} insight={generateInsight(cccData.config, 'donut', "le mode de location")} crossVariables={cx('rental-config')} /> },
    { key: 'rental-units-count', el: () => <ChartCard title={ct('rental-units-count', "Nombre de locaux")} data={cccData.unitsCount} type={ty('rental-units-count', 'bar-v')} colorIndex={3} hidden={cccData.unitsCount.length === 0} insight={generateInsight(cccData.unitsCount, 'bar-v', "le nombre de locaux")} crossVariables={cx('rental-units-count')} /> },
    { key: 'rental-units-occupancy', el: () => <ChartCard title={ct('rental-units-occupancy', "Occupation des locaux")} data={cccData.unitsOcc} type={ty('rental-units-occupancy', 'donut')} colorIndex={4} hidden={cccData.unitsOcc.length === 0} insight={generateInsight(cccData.unitsOcc, 'donut', "l'occupation des locaux")} crossVariables={cx('rental-units-occupancy')} /> },
    { key: 'actual-usage', el: () => <ChartCard title={ct('actual-usage', "Usage réel vs déclaré")} data={cccData.actual} type={ty('actual-usage', 'bar-h')} colorIndex={5} hidden={cccData.actual.length === 0} insight={generateInsight(cccData.actual, 'bar-h', "l'usage réel")} crossVariables={cx('actual-usage')} /> },
    { key: 'operational-capacity', el: () => <ChartCard title={ct('operational-capacity', "Capacité d'exploitation")} data={cccData.opCap} type={ty('operational-capacity', 'bar-h')} colorIndex={6} hidden={cccData.opCap.length === 0} insight={generateInsight(cccData.opCap, 'bar-h', "la capacité d'exploitation")} crossVariables={cx('operational-capacity')} /> },
    { key: 'boundary-kind', el: () => <ChartCard title={ct('boundary-kind', "Limites de la parcelle")} data={cccData.boundary} type={ty('boundary-kind', 'donut')} colorIndex={7} hidden={cccData.boundary.length === 0} insight={generateInsight(cccData.boundary, 'donut', "les limites des parcelles")} crossVariables={cx('boundary-kind')} /> },
    { key: 'road-access', el: () => <ChartCard title={ct('road-access', "Accès routier")} data={cccData.road} type={ty('road-access', 'bar-v')} colorIndex={8} hidden={cccData.road.length === 0} insight={generateInsight(cccData.road, 'bar-v', "l'accès routier")} crossVariables={cx('road-access')} /> },
    { key: 'road-surface', el: () => <ChartCard title={ct('road-surface', "Revêtement des routes")} data={cccData.surface} type={ty('road-surface', 'bar-h')} colorIndex={9} hidden={cccData.surface.length === 0} insight={generateInsight(cccData.surface, 'bar-h', "le revêtement des routes")} crossVariables={cx('road-surface')} /> },
    { key: 'entrances', el: () => <ChartCard title={ct('entrances', "Entrées")} data={cccData.entrances} type={ty('entrances', 'bar-v')} colorIndex={10} hidden={cccData.entrances.length === 0} insight={generateInsight(cccData.entrances, 'bar-v', "les entrées")} crossVariables={cx('entrances')} /> },
    { key: 'construction-geo', el: () => <GeoCharts records={builtParcels} /> },
    { key: 'construction-evolution', el: () => <ChartCard title={ct('construction-evolution', 'Évolution constructions')} icon={TrendingUp} data={constructionTrend} type={ty('construction-evolution', 'area')} colorIndex={0} colSpan={2}
      insight={generateInsight(constructionTrend, 'area', 'les constructions')} /> },
  ].filter(d => v(d.key)).sort((a, b) => ord(a.key) - ord(b.key)), [filteredParcels, builtParcels, filteredContribs, normalizedParcels, categoryRecords, parcelsWithCapacity, charts, permitTypeData, buildingSizeData, buildingHeightData, apartmentSizeData, apartmentOrientationData, soundEnvData, noiseSourcesData, occupationData, floorDistData, hostingCapacityData, occupancyPressureData, builtVsUnbuiltData, constructionTrend, cccData, v, ct, cx, ty, ord]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <BlockUnscopedRecordsProvider records={filteredUnscoped}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.parcels} filter={filter} onChange={setFilter} hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} statusField={filterConfig.statusField} />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {chartDefs.map(d => <React.Fragment key={d.key}>{d.el()}</React.Fragment>)}
      </div>
    </div>
    </BlockUnscopedRecordsProvider>
    </FilterLabelContext.Provider>
  );
});
