import React, { useState, useMemo, memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, surfaceDistribution, CHART_COLORS } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { FileText, Users, Building, Shield, Landmark, TrendingUp, DollarSign, Ruler, Home } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, ColorMappedPieCard, StackedBarCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { exportRecordsToCSV } from '@/utils/csvExport';

interface Props { data: LandAnalyticsData; }

const GENDER_COLORS: Record<string, string> = {
  'Masculin': '#3b82f6', 'Féminin': '#ec4899', 'M': '#3b82f6', 'F': '#ec4899',
  'Autre': '#8b5cf6', 'Non spécifié': '#9ca3af',
};

export const ParcelsWithTitleBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filteredParcels = useMemo(() => applyFilters(data.parcels, filter), [data.parcels, filter]);
  const filteredContribs = useMemo(() => applyFilters(data.contributions, filter), [data.contributions, filter]);
  const filteredPermits = useMemo(() => applyFilters(data.buildingPermits, filter), [data.buildingPermits, filter]);
  const filteredTaxes = useMemo(() => applyFilters(data.taxHistory, filter), [data.taxHistory, filter]);
  const filteredMortgages = useMemo(() => applyFilters(data.mortgages, filter), [data.mortgages, filter]);

  // Grouped countBy computations
  const charts = useMemo(() => ({
    byTitleType: countBy(filteredParcels, 'property_title_type'),
    byLegalStatus: countBy(filteredParcels, 'current_owner_legal_status'),
    byConstructionType: countBy(filteredParcels, 'construction_type'),
    byConstructionNature: countBy(filteredParcels, 'construction_nature'),
    byDeclaredUsage: countBy(filteredParcels, 'declared_usage'),
    byLeaseType: countBy(filteredParcels, 'lease_type'),
    surfaceDist: surfaceDistribution(filteredParcels),
  }), [filteredParcels]);

  const genderData = useMemo(() => {
    const map = new Map<string, number>();
    filteredContribs.forEach(c => {
      if (c.current_owners_details && Array.isArray(c.current_owners_details)) {
        c.current_owners_details.forEach((o: any) => { if (o?.gender) map.set(o.gender, (map.get(o.gender) || 0) + 1); });
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredContribs]);

  const permitDistribution = useMemo(() => {
    const parcelIdsWithPermit = new Set(filteredPermits.map(p => p.parcel_id));
    const w = filteredParcels.filter(p => parcelIdsWithPermit.has(p.id)).length;
    return [{ name: 'Avec', value: w }, { name: 'Sans', value: filteredParcels.length - w }];
  }, [filteredParcels, filteredPermits]);

  const urbanCount = useMemo(() => filteredParcels.filter(p => p.parcel_type === 'SU').length, [filteredParcels]);
  const ruralCount = useMemo(() => filteredParcels.filter(p => p.parcel_type === 'SR').length, [filteredParcels]);

  // Tax computations
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
    return { byPayment, yearData, paidAmount, pendingAmount };
  }, [filteredTaxes]);

  // Mortgage computations
  const mortgageData = useMemo(() => {
    const parcelIdsWithMortgage = new Set(filteredMortgages.map(m => m.parcel_id));
    const w = filteredParcels.filter(p => parcelIdsWithMortgage.has(p.id)).length;
    const distribution = [{ name: 'Avec hyp.', value: w }, { name: 'Sans hyp.', value: filteredParcels.length - w }];
    const totalAmount = filteredMortgages.reduce((s, m) => s + (m.mortgage_amount_usd || 0), 0);
    const avgDuration = filteredMortgages.length > 0 ? Math.round(filteredMortgages.reduce((s, m) => s + (m.duration_months || 0), 0) / filteredMortgages.length) : 0;
    const byCreditorType = countBy(filteredMortgages, 'creditor_type');
    const byStatus = countBy(filteredMortgages, 'mortgage_status');
    return { distribution, totalAmount, avgDuration, byCreditorType, byStatus, count: filteredMortgages.length };
  }, [filteredParcels, filteredMortgages]);

  const trend = useMemo(() => trendByMonth(filteredParcels), [filteredParcels]);

  const handleExport = useCallback(() => {
    exportRecordsToCSV(filteredParcels, `parcelles-titrees-${new Date().toISOString().slice(0,10)}`, [
      'id', 'parcel_number', 'parcel_type', 'property_title_type', 'province', 'ville', 'commune',
      'current_owner_name', 'area_sqm', 'declared_usage', 'created_at'
    ]);
  }, [filteredParcels]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.parcels} filter={filter} onChange={setFilter} onExport={handleExport} />
      <KpiGrid items={[
        { label: 'Parcelles', value: filteredParcels.length, cls: 'text-primary' },
        { label: 'Urbaines', value: urbanCount, cls: 'text-emerald-600', tooltip: pct(urbanCount, filteredParcels.length) },
        { label: 'Rurales', value: ruralCount, cls: 'text-amber-600', tooltip: pct(ruralCount, filteredParcels.length) },
        { label: 'Taxes payées', value: `$${taxData.paidAmount.toLocaleString()}`, cls: 'text-blue-600', tooltip: `Impayées: $${taxData.pendingAmount.toLocaleString()}` },
        { label: 'Hypothèques', value: `$${mortgageData.totalAmount.toLocaleString()}`, cls: 'text-rose-600', tooltip: `${mortgageData.count} contrats, durée moy. ${mortgageData.avgDuration} mois` },
      ]} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ChartCard title="Type titre" icon={FileText} data={charts.byTitleType} type="bar-h" colorIndex={0} labelWidth={110} />
        <ChartCard title="Propriétaires" icon={Users} data={charts.byLegalStatus} type="donut" colorIndex={1} />
        <ColorMappedPieCard title="Genre" icon={Users} iconColor="text-pink-500" data={genderData} colorMap={GENDER_COLORS} />
        <ChartCard title="Construction" icon={Building} data={charts.byConstructionType} type="bar-h" colorIndex={3} />
        <ChartCard title="Nature construction" data={charts.byConstructionNature} type="bar-h" colorIndex={7} />
        <ChartCard title="Autorisation bâtir" icon={Shield} data={permitDistribution} type="pie" colorIndex={2} />
        <ChartCard title="Usage déclaré" data={charts.byDeclaredUsage} type="bar-h" colorIndex={5} />
        <ChartCard title="Type bail" icon={Home} data={charts.byLeaseType} type="donut" colorIndex={9} hidden={charts.byLeaseType.length === 0} />
        <ChartCard title="Superficie" icon={Ruler} data={charts.surfaceDist} type="bar-v" colorIndex={9} />
        <GeoCharts records={filteredParcels} />
        <ChartCard title="Taxes" icon={Landmark} data={taxData.byPayment} type="donut" colorIndex={0} />
        <StackedBarCard title="Taxes/année" data={taxData.yearData} bars={[
          { dataKey: 'paid', name: 'Payées', color: CHART_COLORS[2] },
          { dataKey: 'pending', name: 'Impayées', color: CHART_COLORS[4] },
        ]} hidden={taxData.yearData.length === 0} />
        <ChartCard title="Hypothèques" data={mortgageData.distribution} type="pie" colorIndex={4} />
        <ChartCard title="Créanciers" data={mortgageData.byCreditorType} type="bar-h" colorIndex={8} labelWidth={80} />
        <ChartCard title="Statut hyp." data={mortgageData.byStatus} type="donut" colorIndex={3} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={0} colSpan={2} />
      </div>
    </div>
  );
});
