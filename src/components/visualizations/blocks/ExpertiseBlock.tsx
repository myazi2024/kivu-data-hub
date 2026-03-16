import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, avgProcessingDays, numericDistribution, yearDecadeDistribution, avgField } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Search, TrendingUp, DollarSign, Building, Zap, ShieldAlert, MapPin, Ruler, Clock, Trees } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';

import { generateInsight } from '@/utils/chartInsights';
import { useTabChartsConfig, ANALYTICS_TABS_REGISTRY } from '@/hooks/useAnalyticsChartsConfig';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'expertise';
const defaultItems = [...ANALYTICS_TABS_REGISTRY[TAB_KEY].kpis, ...ANALYTICS_TABS_REGISTRY[TAB_KEY].charts];

export const ExpertiseBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.expertiseRequests, filter), [data.expertiseRequests, filter]);

  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const byPaymentStatus = useMemo(() => countBy(filtered, 'payment_status'), [filtered]);
  const byPropertyCondition = useMemo(() => countBy(filtered, 'property_condition'), [filtered]);
  const byConstructionQuality = useMemo(() => countBy(filtered, 'construction_quality'), [filtered]);
  const byRoadAccess = useMemo(() => countBy(filtered, 'road_access_type'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  const byDecade = useMemo(() => yearDecadeDistribution(filtered, 'construction_year'), [filtered]);

  const builtAreaDist = useMemo(() => numericDistribution(filtered, 'total_built_area_sqm', [
    { name: '< 50 m²', min: 0, max: 50 },
    { name: '50-100', min: 51, max: 100 },
    { name: '100-200', min: 101, max: 200 },
    { name: '200-500', min: 201, max: 500 },
    { name: '> 500 m²', min: 501, max: Infinity },
  ]), [filtered]);

  const gardenDist = useMemo(() => numericDistribution(
    filtered.filter(r => r.has_garden === true), 'garden_area_sqm', [
    { name: '< 50 m²', min: 0, max: 50 },
    { name: '50-200', min: 51, max: 200 },
    { name: '200-500', min: 201, max: 500 },
    { name: '> 500 m²', min: 501, max: Infinity },
  ]), [filtered]);

  const equipmentData = useMemo(() => {
    const items = [
      { field: 'has_electricity', label: 'Électricité' },
      { field: 'has_water_supply', label: 'Eau' },
      { field: 'has_internet', label: 'Internet' },
      { field: 'has_sewage_system', label: 'Assainissement' },
      { field: 'has_parking', label: 'Parking' },
      { field: 'has_security_system', label: 'Sécurité' },
      { field: 'has_garden', label: 'Jardin' },
    ];
    return items.map(i => ({
      name: i.label,
      value: filtered.filter(r => r[i.field] === true).length,
    })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const riskData = useMemo(() => {
    const flood = filtered.filter(r => r.flood_risk_zone === true).length;
    const erosion = filtered.filter(r => r.erosion_risk_zone === true).length;
    const result: { name: string; value: number }[] = [];
    if (flood > 0) result.push({ name: 'Zone inondable', value: flood });
    if (erosion > 0) result.push({ name: 'Zone érosion', value: erosion });
    if (result.length === 0) return [];
    const safe = filtered.length - Math.max(flood, erosion);
    if (safe > 0) result.push({ name: 'Hors risque', value: safe });
    return result;
  }, [filtered]);

  const valueDist = useMemo(() => numericDistribution(filtered, 'market_value_usd', [
    { name: '< $5K', min: 0, max: 5000 },
    { name: '$5K-$20K', min: 5001, max: 20000 },
    { name: '$20K-$50K', min: 20001, max: 50000 },
    { name: '$50K-$100K', min: 50001, max: 100000 },
    { name: '> $100K', min: 100001, max: Infinity },
  ]), [filtered]);

  const floorsDist = useMemo(() => countBy(
    filtered.filter(r => r.number_of_floors != null),
    'number_of_floors'
  ), [filtered]);

  const proximityData = useMemo(() => {
    const items = [
      { field: 'distance_to_main_road_m', label: 'Route princ. (m)' },
      { field: 'distance_to_market_km', label: 'Marché (km)' },
      { field: 'distance_to_school_km', label: 'École (km)' },
      { field: 'distance_to_hospital_km', label: 'Hôpital (km)' },
    ];
    return items.map(i => ({
      name: i.label,
      value: avgField(filtered, i.field),
    })).filter(d => d.value > 0);
  }, [filtered]);

  const stats = useMemo(() => {
    const completed = filtered.filter(r => r.status === 'completed').length;
    const pending = filtered.filter(r => r.status === 'pending').length;
    const inProgress = filtered.filter(r => ['in_progress', 'assigned'].includes(r.status)).length;
    const avgDays = avgProcessingDays(filtered, 'created_at', 'expertise_date');
    const assignDelay = avgProcessingDays(filtered, 'created_at', 'assigned_at');
    const totalValue = filtered.reduce((s, r) => s + (r.market_value_usd || 0), 0);
    const avgValue = filtered.filter(r => r.market_value_usd).length > 0
      ? Math.round(totalValue / filtered.filter(r => r.market_value_usd).length)
      : 0;
    return { completed, pending, inProgress, avgDays, assignDelay, totalValue, avgValue };
  }, [filtered]);


  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.expertiseRequests} filter={filter} onChange={setFilter} />
      <KpiGrid items={[
        { label: 'Total', value: filtered.length, cls: 'text-violet-600' },
        { label: 'Complétées', value: stats.completed, cls: 'text-emerald-600', tooltip: pct(stats.completed, filtered.length) },
        { label: 'En cours', value: stats.inProgress, cls: 'text-blue-600', tooltip: pct(stats.inProgress, filtered.length) },
        { label: 'Délai total', value: stats.avgDays > 0 ? `${stats.avgDays}j` : 'N/A', cls: 'text-rose-600', tooltip: 'Délai moyen de traitement' },
        { label: 'Délai assign.', value: stats.assignDelay > 0 ? `${stats.assignDelay}j` : 'N/A', cls: 'text-amber-600', tooltip: 'Délai moyen avant assignation' },
        { label: 'Valeur moy.', value: stats.avgValue > 0 ? `$${stats.avgValue.toLocaleString()}` : 'N/A', cls: 'text-primary', tooltip: `Total: $${stats.totalValue.toLocaleString()}` },
      ]} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ChartCard title="Statut détaillé" icon={Search} data={byStatus} type="bar-v" colorIndex={5}
          insight={generateInsight(byStatus, 'bar-v', 'les statuts d\'expertise')} />
        <ChartCard title="Paiement" icon={DollarSign} data={byPaymentStatus} type="donut" colorIndex={2}
          insight={generateInsight(byPaymentStatus, 'donut', 'les paiements')} />
        <ChartCard title="État du bien" icon={Building} data={byPropertyCondition} type="bar-h" colorIndex={7} labelWidth={100} hidden={byPropertyCondition.length === 0}
          insight={generateInsight(byPropertyCondition, 'bar-h', 'l\'état des biens')} />
        <ChartCard title="Qualité construction" data={byConstructionQuality} type="donut" colorIndex={3} hidden={byConstructionQuality.length === 0}
          insight={generateInsight(byConstructionQuality, 'donut', 'la qualité de construction')} />
        <ChartCard title="Année construction" icon={Clock} data={byDecade} type="bar-v" colorIndex={0} hidden={byDecade.length === 0}
          insight={generateInsight(byDecade, 'bar-v', 'les périodes de construction')} />
        <ChartCard title="Surface bâtie" icon={Ruler} data={builtAreaDist} type="bar-v" colorIndex={1} hidden={builtAreaDist.length === 0}
          insight={generateInsight(builtAreaDist, 'bar-v', 'les surfaces bâties')} />
        <ChartCard title="Équipements" icon={Zap} data={equipmentData} type="bar-h" colorIndex={9} labelWidth={100} hidden={equipmentData.length === 0}
          insight="Répartition des équipements disponibles dans les biens expertisés." />
        <ChartCard title="Accès routier" icon={MapPin} data={byRoadAccess} type="pie" colorIndex={0} hidden={byRoadAccess.length === 0}
          insight={generateInsight(byRoadAccess, 'pie', 'les types d\'accès routier')} />
        <ChartCard title="Proximité moy." icon={MapPin} data={proximityData} type="bar-h" colorIndex={6} labelWidth={110} hidden={proximityData.length === 0}
          insight="Distance moyenne aux infrastructures clés (routes, marchés, écoles, hôpitaux)." />
        <ChartCard title="Zones à risque" icon={ShieldAlert} data={riskData} type="pie" colorIndex={4} hidden={riskData.length === 0}
          insight={riskData.length > 0 ? `${riskData.filter(r => r.name !== 'Hors risque').reduce((s, r) => s + r.value, 0)} bien(s) situé(s) en zone à risque.` : ''} />
        <ChartCard title="Valeur marchande" icon={DollarSign} data={valueDist} type="bar-v" colorIndex={2} hidden={valueDist.length === 0}
          insight={generateInsight(valueDist, 'bar-v', 'les tranches de valeur')} />
        <ChartCard title="Nbre d'étages" icon={Building} data={floorsDist} type="bar-v" colorIndex={1} hidden={floorsDist.length === 0}
          insight={generateInsight(floorsDist, 'bar-v', 'le nombre d\'étages')} />
        <ChartCard title="Surface jardin" icon={Trees} data={gardenDist} type="bar-v" colorIndex={10} hidden={gardenDist.length === 0}
          insight={generateInsight(gardenDist, 'bar-v', 'les surfaces de jardin')} />
        <GeoCharts records={filtered} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={5} colSpan={2}
          insight={generateInsight(trend, 'area', 'les demandes d\'expertise')} />
      </div>
    </div>
  );
});
