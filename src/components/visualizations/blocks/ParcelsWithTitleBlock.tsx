import React, { useState, useMemo, memo, useContext, useEffect } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, surfaceDistribution, yearDecadeDistribution, buildFilterLabel } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { FileText, Users, Building, TrendingUp, Ruler, Clock, ShieldCheck, Maximize, ArrowUpFromLine } from 'lucide-react';
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
  const filteredTitleReqs = useMemo(() => data.titleRequests ? applyFilters(data.titleRequests, filter) : [], [data.titleRequests, filter]);
  const filteredDisputes = useMemo(() => data.disputes ? applyFilters(data.disputes, filter) : [], [data.disputes, filter]);
  const filteredMortgages = useMemo(() => data.mortgages ? applyFilters(data.mortgages, filter) : [], [data.mortgages, filter]);
  const filteredMutations = useMemo(() => data.mutationRequests ? applyFilters(data.mutationRequests, filter) : [], [data.mutationRequests, filter]);
  const filteredExpertise = useMemo(() => data.expertiseRequests ? applyFilters(data.expertiseRequests, filter) : [], [data.expertiseRequests, filter]);

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

  // Building permit type from contributions' building_permits JSONB
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

  // Building size distribution from contributions' building_shapes JSONB
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

  // Building height distribution from contributions' building_shapes JSONB
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

  const avgSurface = useMemo(() => filteredParcels.length > 0 ? Math.round(totalSurface / filteredParcels.length) : 0, [totalSurface, filteredParcels.length]);

  const certEnregistrement = useMemo(() => normalizedParcels.filter(p => p.property_title_type === "Certificat d'enregistrement").length, [normalizedParcels]);
  const contratLocation = useMemo(() => normalizedParcels.filter(p => p.property_title_type === 'Contrat de location').length, [normalizedParcels]);
  const ficheParcellaire = useMemo(() => normalizedParcels.filter(p => p.property_title_type === 'Fiche parcellaire').length, [normalizedParcels]);
  const activeMortgages = useMemo(() => filteredMortgages.filter((m: any) => m.mortgage_status === 'active').length, [filteredMortgages]);
  const mutationsEnCours = useMemo(() => filteredMutations.filter((m: any) => ['pending', 'submitted', 'in_progress'].includes(m.status)).length, [filteredMutations]);
  const expertisesEnCours = useMemo(() => filteredExpertise.filter((e: any) => ['pending', 'submitted', 'in_progress'].includes(e.status)).length, [filteredExpertise]);

  const avgConstructionArea = useMemo(() => {
    let total = 0, count = 0;
    filteredContribs.forEach(c => {
      const shapes = c.building_shapes;
      if (Array.isArray(shapes)) shapes.forEach((s: any) => {
        const area = s?.areaSqm ?? (s?.width && s?.height ? s.width * s.height : null);
        if (area != null && area > 0) { total += area; count++; }
      });
    });
    return count > 0 ? Math.round(total / count) : 0;
  }, [filteredContribs]);

  const avgConstructionHeight = useMemo(() => {
    let total = 0, count = 0;
    filteredContribs.forEach(c => {
      const shapes = c.building_shapes;
      if (Array.isArray(shapes)) shapes.forEach((s: any) => {
        const h = s?.heightM ?? s?.height_m;
        if (h != null && h > 0) { total += h; count++; }
      });
    });
    return count > 0 ? (total / count).toFixed(1) : '0';
  }, [filteredContribs]);

  const kpiItems = useMemo(() => [
    { key: 'kpi-cert-enregistrement', label: ct('kpi-cert-enregistrement', "Certificat d'enregistrement"), value: certEnregistrement, cls: 'text-primary', tooltip: pct(certEnregistrement, filteredParcels.length) },
    { key: 'kpi-contrat-location', label: ct('kpi-contrat-location', 'Contrat de location'), value: contratLocation, cls: 'text-emerald-600', tooltip: pct(contratLocation, filteredParcels.length) },
    { key: 'kpi-fiche-parcellaire', label: ct('kpi-fiche-parcellaire', 'Fiche parcellaire'), value: ficheParcellaire, cls: 'text-amber-600', tooltip: pct(ficheParcellaire, filteredParcels.length) },
    { key: 'kpi-titres-demandes', label: ct('kpi-titres-demandes', 'Titres demandés'), value: filteredTitleReqs.length, cls: 'text-violet-600' },
    { key: 'kpi-litiges', label: ct('kpi-litiges', 'Litiges fonciers'), value: filteredDisputes.length, cls: 'text-red-600' },
    { key: 'kpi-hypotheques-actives', label: ct('kpi-hypotheques-actives', 'Hypothèques actives'), value: activeMortgages, cls: 'text-orange-600' },
    { key: 'kpi-mutations-cours', label: ct('kpi-mutations-cours', 'Mutations en cours'), value: mutationsEnCours, cls: 'text-blue-600' },
    { key: 'kpi-expertises-cours', label: ct('kpi-expertises-cours', 'Expertises en cours'), value: expertisesEnCours, cls: 'text-pink-600' },
    { key: 'kpi-superficie-moy', label: ct('kpi-superficie-moy', 'Superficie moy. parcelle'), value: avgSurface > 0 ? `${avgSurface.toLocaleString()} m²` : 'N/A', cls: 'text-teal-600' },
    { key: 'kpi-superficie-construction-moy', label: ct('kpi-superficie-construction-moy', 'Superficie moy. construction'), value: avgConstructionArea > 0 ? `${avgConstructionArea} m²` : 'N/A', cls: 'text-indigo-600' },
    { key: 'kpi-hauteur-construction-moy', label: ct('kpi-hauteur-construction-moy', 'Hauteur moy. construction'), value: avgConstructionHeight !== '0' ? `${avgConstructionHeight} m` : 'N/A', cls: 'text-cyan-600' },
  ].filter(k => v(k.key)), [filteredParcels, normalizedParcels, certEnregistrement, contratLocation, ficheParcellaire, filteredTitleReqs, filteredDisputes, activeMortgages, mutationsEnCours, expertisesEnCours, avgSurface, avgConstructionArea, avgConstructionHeight, v, getChartConfig]);

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
        {v('surface') && <ChartCard title={ct('surface', 'Superficie')} icon={Ruler} data={charts.surfaceDist} type="bar-v" colorIndex={9}
          insight={generateInsight(charts.surfaceDist, 'bar-v', 'les tranches de superficie')} crossVariables={cx('surface')} rawRecords={filteredParcels} groupField="area_sqm" />}
        {v('subdivided') && <ChartCard title={ct('subdivided', 'Loties vs Non loties')} data={subdividedData} type="pie" colorIndex={3} hidden={subdividedData.length === 0}
          insight={generateInsight(subdividedData, 'pie', 'le lotissement des parcelles')} crossVariables={cx('subdivided')} rawRecords={filteredParcels} groupField="is_subdivided" />}
        {v('geo') && <GeoCharts records={filteredParcels} />}
        {v('permit-type') && <ChartCard title={ct('permit-type', 'Autorisation de bâtir')} icon={ShieldCheck} data={permitTypeData} type="donut" colorIndex={4} hidden={permitTypeData.length === 0}
          insight={generateInsight(permitTypeData, 'donut', 'les autorisations de bâtir')} crossVariables={cx('permit-type')} rawRecords={filteredContribs} groupField="building_permits" />}
        {v('building-size') && <ChartCard title={ct('building-size', 'Taille construction')} icon={Maximize} data={buildingSizeData} type="bar-v" colorIndex={2} hidden={buildingSizeData.length === 0}
          insight={generateInsight(buildingSizeData, 'bar-v', 'les tailles de construction')} crossVariables={cx('building-size')} rawRecords={filteredContribs} groupField="building_shapes" />}
        {v('building-height') && <ChartCard title={ct('building-height', 'Hauteur construction')} icon={ArrowUpFromLine} data={buildingHeightData} type="bar-v" colorIndex={5} hidden={buildingHeightData.length === 0}
          insight={generateInsight(buildingHeightData, 'bar-v', 'les hauteurs de construction')} crossVariables={cx('building-height')} rawRecords={filteredContribs} groupField="building_shapes" />}
        {v('evolution') && <ChartCard title={ct('evolution', 'Évolution')} icon={TrendingUp} data={trend} type="area" colorIndex={0} colSpan={2}
          insight={generateInsight(trend, 'area', 'les parcelles')} />}
      </div>
    </div>
    </FilterLabelContext.Provider>
  );
});
