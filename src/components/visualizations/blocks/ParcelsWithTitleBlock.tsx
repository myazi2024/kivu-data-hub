import React, { useState, useMemo, memo, useContext, useEffect } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, surfaceDistribution, yearDecadeDistribution, buildFilterLabel } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { FileText, Users, Building, TrendingUp, Ruler, Home, Clock } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, ColorMappedPieCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { MapProvinceContext, VilleFilterContext, CommuneFilterContext, QuartierFilterContext } from '../filters/AnalyticsFilters';
import { generateInsight } from '@/utils/chartInsights';
import { useTabChartsConfig, useTabFilterConfig, ANALYTICS_TABS_REGISTRY } from '@/hooks/useAnalyticsChartsConfig';
import { normalizeTitleType } from '@/utils/titleTypeNormalizer';
import { normalizeConstructionType } from '@/utils/constructionTypeNormalizer';
import { normalizeDeclaredUsage } from '@/utils/declaredUsageNormalizer';
import { getCrossVariables } from '@/config/crossVariables';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'parcels-titled';
const defaultItems = [...ANALYTICS_TABS_REGISTRY[TAB_KEY].kpis, ...ANALYTICS_TABS_REGISTRY[TAB_KEY].charts];
const cx = (key: string) => getCrossVariables(TAB_KEY, key);

const GENDER_COLORS: Record<string, string> = {
  'Masculin': '#3b82f6', 'Féminin': '#ec4899', 'M': '#3b82f6', 'F': '#ec4899',
  'Autre': '#8b5cf6', '(Non renseigné)': '#9ca3af',
};

export const ParcelsWithTitleBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const mapProvince = useContext(MapProvinceContext);
  const mapVille = useContext(VilleFilterContext);
  const mapCommune = useContext(CommuneFilterContext);
  const mapQuartier = useContext(QuartierFilterContext);
  useEffect(() => { setFilter(f => ({ ...f, province: mapProvince || undefined, ville: mapVille || undefined, commune: mapCommune || undefined, quartier: mapQuartier || undefined })); }, [mapProvince, mapVille, mapCommune, mapQuartier]);
  const filterLabel = useMemo(() => buildFilterLabel(filter), [filter]);
  const { isChartVisible, getChartConfig } = useTabChartsConfig(TAB_KEY, defaultItems);
  const filterConfig = useTabFilterConfig(TAB_KEY);
  const filteredParcels = useMemo(() => applyFilters(data.parcels, filter), [data.parcels, filter]);
  const filteredContribs = useMemo(() => applyFilters(data.contributions, filter), [data.contributions, filter]);

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
    byLeaseType: countBy(filteredParcels, 'lease_type'),
    surfaceDist: surfaceDistribution(filteredParcels),
    byDecade: yearDecadeDistribution(filteredParcels, 'construction_year'),
  }), [filteredParcels, normalizedParcels]);

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

  const trend = useMemo(() => trendByMonth(filteredParcels), [filteredParcels]);

  const ct = (key: string, fallback: string) => getChartConfig(key)?.custom_title || fallback;
  const v = isChartVisible;

  const kpiItems = useMemo(() => [
    { key: 'kpi-parcels', label: ct('kpi-parcels', 'Parcelles'), value: filteredParcels.length, cls: 'text-primary' },
    { key: 'kpi-urban', label: ct('kpi-urban', 'Urbaines'), value: urbanCount, cls: 'text-emerald-600', tooltip: pct(urbanCount, filteredParcels.length) },
    { key: 'kpi-rural', label: ct('kpi-rural', 'Rurales'), value: ruralCount, cls: 'text-amber-600', tooltip: pct(ruralCount, filteredParcels.length) },
    { key: 'kpi-surface', label: ct('kpi-surface', 'Surface tot.'), value: totalSurface > 0 ? `${(totalSurface / 10000).toFixed(1)} ha` : 'N/A', cls: 'text-violet-600', tooltip: `${totalSurface.toLocaleString()} m²` },
  ].filter(k => v(k.key)), [filteredParcels, urbanCount, ruralCount, totalSurface, v, getChartConfig]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.parcels} filter={filter} onChange={setFilter} hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} statusField={filterConfig.statusField} />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {v('title-type') && <ChartCard title={ct('title-type', 'Type titre')} icon={FileText} data={charts.byTitleType} type="bar-h" colorIndex={0} labelWidth={110}
          insight={generateInsight(charts.byTitleType, 'bar-h', 'les types de titre')} crossVariables={cx('title-type')} rawRecords={normalizedParcels} groupField="property_title_type" />}
        {v('legal-status') && <ChartCard title={ct('legal-status', 'Propriétaires')} icon={Users} data={charts.byLegalStatus} type="donut" colorIndex={1}
          insight={generateInsight(charts.byLegalStatus, 'donut', 'les statuts juridiques')} crossVariables={cx('legal-status')} rawRecords={filteredParcels} groupField="current_owner_legal_status" />}
        {v('gender') && <ColorMappedPieCard title={ct('gender', 'Genre propriétaires')} icon={Users} iconColor="text-pink-500" data={genderData} colorMap={GENDER_COLORS}
          insight={genderInsight} crossVariables={cx('gender')} rawRecords={filteredParcels} groupField="current_owner_legal_status" />}
        {v('construction-type') && <ChartCard title={ct('construction-type', 'Construction')} icon={Building} data={charts.byConstructionType} type="bar-h" colorIndex={3}
          insight={generateInsight(charts.byConstructionType, 'bar-h', 'les constructions')} crossVariables={cx('construction-type')} rawRecords={normalizedParcels} groupField="construction_type" />}
        {v('construction-nature') && <ChartCard title={ct('construction-nature', 'Nature construction')} data={charts.byConstructionNature} type="bar-h" colorIndex={7}
          insight="Répartition des matériaux et natures de construction par localisation." crossVariables={cx('construction-nature')} rawRecords={filteredParcels} groupField="construction_nature" />}
        {v('property-category') && <ChartCard title={ct('property-category', 'Catégorie de bien')} data={charts.byPropertyCategory} type="bar-h" colorIndex={2} hidden={charts.byPropertyCategory.length === 0}
          insight={generateInsight(charts.byPropertyCategory, 'bar-h', 'les catégories de bien')} crossVariables={cx('property-category')} rawRecords={filteredParcels} groupField="property_category" />}
        {v('construction-materials') && <ChartCard title={ct('construction-materials', 'Matériaux')} data={charts.byConstructionMaterials} type="bar-h" colorIndex={8} hidden={charts.byConstructionMaterials.length === 0}
          insight={generateInsight(charts.byConstructionMaterials, 'bar-h', 'les matériaux de construction')} crossVariables={cx('construction-materials')} rawRecords={filteredParcels} groupField="construction_materials" />}
        {v('standing') && <ChartCard title={ct('standing', 'Standing')} data={charts.byStanding} type="donut" colorIndex={6} hidden={charts.byStanding.length === 0}
          insight={generateInsight(charts.byStanding, 'donut', 'les niveaux de standing')} crossVariables={cx('standing')} rawRecords={filteredParcels} groupField="standing" />}
        {v('construction-decade') && <ChartCard title={ct('construction-decade', 'Année construction')} icon={Clock} data={charts.byDecade} type="bar-v" colorIndex={0} hidden={charts.byDecade.length === 0}
          insight={generateInsight(charts.byDecade, 'bar-v', 'les décennies de construction')} />}
        {v('usage') && <ChartCard title={ct('usage', 'Usage déclaré')} data={charts.byDeclaredUsage} type="bar-h" colorIndex={5}
          insight={generateInsight(charts.byDeclaredUsage, 'bar-h', 'les usages déclarés')} crossVariables={cx('usage')} rawRecords={normalizedParcels} groupField="declared_usage" />}
        {v('lease-type') && <ChartCard title={ct('lease-type', 'Type bail')} icon={Home} data={charts.byLeaseType} type="donut" colorIndex={9} hidden={charts.byLeaseType.length === 0}
          insight={generateInsight(charts.byLeaseType, 'donut', 'les types de bail')} crossVariables={cx('lease-type')} rawRecords={filteredParcels} groupField="lease_type" />}
        {v('surface') && <ChartCard title={ct('surface', 'Superficie')} icon={Ruler} data={charts.surfaceDist} type="bar-v" colorIndex={9}
          insight={generateInsight(charts.surfaceDist, 'bar-v', 'les tranches de superficie')} crossVariables={cx('surface')} rawRecords={filteredParcels} groupField="area_sqm" />}
        {v('subdivided') && <ChartCard title={ct('subdivided', 'Loties vs Non loties')} data={subdividedData} type="pie" colorIndex={3} hidden={subdividedData.length === 0}
          insight={generateInsight(subdividedData, 'pie', 'le lotissement des parcelles')} crossVariables={cx('subdivided')} rawRecords={filteredParcels} groupField="is_subdivided" />}
        {v('geo') && <GeoCharts records={filteredParcels} />}
        {v('evolution') && <ChartCard title={ct('evolution', 'Évolution')} icon={TrendingUp} data={trend} type="area" colorIndex={0} colSpan={2}
          insight={generateInsight(trend, 'area', 'les parcelles')} />}
      </div>
    </div>
    </FilterLabelContext.Provider>
  );
});
