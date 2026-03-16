import React, { useState, useMemo, memo, useCallback } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, surfaceDistribution, yearDecadeDistribution, CHART_COLORS } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { FileText, Users, Building, Shield, Landmark, TrendingUp, Ruler, Home, Clock, CheckCircle } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, ColorMappedPieCard, StackedBarCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { exportRecordsToCSV } from '@/utils/csvExport';

interface Props { data: LandAnalyticsData; }

const GENDER_COLORS: Record<string, string> = {
  'Masculin': '#3b82f6', 'Féminin': '#ec4899', 'M': '#3b82f6', 'F': '#ec4899',
  'Autre': '#8b5cf6', '(Non renseigné)': '#9ca3af',
};

export const ParcelsWithTitleBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filteredParcels = useMemo(() => applyFilters(data.parcels, filter), [data.parcels, filter]);
  const filteredContribs = useMemo(() => applyFilters(data.contributions, filter), [data.contributions, filter]);
  const filteredPermits = useMemo(() => applyFilters(data.buildingPermits, filter), [data.buildingPermits, filter]);
  const filteredTaxes = useMemo(() => applyFilters(data.taxHistory, filter), [data.taxHistory, filter]);
  const filteredMortgages = useMemo(() => applyFilters(data.mortgages, filter), [data.mortgages, filter]);

  const charts = useMemo(() => ({
    byTitleType: countBy(filteredParcels, 'property_title_type'),
    byLegalStatus: countBy(filteredParcels, 'current_owner_legal_status'),
    byConstructionType: countBy(filteredParcels, 'construction_type'),
    byConstructionNature: countBy(filteredParcels, 'construction_nature'),
    byDeclaredUsage: countBy(filteredParcels, 'declared_usage'),
    byLeaseType: countBy(filteredParcels, 'lease_type'),
    byCirconscription: countBy(filteredParcels, 'circonscription_fonciere'),
    surfaceDist: surfaceDistribution(filteredParcels),
    byDecade: yearDecadeDistribution(filteredParcels, 'construction_year'),
  }), [filteredParcels]);

  // Gender from contributions (current_owners_details) AND from parcels (current_owner_legal_status based proxy not available — use contributions)
  const genderData = useMemo(() => {
    const map = new Map<string, number>();
    // Primary source: contributions with owner details
    filteredContribs.forEach(c => {
      if (c.current_owners_details && Array.isArray(c.current_owners_details)) {
        c.current_owners_details.forEach((o: any) => { if (o?.gender) map.set(o.gender, (map.get(o.gender) || 0) + 1); });
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredContribs]);

  // Building permits — administrative_status, validity, issuing_service
  const permitData = useMemo(() => {
    const parcelIdsWithPermit = new Set(filteredPermits.map(p => p.parcel_id));
    const w = filteredParcels.filter(p => parcelIdsWithPermit.has(p.id)).length;
    const distribution = [{ name: 'Avec', value: w }, { name: 'Sans', value: filteredParcels.length - w }];
    const byAdminStatus = countBy(filteredPermits, 'administrative_status');
    const byIssuingService = countBy(filteredPermits, 'issuing_service');
    // Validity analysis
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

  const urbanCount = useMemo(() => filteredParcels.filter(p => p.parcel_type === 'SU').length, [filteredParcels]);
  const ruralCount = useMemo(() => filteredParcels.filter(p => p.parcel_type === 'SR').length, [filteredParcels]);
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
    // Payment delay analysis
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
    // Contract date trend by year
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

  const handleExport = useCallback(() => {
    exportRecordsToCSV(filteredParcels, `parcelles-titrees-${new Date().toISOString().slice(0,10)}`, [
      'id', 'parcel_number', 'parcel_type', 'property_title_type', 'province', 'ville', 'commune',
      'current_owner_name', 'area_sqm', 'declared_usage', 'created_at'
    ]);
  }, [filteredParcels]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.parcels} filter={filter} onChange={setFilter} onExport={handleExport} hidePaymentStatus />
      <KpiGrid items={[
        { label: 'Parcelles', value: filteredParcels.length, cls: 'text-primary' },
        { label: 'Urbaines', value: urbanCount, cls: 'text-emerald-600', tooltip: pct(urbanCount, filteredParcels.length) },
        { label: 'Rurales', value: ruralCount, cls: 'text-amber-600', tooltip: pct(ruralCount, filteredParcels.length) },
        { label: 'Surface tot.', value: totalSurface > 0 ? `${(totalSurface / 10000).toFixed(1)} ha` : 'N/A', cls: 'text-violet-600', tooltip: `${totalSurface.toLocaleString()} m²` },
        { label: 'Taxes payées', value: `$${taxData.paidAmount.toLocaleString()}`, cls: 'text-blue-600', tooltip: `Impayées: $${taxData.pendingAmount.toLocaleString()}${taxData.avgPaymentDelay > 0 ? ` | Délai moy: ${taxData.avgPaymentDelay}j` : ''}` },
        { label: 'Hypothèques', value: `$${mortgageData.totalAmount.toLocaleString()}`, cls: 'text-rose-600', tooltip: `${mortgageData.count} contrats, durée moy. ${mortgageData.avgDuration} mois` },
      ]} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ChartCard title="Type titre" icon={FileText} data={charts.byTitleType} type="bar-h" colorIndex={0} labelWidth={110} />
        <ChartCard title="Propriétaires" icon={Users} data={charts.byLegalStatus} type="donut" colorIndex={1} />
        <ColorMappedPieCard title="Genre" icon={Users} iconColor="text-pink-500" data={genderData} colorMap={GENDER_COLORS} />
        <ChartCard title="Construction" icon={Building} data={charts.byConstructionType} type="bar-h" colorIndex={3} />
        <ChartCard title="Nature construction" data={charts.byConstructionNature} type="bar-h" colorIndex={7} />
        <ChartCard title="Année construction" icon={Clock} data={charts.byDecade} type="bar-v" colorIndex={0} hidden={charts.byDecade.length === 0} />
        <ChartCard title="Autorisation bâtir" icon={Shield} data={permitData.distribution} type="pie" colorIndex={2} />
        <ChartCard title="Statut autoris." icon={CheckCircle} data={permitData.byAdminStatus} type="bar-v" colorIndex={8} hidden={permitData.byAdminStatus.length === 0} />
        <ChartCard title="Validité autoris." data={permitData.validityDist} type="pie" colorIndex={2} hidden={permitData.validityDist.length === 0} />
        <ChartCard title="Service émetteur" data={permitData.byIssuingService} type="bar-h" colorIndex={6} labelWidth={100} hidden={permitData.byIssuingService.length === 0} />
        <ChartCard title="Usage déclaré" data={charts.byDeclaredUsage} type="bar-h" colorIndex={5} />
        <ChartCard title="Type bail" icon={Home} data={charts.byLeaseType} type="donut" colorIndex={9} hidden={charts.byLeaseType.length === 0} />
        <ChartCard title="Circonscription" data={charts.byCirconscription} type="bar-h" colorIndex={8} labelWidth={100} hidden={charts.byCirconscription.length === 0} />
        <ChartCard title="Superficie" icon={Ruler} data={charts.surfaceDist} type="bar-v" colorIndex={9} />
        <GeoCharts records={filteredParcels} />
        <ChartCard title="Taxes" icon={Landmark} data={taxData.byPayment} type="donut" colorIndex={0} />
        <StackedBarCard title="Taxes/année" data={taxData.yearData} bars={[
          { dataKey: 'paid', name: 'Payées', color: CHART_COLORS[2] },
          { dataKey: 'pending', name: 'Impayées', color: CHART_COLORS[4] },
        ]} hidden={taxData.yearData.length === 0} />
        <ChartCard title="Montants taxes/an" icon={TrendingUp} data={taxData.yearAmountData} type="area" colorIndex={2} hidden={taxData.yearAmountData.length < 2} />
        <ChartCard title="Hypothèques" data={mortgageData.distribution} type="pie" colorIndex={4} />
        <ChartCard title="Créanciers" data={mortgageData.byCreditorType} type="bar-h" colorIndex={8} labelWidth={80} />
        <ChartCard title="Statut hyp." data={mortgageData.byStatus} type="donut" colorIndex={3} />
        <ChartCard title="Contrats hyp./an" icon={TrendingUp} data={mortgageData.contractTrend} type="area" colorIndex={4} hidden={mortgageData.contractTrend.length < 2} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={0} colSpan={2} />
      </div>
    </div>
  );
});
