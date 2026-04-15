import React, { useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { countBy, trendByMonth, surfaceDistribution, yearDecadeDistribution } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { FileText, Users, Building, TrendingUp, Ruler, Clock, ShieldCheck, Maximize, ArrowUpFromLine, Volume2, Ear, Home, KeyRound, Layers, Building2 } from 'lucide-react';
import { SOUND_LABELS } from '@/constants/expertiseLabels';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, ColorMappedPieCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { generateInsight } from '@/utils/chartInsights';
import { normalizeTitleType } from '@/utils/titleTypeNormalizer';
import { normalizeConstructionType } from '@/utils/constructionTypeNormalizer';
import { normalizeDeclaredUsage } from '@/utils/declaredUsageNormalizer';
import { useBlockFilter } from '@/hooks/useBlockFilter';
import { applyFilters } from '@/utils/analyticsHelpers';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'parcels-titled';

const GENDER_COLORS: Record<string, string> = {
  'Masculin': '#3b82f6', 'Féminin': '#ec4899', 'M': '#3b82f6', 'F': '#ec4899',
  'Autre': '#8b5cf6', '(Non renseigné)': '#9ca3af',
};

export const ParcelsWithTitleBlock: React.FC<Props> = memo(({ data }) => {
  const { filter, setFilter, filterLabel, filtered: filteredParcels, filterConfig, v, ct, cx, ty, ord } = useBlockFilter(TAB_KEY, data.parcels);
  const filteredContribs = useMemo(() => applyFilters(data.contributions, filter, filterConfig.dateField), [data.contributions, filter, filterConfig.dateField]);

  const normalizedParcels = useMemo(() =>
    filteredParcels.map(p => ({
      ...p,
      property_title_type: normalizeTitleType(p.property_title_type),
      construction_type: normalizeConstructionType(p.construction_type),
      declared_usage: normalizeDeclaredUsage(p.declared_usage),
    })),
    [filteredParcels]);

  const charts = useMemo(() => ({
    byTitleType: countBy(normalizedParcels, 'property_title_type'),
    byLegalStatus: countBy(filteredParcels, 'current_owner_legal_status'),
    byConstructionType: countBy(normalizedParcels, 'construction_type'),
    byConstructionNature: countBy(filteredParcels, 'construction_nature'),
    byConstructionMaterials: countBy(filteredParcels, 'construction_materials'),
    byStanding: countBy(filteredParcels, 'standing'),
    byPropertyCategory: countBy(filteredParcels, 'property_category'),
    byDeclaredUsage: countBy(normalizedParcels, 'declared_usage'),
    surfaceDist: surfaceDistribution(filteredParcels),
    byDecade: yearDecadeDistribution(filteredParcels, 'construction_year'),
    
  }), [filteredParcels, normalizedParcels]);

  const permitTypeData = useMemo(() => {
    const map = new Map<string, number>();
    filteredContribs.forEach(c => {
      const permits = c.building_permits;
      if (Array.isArray(permits) && permits.length > 0) {
        permits.forEach((p: any) => {
          const t = p?.permitType === 'regularization' ? 'Régularisation' : p?.permitType === 'construction' ? 'Construction' : null;
          if (t) map.set(t, (map.get(t) || 0) + 1);
        });
      } else {
        map.set('Sans autorisation', (map.get('Sans autorisation') || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredContribs]);

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
    filteredContribs.forEach(c => {
      const shapes = c.building_shapes;
      if (Array.isArray(shapes)) {
        shapes.forEach((s: any) => {
          const h = s?.heightM ?? s?.height_m;
          if (h != null && h > 0) {
            const bucket = counts.find(b => h >= b.min && h < b.max);
            if (bucket) bucket.value++;
          }
        });
      }
    });
    return counts.filter(c => c.value > 0).map(({ name, value }) => ({ name, value }));
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

  const genderData = useMemo(() => {
    const map = new Map<string, number>();
    filteredContribs.forEach(c => {
      if (c.current_owners_details && Array.isArray(c.current_owners_details)) {
        c.current_owners_details.forEach((o: any) => { if (o?.gender) map.set(o.gender, (map.get(o.gender) || 0) + 1); });
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredContribs]);

  const genderInsight = useMemo(() => {
    if (genderData.length === 0) return '';
    const total = genderData.reduce((s, d) => s + d.value, 0);
    const fem = genderData.find(d => d.name === 'Féminin' || d.name === 'F');
    const masc = genderData.find(d => d.name === 'Masculin' || d.name === 'M');
    if (fem && masc) return `${Math.round((fem.value / total) * 100)}% de femmes propriétaires contre ${Math.round((masc.value / total) * 100)}% d'hommes.`;
    return generateInsight(genderData, 'pie', 'le genre des propriétaires');
  }, [genderData]);

  const urbanCount = useMemo(() => filteredParcels.filter(p => p.parcel_type === 'SU').length, [filteredParcels]);
  const ruralCount = useMemo(() => filteredParcels.filter(p => p.parcel_type === 'SR').length, [filteredParcels]);
  const subdividedData = useMemo(() => {
    const lotie = filteredParcels.filter(p => p.is_subdivided === true).length;
    const nonLotie = filteredParcels.filter(p => p.is_subdivided === false).length;
    return [
      ...(lotie > 0 ? [{ name: 'Loties', value: lotie }] : []),
      ...(nonLotie > 0 ? [{ name: 'Non loties', value: nonLotie }] : []),
    ];
  }, [filteredParcels]);
  const totalSurface = useMemo(() => filteredParcels.reduce((s, p) => s + (p.area_sqm || 0), 0), [filteredParcels]);

  const occupationData = useMemo(() => {
    const occupied = filteredParcels.filter(p => p.is_occupied === true).length;
    const vacant = filteredParcels.filter(p => p.is_occupied === false).length;
    return [
      ...(occupied > 0 ? [{ name: 'Habité', value: occupied }] : []),
      ...(vacant > 0 ? [{ name: 'Non habité', value: vacant }] : []),
    ];
  }, [filteredParcels]);

  const floorDistData = useMemo(() => {
    const map = new Map<string, number>();
    filteredParcels.forEach(p => {
      const f = p.floor_number;
      if (f != null && f !== '') {
        const label = f === '0' || f.toLowerCase() === 'rdc' ? 'RDC' : `${f} étage${parseInt(f) > 1 ? 's' : ''}`;
        map.set(label, (map.get(label) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredParcels]);

  const multiConstructionCount = useMemo(() =>
    filteredParcels.filter(p => Array.isArray(p.additional_constructions) && p.additional_constructions.length > 0).length,
    [filteredParcels]);

  const occupiedCount = useMemo(() => filteredParcels.filter(p => p.is_occupied === true).length, [filteredParcels]);
  const totalHostingCapacity = useMemo(() => filteredParcels.reduce((s, p) => s + (p.hosting_capacity || 0), 0), [filteredParcels]);

  const trend = useMemo(() => trendByMonth(filteredParcels), [filteredParcels]);

  const avgSurface = useMemo(() => filteredParcels.length > 0 ? Math.round(totalSurface / filteredParcels.length) : 0, [totalSurface, filteredParcels.length]);
  const density = useMemo(() => totalSurface > 0 ? (filteredParcels.length / (totalSurface / 10000)).toFixed(1) : 'N/A', [totalSurface, filteredParcels.length]);

  const kpiItems = useMemo(() => [
    { key: 'kpi-parcels', label: ct('kpi-parcels', 'Parcelles'), value: filteredParcels.length, cls: 'text-primary' },
    { key: 'kpi-urban', label: ct('kpi-urban', 'Urbaines'), value: urbanCount, cls: 'text-emerald-600', tooltip: pct(urbanCount, filteredParcels.length) },
    { key: 'kpi-rural', label: ct('kpi-rural', 'Rurales'), value: ruralCount, cls: 'text-amber-600', tooltip: pct(ruralCount, filteredParcels.length) },
    { key: 'kpi-occupied', label: ct('kpi-occupied', 'Habitées'), value: occupiedCount, cls: 'text-teal-600', tooltip: pct(occupiedCount, filteredParcels.length) },
    { key: 'kpi-hosting', label: ct('kpi-hosting', 'Cap. accueil'), value: totalHostingCapacity > 0 ? totalHostingCapacity.toLocaleString() : 'N/A', cls: 'text-indigo-600', tooltip: 'Capacité d\'accueil totale' },
    { key: 'kpi-multi-constr', label: ct('kpi-multi-constr', 'Multi-constr.'), value: multiConstructionCount, cls: 'text-orange-600', tooltip: pct(multiConstructionCount, filteredParcels.length) },
    { key: 'kpi-surface', label: ct('kpi-surface', 'Surface tot.'), value: totalSurface > 0 ? `${(totalSurface / 10000).toFixed(1)} ha` : 'N/A', cls: 'text-violet-600', tooltip: `${totalSurface.toLocaleString()} m²` },
    { key: 'kpi-avg-surface', label: ct('kpi-avg-surface', 'Surface moy.'), value: avgSurface > 0 ? `${avgSurface.toLocaleString()} m²` : 'N/A', cls: 'text-blue-600' },
    { key: 'kpi-density', label: ct('kpi-density', 'Densité'), value: density !== 'N/A' ? `${density}/ha` : 'N/A', cls: 'text-rose-600', tooltip: 'Parcelles par hectare' },
  ].filter(k => v(k.key)), [filteredParcels, urbanCount, ruralCount, occupiedCount, totalHostingCapacity, multiConstructionCount, totalSurface, avgSurface, density, v, ct]);

  const chartDefs = useMemo(() => [
    { key: 'title-type', el: () => <ChartCard title={ct('title-type', 'Type titre')} icon={FileText} data={charts.byTitleType} type={ty('title-type', 'bar-h')} colorIndex={0} labelWidth={110}
      insight={generateInsight(charts.byTitleType, 'bar-h', 'les types de titre')} crossVariables={cx('title-type')} rawRecords={normalizedParcels} groupField="property_title_type" /> },
    { key: 'legal-status', el: () => <ChartCard title={ct('legal-status', 'Propriétaires')} icon={Users} data={charts.byLegalStatus} type={ty('legal-status', 'donut')} colorIndex={1}
      insight={generateInsight(charts.byLegalStatus, 'donut', 'les statuts juridiques')} crossVariables={cx('legal-status')} rawRecords={filteredParcels} groupField="current_owner_legal_status" /> },
    { key: 'gender', el: () => <ColorMappedPieCard title={ct('gender', 'Genre propriétaires')} icon={Users} iconColor="text-pink-500" data={genderData} colorMap={GENDER_COLORS}
      insight={genderInsight} crossVariables={cx('gender')} rawRecords={filteredParcels} groupField="current_owner_legal_status" /> },
    { key: 'construction-type', el: () => <ChartCard title={ct('construction-type', 'Construction')} icon={Building} data={charts.byConstructionType} type={ty('construction-type', 'bar-h')} colorIndex={3}
      insight={generateInsight(charts.byConstructionType, 'bar-h', 'les constructions')} crossVariables={cx('construction-type')} rawRecords={normalizedParcels} groupField="construction_type" /> },
    { key: 'construction-nature', el: () => <ChartCard title={ct('construction-nature', 'Nature construction')} data={charts.byConstructionNature} type={ty('construction-nature', 'bar-h')} colorIndex={7}
      insight="Répartition des matériaux et natures de construction par localisation." crossVariables={cx('construction-nature')} rawRecords={filteredParcels} groupField="construction_nature" /> },
    { key: 'property-category', el: () => <ChartCard title={ct('property-category', 'Catégorie de bien')} data={charts.byPropertyCategory} type={ty('property-category', 'bar-h')} colorIndex={2} hidden={charts.byPropertyCategory.length === 0}
      insight={generateInsight(charts.byPropertyCategory, 'bar-h', 'les catégories de bien')} crossVariables={cx('property-category')} rawRecords={filteredParcels} groupField="property_category" /> },
    { key: 'construction-materials', el: () => <ChartCard title={ct('construction-materials', 'Matériaux')} data={charts.byConstructionMaterials} type={ty('construction-materials', 'bar-h')} colorIndex={8} hidden={charts.byConstructionMaterials.length === 0}
      insight={generateInsight(charts.byConstructionMaterials, 'bar-h', 'les matériaux de construction')} crossVariables={cx('construction-materials')} rawRecords={filteredParcels} groupField="construction_materials" /> },
    { key: 'standing', el: () => <ChartCard title={ct('standing', 'Standing')} data={charts.byStanding} type={ty('standing', 'donut')} colorIndex={6} hidden={charts.byStanding.length === 0}
      insight={generateInsight(charts.byStanding, 'donut', 'les niveaux de standing')} crossVariables={cx('standing')} rawRecords={filteredParcels} groupField="standing" /> },
    { key: 'construction-decade', el: () => <ChartCard title={ct('construction-decade', 'Année construction')} icon={Clock} data={charts.byDecade} type={ty('construction-decade', 'bar-v')} colorIndex={0} hidden={charts.byDecade.length === 0}
      insight={generateInsight(charts.byDecade, 'bar-v', 'les décennies de construction')} /> },
    { key: 'usage', el: () => <ChartCard title={ct('usage', 'Usage déclaré')} data={charts.byDeclaredUsage} type={ty('usage', 'bar-h')} colorIndex={5}
      insight={generateInsight(charts.byDeclaredUsage, 'bar-h', 'les usages déclarés')} crossVariables={cx('usage')} rawRecords={normalizedParcels} groupField="declared_usage" /> },
    { key: 'surface', el: () => <ChartCard title={ct('surface', 'Superficie')} icon={Ruler} data={charts.surfaceDist} type={ty('surface', 'bar-v')} colorIndex={9}
      insight={generateInsight(charts.surfaceDist, 'bar-v', 'les tranches de superficie')} crossVariables={cx('surface')} rawRecords={filteredParcels} groupField="area_sqm" /> },
    { key: 'subdivided', el: () => <ChartCard title={ct('subdivided', 'Loties vs Non loties')} data={subdividedData} type={ty('subdivided', 'pie')} colorIndex={3} hidden={subdividedData.length === 0}
      insight={generateInsight(subdividedData, 'pie', 'le lotissement des parcelles')} crossVariables={cx('subdivided')} rawRecords={filteredParcels} groupField="is_subdivided" /> },
    { key: 'occupation', el: () => <ChartCard title={ct('occupation', 'Occupation')} icon={Home} data={occupationData} type={ty('occupation', 'pie')} colorIndex={12} hidden={occupationData.length === 0}
      insight={generateInsight(occupationData, 'pie', "l'occupation des parcelles")} crossVariables={cx('occupation')} rawRecords={filteredParcels} groupField="is_occupied" /> },
    { key: 'floor-dist', el: () => <ChartCard title={ct('floor-dist', 'Nombre d\'étages')} icon={Layers} data={floorDistData} type={ty('floor-dist', 'bar-v')} colorIndex={14} hidden={floorDistData.length === 0}
      insight={generateInsight(floorDistData, 'bar-v', 'la distribution des étages')} crossVariables={cx('floor-dist')} rawRecords={filteredParcels} groupField="floor_number" /> },
    { key: 'geo', el: () => <GeoCharts records={filteredParcels} /> },
    { key: 'permit-type', el: () => <ChartCard title={ct('permit-type', 'Autorisation de bâtir')} icon={ShieldCheck} data={permitTypeData} type={ty('permit-type', 'donut')} colorIndex={4} hidden={permitTypeData.length === 0}
      insight={generateInsight(permitTypeData, 'donut', 'les autorisations de bâtir')} crossVariables={cx('permit-type')} rawRecords={filteredContribs} groupField="building_permits" /> },
    { key: 'building-size', el: () => <ChartCard title={ct('building-size', 'Taille construction')} icon={Maximize} data={buildingSizeData} type={ty('building-size', 'bar-v')} colorIndex={2} hidden={buildingSizeData.length === 0}
      insight={generateInsight(buildingSizeData, 'bar-v', 'les tailles de construction')} crossVariables={cx('building-size')} rawRecords={filteredContribs} groupField="building_shapes" /> },
    { key: 'building-height', el: () => <ChartCard title={ct('building-height', 'Hauteur construction')} icon={ArrowUpFromLine} data={buildingHeightData} type={ty('building-height', 'bar-v')} colorIndex={5} hidden={buildingHeightData.length === 0}
      insight={generateInsight(buildingHeightData, 'bar-v', 'les hauteurs de construction')} crossVariables={cx('building-height')} rawRecords={filteredContribs} groupField="building_shapes" /> },
    { key: 'sound-env', el: () => <ChartCard title={ct('sound-env', 'Environnement sonore')} icon={Volume2} data={soundEnvData} type={ty('sound-env', 'donut')} colorIndex={10} hidden={soundEnvData.length === 0}
      insight={generateInsight(soundEnvData, 'donut', "l'environnement sonore")} crossVariables={cx('sound-env')} rawRecords={filteredContribs} groupField="sound_environment" /> },
    { key: 'noise-sources', el: () => <ChartCard title={ct('noise-sources', 'Sources de bruit')} icon={Ear} data={noiseSourcesData} type={ty('noise-sources', 'bar-v')} colorIndex={11} hidden={noiseSourcesData.length === 0}
      insight={generateInsight(noiseSourcesData, 'bar-v', 'les sources de bruit')} crossVariables={cx('noise-sources')} rawRecords={filteredContribs} groupField="nearby_noise_sources" /> },
    { key: 'evolution', el: () => <ChartCard title={ct('evolution', 'Évolution')} icon={TrendingUp} data={trend} type={ty('evolution', 'area')} colorIndex={0} colSpan={2}
      insight={generateInsight(trend, 'area', 'les parcelles')} /> },
  ].filter(d => v(d.key)).sort((a, b) => ord(a.key) - ord(b.key)), [filteredParcels, filteredContribs, normalizedParcels, charts, permitTypeData, buildingSizeData, buildingHeightData, soundEnvData, noiseSourcesData, genderData, genderInsight, subdividedData, occupationData, floorDistData, multiConstructionCount, trend, v, ct, cx, ty, ord]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.parcels} filter={filter} onChange={setFilter} hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} statusField={filterConfig.statusField} />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {chartDefs.map(d => <React.Fragment key={d.key}>{d.el()}</React.Fragment>)}
      </div>
    </div>
    </FilterLabelContext.Provider>
  );
});
