import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, surfaceDistribution, yearDecadeDistribution, CHART_COLORS, buildFilterLabel } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { FileText, Users, Building, Shield, Landmark, TrendingUp, Ruler, Home, Clock, CheckCircle } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, ColorMappedPieCard, StackedBarCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';

import { generateInsight, generateStackedInsight } from '@/utils/chartInsights';
import { useTabChartsConfig, ANALYTICS_TABS_REGISTRY } from '@/hooks/useAnalyticsChartsConfig';
import { normalizeTitleType } from '@/utils/titleTypeNormalizer';
import { normalizeConstructionType } from '@/utils/constructionTypeNormalizer';
import { normalizeDeclaredUsage } from '@/utils/declaredUsageNormalizer';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'parcels-titled';
const defaultItems = [...ANALYTICS_TABS_REGISTRY[TAB_KEY].kpis, ...ANALYTICS_TABS_REGISTRY[TAB_KEY].charts];

const GENDER_COLORS: Record<string, string> = {
  'Masculin': '#3b82f6', 'Féminin': '#ec4899', 'M': '#3b82f6', 'F': '#ec4899',
  'Autre': '#8b5cf6', '(Non renseigné)': '#9ca3af',
};

export const ParcelsWithTitleBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filterLabel = useMemo(() => buildFilterLabel(filter), [filter]);
  const { isChartVisible, getChartConfig } = useTabChartsConfig(TAB_KEY, defaultItems);
  const filteredParcels = useMemo(() => applyFilters(data.parcels, filter), [data.parcels, filter]);
  const filteredContribs = useMemo(() => applyFilters(data.contributions, filter), [data.contributions, filter]);
  const filteredPermits = useMemo(() => applyFilters(data.buildingPermits, filter), [data.buildingPermits, filter]);
  const filteredTaxes = useMemo(() => applyFilters(data.taxHistory, filter), [data.taxHistory, filter]);
  const filteredMortgages = useMemo(() => applyFilters(data.mortgages, filter), [data.mortgages, filter]);

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

  const permitData = useMemo(() => {
    const parcelIdsWithPermit = new Set(filteredPermits.map(p => p.parcel_id));
    const w = filteredParcels.filter(p => parcelIdsWithPermit.has(p.id)).length;
    const distribution = [{ name: 'Avec', value: w }, { name: 'Sans', value: filteredParcels.length - w }];
    const byAdminStatus = countBy(filteredPermits, 'administrative_status');
    const byIssuingService = countBy(filteredPermits, 'issuing_service');
    const now = new Date();
    let valid = 0, expired = 0;
    filteredPermits.forEach(p => {
      if (p.is_current === false) { expired++; return; }
      if (p.issue_date && p.validity_period_months) {
        const expiry = new Date(p.issue_date);
        expiry.setMonth(expiry.getMonth() + p.validity_period_months);
        if (expiry > now) valid++; else expired++;
      } else if (p.is_current === true) valid++;
    });
    const validityDist = [
      ...(valid > 0 ? [{ name: 'Valides', value: valid }] : []),
      ...(expired > 0 ? [{ name: 'Expirées', value: expired }] : []),
    ];
    return { distribution, byAdminStatus, byIssuingService, validityDist };
  }, [filteredParcels, filteredPermits]);

  const urbanCount = useMemo(() => filteredParcels.filter(p => p.parcel_type === 'SU' || p.parcel_type === 'Terrain bâti').length, [filteredParcels]);
  const ruralCount = useMemo(() => filteredParcels.filter(p => p.parcel_type === 'SR' || p.parcel_type === 'Terrain nu').length, [filteredParcels]);
  const totalSurface = useMemo(() => filteredParcels.reduce((s, p) => s + (p.area_sqm || 0), 0), [filteredParcels]);

  const taxData = useMemo(() => {
    const byPayment = countBy(filteredTaxes, 'payment_status');
    const byYear = new Map<number, { paid: number; pending: number }>();
    let paidAmount = 0, pendingAmount = 0;
    filteredTaxes.forEach(t => {
      if (!byYear.has(t.tax_year)) byYear.set(t.tax_year, { paid: 0, pending: 0 });
      const e = byYear.get(t.tax_year)!;
      if (t.payment_status === 'paid') { e.paid++; paidAmount += t.amount_usd || 0; }
      else { e.pending++; pendingAmount += t.amount_usd || 0; }
    });
    const yearData = Array.from(byYear.entries()).sort(([a], [b]) => a - b).map(([year, d]) => ({ name: String(year), paid: d.paid, pending: d.pending }));
    const yearAmountData = Array.from(byYear.entries()).sort(([a], [b]) => a - b).map(([year]) => {
      const yearTaxes = filteredTaxes.filter(t => t.tax_year === year);
      const total = yearTaxes.reduce((s, t) => s + (t.amount_usd || 0), 0);
      return { name: String(year), value: Math.round(total) };
    });
    const delayData = filteredTaxes
      .filter(t => t.payment_date && t.payment_status === 'paid')
      .map(t => {
        const taxDate = new Date(t.tax_year, 0, 1);
        const payDate = new Date(t.payment_date);
        return Math.round((payDate.getTime() - taxDate.getTime()) / (1000 * 60 * 60 * 24));
      });
    const avgPaymentDelay = delayData.length > 0 ? Math.round(delayData.reduce((a, b) => a + b, 0) / delayData.length) : 0;
    return { byPayment, yearData, yearAmountData, paidAmount, pendingAmount, avgPaymentDelay };
  }, [filteredTaxes]);

  const mortgageData = useMemo(() => {
    const parcelIdsWithMortgage = new Set(filteredMortgages.map(m => m.parcel_id));
    const w = filteredParcels.filter(p => parcelIdsWithMortgage.has(p.id)).length;
    const distribution = [{ name: 'Avec hyp.', value: w }, { name: 'Sans hyp.', value: filteredParcels.length - w }];
    const totalAmount = filteredMortgages.reduce((s, m) => s + (m.mortgage_amount_usd || 0), 0);
    const avgDuration = filteredMortgages.length > 0 ? Math.round(filteredMortgages.reduce((s, m) => s + (m.duration_months || 0), 0) / filteredMortgages.length) : 0;
    const byCreditorType = countBy(filteredMortgages, 'creditor_type');
    const byStatus = countBy(filteredMortgages, 'mortgage_status');
    const contractYearMap = new Map<string, number>();
    filteredMortgages.forEach(m => {
      if (m.contract_date) {
        const y = new Date(m.contract_date).getFullYear().toString();
        contractYearMap.set(y, (contractYearMap.get(y) || 0) + 1);
      }
    });
    const contractTrend = Array.from(contractYearMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => ({ name, value }));
    return { distribution, totalAmount, avgDuration, byCreditorType, byStatus, count: filteredMortgages.length, contractTrend };
  }, [filteredParcels, filteredMortgages]);

  const trend = useMemo(() => trendByMonth(filteredParcels), [filteredParcels]);

  const ct = (key: string, fallback: string) => getChartConfig(key)?.custom_title || fallback;
  const v = isChartVisible;

  const kpiItems = useMemo(() => [
    { key: 'kpi-parcels', label: ct('kpi-parcels', 'Parcelles'), value: filteredParcels.length, cls: 'text-primary' },
    { key: 'kpi-urban', label: ct('kpi-urban', 'Urbaines'), value: urbanCount, cls: 'text-emerald-600', tooltip: pct(urbanCount, filteredParcels.length) },
    { key: 'kpi-rural', label: ct('kpi-rural', 'Rurales'), value: ruralCount, cls: 'text-amber-600', tooltip: pct(ruralCount, filteredParcels.length) },
    { key: 'kpi-surface', label: ct('kpi-surface', 'Surface tot.'), value: totalSurface > 0 ? `${(totalSurface / 10000).toFixed(1)} ha` : 'N/A', cls: 'text-violet-600', tooltip: `${totalSurface.toLocaleString()} m²` },
    { key: 'kpi-taxes', label: ct('kpi-taxes', 'Taxes payées'), value: `$${taxData.paidAmount.toLocaleString()}`, cls: 'text-blue-600', tooltip: `Impayées: $${taxData.pendingAmount.toLocaleString()}${taxData.avgPaymentDelay > 0 ? ` | Délai moy: ${taxData.avgPaymentDelay}j` : ''}` },
    { key: 'kpi-mortgages', label: ct('kpi-mortgages', 'Hypothèques'), value: `$${mortgageData.totalAmount.toLocaleString()}`, cls: 'text-rose-600', tooltip: `${mortgageData.count} contrats, durée moy. ${mortgageData.avgDuration} mois` },
  ].filter(k => v(k.key)), [filteredParcels, urbanCount, ruralCount, totalSurface, taxData, mortgageData, v, getChartConfig]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.parcels} filter={filter} onChange={setFilter} hidePaymentStatus />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {v('title-type') && <ChartCard title={ct('title-type', 'Type titre')} icon={FileText} data={charts.byTitleType} type="bar-h" colorIndex={0} labelWidth={110}
          insight={generateInsight(charts.byTitleType, 'bar-h', 'les types de titre')} />}
        {v('legal-status') && <ChartCard title={ct('legal-status', 'Propriétaires')} icon={Users} data={charts.byLegalStatus} type="donut" colorIndex={1}
          insight={generateInsight(charts.byLegalStatus, 'donut', 'les statuts juridiques')} />}
        {v('gender') && <ColorMappedPieCard title={ct('gender', 'Genre propriétaires')} icon={Users} iconColor="text-pink-500" data={genderData} colorMap={GENDER_COLORS}
          insight={genderInsight} />}
        {v('construction-type') && <ChartCard title={ct('construction-type', 'Construction')} icon={Building} data={charts.byConstructionType} type="bar-h" colorIndex={3}
          insight={generateInsight(charts.byConstructionType, 'bar-h', 'les constructions')} />}
        {v('construction-nature') && <ChartCard title={ct('construction-nature', 'Nature construction')} data={charts.byConstructionNature} type="bar-h" colorIndex={7}
          insight="Répartition des matériaux et natures de construction par localisation." />}
        {v('construction-decade') && <ChartCard title={ct('construction-decade', 'Année construction')} icon={Clock} data={charts.byDecade} type="bar-v" colorIndex={0} hidden={charts.byDecade.length === 0}
          insight={generateInsight(charts.byDecade, 'bar-v', 'les décennies de construction')} />}
        {v('permits') && <ChartCard title={ct('permits', 'Autorisation bâtir')} icon={Shield} data={permitData.distribution} type="pie" colorIndex={2}
          insight={generateInsight(permitData.distribution, 'pie', 'les autorisations de bâtir')} />}
        {v('permit-admin') && <ChartCard title={ct('permit-admin', 'Statut autoris.')} icon={CheckCircle} data={permitData.byAdminStatus} type="bar-v" colorIndex={8} hidden={permitData.byAdminStatus.length === 0}
          insight={generateInsight(permitData.byAdminStatus, 'bar-v', 'les statuts administratifs')} />}
        {v('permit-validity') && <ChartCard title={ct('permit-validity', 'Validité autoris.')} data={permitData.validityDist} type="pie" colorIndex={2} hidden={permitData.validityDist.length === 0}
          insight={generateInsight(permitData.validityDist, 'pie', 'la validité des autorisations')} />}
        {v('permit-service') && <ChartCard title={ct('permit-service', 'Service émetteur')} data={permitData.byIssuingService} type="bar-h" colorIndex={6} labelWidth={100} hidden={permitData.byIssuingService.length === 0}
          insight={generateInsight(permitData.byIssuingService, 'bar-h', 'les services émetteurs')} />}
        {v('usage') && <ChartCard title={ct('usage', 'Usage déclaré')} data={charts.byDeclaredUsage} type="bar-h" colorIndex={5}
          insight={generateInsight(charts.byDeclaredUsage, 'bar-h', 'les usages déclarés')} />}
        {v('lease-type') && <ChartCard title={ct('lease-type', 'Type bail')} icon={Home} data={charts.byLeaseType} type="donut" colorIndex={9} hidden={charts.byLeaseType.length === 0}
          insight={generateInsight(charts.byLeaseType, 'donut', 'les types de bail')} />}
        {v('surface') && <ChartCard title={ct('surface', 'Superficie')} icon={Ruler} data={charts.surfaceDist} type="bar-v" colorIndex={9}
          insight={generateInsight(charts.surfaceDist, 'bar-v', 'les tranches de superficie')} />}
        {v('geo') && <GeoCharts records={filteredParcels} />}
        {v('taxes') && <ChartCard title={ct('taxes', 'Taxes')} icon={Landmark} data={taxData.byPayment} type="donut" colorIndex={0}
          insight={generateInsight(taxData.byPayment, 'donut', 'le statut des taxes')} />}
        {v('taxes-year') && <StackedBarCard title={ct('taxes-year', 'Taxes/année')} data={taxData.yearData} bars={[
          { dataKey: 'paid', name: 'Payées', color: CHART_COLORS[2] },
          { dataKey: 'pending', name: 'Impayées', color: CHART_COLORS[4] },
        ]} hidden={taxData.yearData.length === 0}
          insight={generateStackedInsight(taxData.yearData, [{ dataKey: 'paid', name: 'Payées' }, { dataKey: 'pending', name: 'Impayées' }])} />}
        {v('taxes-amount') && <ChartCard title={ct('taxes-amount', 'Montants taxes/an')} icon={TrendingUp} data={taxData.yearAmountData} type="area" colorIndex={2} hidden={taxData.yearAmountData.length < 2}
          insight={generateInsight(taxData.yearAmountData, 'area', 'les montants de taxes')} />}
        {v('mortgages') && <ChartCard title={ct('mortgages', 'Hypothèques')} data={mortgageData.distribution} type="pie" colorIndex={4}
          insight={generateInsight(mortgageData.distribution, 'pie', 'les hypothèques')} />}
        {v('creditors') && <ChartCard title={ct('creditors', 'Créanciers')} data={mortgageData.byCreditorType} type="bar-h" colorIndex={8} labelWidth={80}
          insight={generateInsight(mortgageData.byCreditorType, 'bar-h', 'les créanciers')} />}
        {v('mortgage-status') && <ChartCard title={ct('mortgage-status', 'Statut hyp.')} data={mortgageData.byStatus} type="donut" colorIndex={3}
          insight={generateInsight(mortgageData.byStatus, 'donut', 'les statuts d\'hypothèque')} />}
        {v('mortgage-trend') && <ChartCard title={ct('mortgage-trend', 'Contrats hyp./an')} icon={TrendingUp} data={mortgageData.contractTrend} type="area" colorIndex={4} hidden={mortgageData.contractTrend.length < 2}
          insight={generateInsight(mortgageData.contractTrend, 'area', 'les contrats hypothécaires')} />}
        {v('evolution') && <ChartCard title={ct('evolution', 'Évolution')} icon={TrendingUp} data={trend} type="area" colorIndex={0} colSpan={2}
          insight={generateInsight(trend, 'area', 'les parcelles')} />}
      </div>
    </div>
    </FilterLabelContext.Provider>
  );
});
