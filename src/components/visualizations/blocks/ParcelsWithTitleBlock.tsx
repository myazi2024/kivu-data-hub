import React, { useState, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, surfaceDistribution } from '@/utils/analyticsHelpers';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { FileText, Users, Building, Shield, Landmark, TrendingUp, DollarSign, Ruler } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, ColorMappedPieCard, StackedBarCard } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { CHART_COLORS } from '@/utils/analyticsHelpers';

interface Props { data: LandAnalyticsData; }

const GENDER_COLORS: Record<string, string> = {
  'Masculin': '#3b82f6',
  'Féminin': '#ec4899',
  'M': '#3b82f6',
  'F': '#ec4899',
  'Autre': '#8b5cf6',
  'Non spécifié': '#9ca3af',
};

export const ParcelsWithTitleBlock: React.FC<Props> = memo(({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filteredParcels = useMemo(() => applyFilters(data.parcels, filter), [data.parcels, filter]);
  const filteredContribs = useMemo(() => applyFilters(data.contributions, filter), [data.contributions, filter]);
  const filteredPermits = useMemo(() => applyFilters(data.buildingPermits, filter), [data.buildingPermits, filter]);
  const filteredTaxes = useMemo(() => applyFilters(data.taxHistory, filter), [data.taxHistory, filter]);
  const filteredMortgages = useMemo(() => applyFilters(data.mortgages, filter), [data.mortgages, filter]);

  const byTitleType = useMemo(() => countBy(filteredParcels, 'property_title_type'), [filteredParcels]);
  const byLegalStatus = useMemo(() => countBy(filteredParcels, 'current_owner_legal_status'), [filteredParcels]);
  const genderData = useMemo(() => {
    const map = new Map<string, number>();
    filteredContribs.forEach(c => {
      if (c.current_owners_details && Array.isArray(c.current_owners_details)) {
        c.current_owners_details.forEach((o: any) => { if (o?.gender) map.set(o.gender, (map.get(o.gender) || 0) + 1); });
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredContribs]);
  const byConstructionType = useMemo(() => countBy(filteredParcels, 'construction_type'), [filteredParcels]);
  const byConstructionNature = useMemo(() => countBy(filteredParcels, 'construction_nature'), [filteredParcels]);
  const byDeclaredUsage = useMemo(() => countBy(filteredParcels, 'declared_usage'), [filteredParcels]);
  const surfaceDist = useMemo(() => surfaceDistribution(filteredParcels), [filteredParcels]);
  const parcelIdsWithPermit = useMemo(() => new Set(filteredPermits.map(p => p.parcel_id)), [filteredPermits]);
  const permitDistribution = useMemo(() => {
    const w = filteredParcels.filter(p => parcelIdsWithPermit.has(p.id)).length;
    return [{ name: 'Avec', value: w }, { name: 'Sans', value: filteredParcels.length - w }];
  }, [filteredParcels, parcelIdsWithPermit]);
  const urbanParcels = useMemo(() => filteredParcels.filter(p => p.parcel_type === 'SU'), [filteredParcels]);
  const ruralParcels = useMemo(() => filteredParcels.filter(p => p.parcel_type === 'SR'), [filteredParcels]);
  const byTaxPayment = useMemo(() => countBy(filteredTaxes, 'payment_status'), [filteredTaxes]);
  const byTaxYear = useMemo(() => {
    const map = new Map<number, { paid: number; pending: number }>();
    filteredTaxes.forEach(t => {
      if (!map.has(t.tax_year)) map.set(t.tax_year, { paid: 0, pending: 0 });
      const e = map.get(t.tax_year)!;
      if (t.payment_status === 'paid') e.paid++; else e.pending++;
    });
    return Array.from(map.entries()).sort(([a], [b]) => a - b).map(([year, d]) => ({ name: String(year), paid: d.paid, pending: d.pending }));
  }, [filteredTaxes]);
  const taxRevenue = useMemo(() => {
    const paid = filteredTaxes.filter(t => t.payment_status === 'paid').reduce((s, t) => s + (t.amount_usd || 0), 0);
    const pending = filteredTaxes.filter(t => t.payment_status !== 'paid').reduce((s, t) => s + (t.amount_usd || 0), 0);
    return { paid, pending };
  }, [filteredTaxes]);
  const parcelIdsWithMortgage = useMemo(() => new Set(filteredMortgages.map(m => m.parcel_id)), [filteredMortgages]);
  const mortgageDistribution = useMemo(() => {
    const w = filteredParcels.filter(p => parcelIdsWithMortgage.has(p.id)).length;
    return [{ name: 'Avec hyp.', value: w }, { name: 'Sans hyp.', value: filteredParcels.length - w }];
  }, [filteredParcels, parcelIdsWithMortgage]);
  const avgMortgageDuration = useMemo(() => {
    if (filteredMortgages.length === 0) return 0;
    return Math.round(filteredMortgages.reduce((s, m) => s + (m.duration_months || 0), 0) / filteredMortgages.length);
  }, [filteredMortgages]);
  const totalMortgageAmount = useMemo(() => filteredMortgages.reduce((s, m) => s + (m.mortgage_amount_usd || 0), 0), [filteredMortgages]);
  const byCreditorType = useMemo(() => countBy(filteredMortgages, 'creditor_type'), [filteredMortgages]);
  const byMortgageStatus = useMemo(() => countBy(filteredMortgages, 'mortgage_status'), [filteredMortgages]);
  const trend = useMemo(() => trendByMonth(filteredParcels), [filteredParcels]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.parcels} filter={filter} onChange={setFilter} />
      <KpiGrid items={[
        { label: 'Parcelles', value: filteredParcels.length, cls: 'text-primary' },
        { label: 'Urbaines', value: urbanParcels.length, cls: 'text-emerald-600' },
        { label: 'Rurales', value: ruralParcels.length, cls: 'text-amber-600' },
        { label: 'Montant hyp.', value: `$${totalMortgageAmount.toLocaleString()}`, cls: 'text-rose-600' },
        { label: 'Taxes payées', value: `$${taxRevenue.paid.toLocaleString()}`, cls: 'text-blue-600' },
      ]} />
      <div className="grid grid-cols-2 gap-2">
        <ChartCard title="Type titre" icon={FileText} data={byTitleType} type="bar-h" colorIndex={0} labelWidth={110} />
        <ChartCard title="Propriétaires" icon={Users} data={byLegalStatus} type="donut" colorIndex={1} />
        <ColorMappedPieCard title="Genre" icon={Users} iconColor="text-pink-500" data={genderData} colorMap={GENDER_COLORS} />
        <ChartCard title="Construction" icon={Building} data={byConstructionType} type="bar-h" colorIndex={3} />
        <ChartCard title="Nature construction" data={byConstructionNature} type="bar-h" colorIndex={7} />
        <ChartCard title="Autorisation bâtir" icon={Shield} data={permitDistribution} type="pie" colorIndex={2} />
        <ChartCard title="Usage déclaré" data={byDeclaredUsage} type="bar-h" colorIndex={5} />
        <ChartCard title="Superficie" icon={Ruler} data={surfaceDist} type="bar-v" colorIndex={9} />
        <GeoCharts records={filteredParcels} />
        <ChartCard title="Taxes" icon={Landmark} data={byTaxPayment} type="donut" colorIndex={0} />
        <StackedBarCard title="Taxes/année" data={byTaxYear} bars={[
          { dataKey: 'paid', name: 'Payées', color: CHART_COLORS[2] },
          { dataKey: 'pending', name: 'Impayées', color: CHART_COLORS[4] },
        ]} hidden={byTaxYear.length === 0} />
        <ChartCard title="Hypothèques" data={mortgageDistribution} type="pie" colorIndex={4} />
        <Card className="border-border/30">
          <CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold flex items-center gap-1"><DollarSign className="h-3 w-3 text-primary" /> Montants hyp.</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-bold">${totalMortgageAmount.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Durée moy.</span><span className="font-bold">{avgMortgageDuration} mois</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Nombre</span><span className="font-bold">{filteredMortgages.length}</span></div>
            </div>
          </CardContent>
        </Card>
        <ChartCard title="Créanciers" data={byCreditorType} type="bar-h" colorIndex={8} labelWidth={80} />
        <ChartCard title="Statut hyp." data={byMortgageStatus} type="donut" colorIndex={3} />
        <ChartCard title="Évolution" icon={TrendingUp} data={trend} type="area" colorIndex={0} colSpan={2} />
      </div>
    </div>
  );
});
