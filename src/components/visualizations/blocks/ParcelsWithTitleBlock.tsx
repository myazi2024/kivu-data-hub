import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, CHART_COLORS } from '@/utils/analyticsHelpers';
import { CHART_HEIGHT as CH, NoData } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { FileText, Users, Building, Shield, Landmark, TrendingUp, DollarSign } from 'lucide-react';

interface Props { data: LandAnalyticsData; }

export const ParcelsWithTitleBlock: React.FC<Props> = ({ data }) => {
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
  const byDeclaredUsage = useMemo(() => countBy(filteredParcels, 'declared_usage'), [filteredParcels]);
  const parcelIdsWithPermit = useMemo(() => new Set(filteredPermits.map(p => p.parcel_id)), [filteredPermits]);
  const permitDistribution = useMemo(() => {
    const w = filteredParcels.filter(p => parcelIdsWithPermit.has(p.id)).length;
    return [{ name: 'Avec', value: w }, { name: 'Sans', value: filteredParcels.length - w }];
  }, [filteredParcels, parcelIdsWithPermit]);
  const urbanParcels = useMemo(() => filteredParcels.filter(p => p.parcel_type === 'SU'), [filteredParcels]);
  const ruralParcels = useMemo(() => filteredParcels.filter(p => p.parcel_type === 'SR'), [filteredParcels]);
  const byVille = useMemo(() => countBy(urbanParcels, 'ville'), [urbanParcels]);
  const byCommune = useMemo(() => countBy(urbanParcels, 'commune'), [urbanParcels]);
  const byTerritoire = useMemo(() => countBy(ruralParcels, 'territoire'), [ruralParcels]);
  const byCollectivite = useMemo(() => countBy(ruralParcels, 'collectivite'), [ruralParcels]);
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
      <div className="grid grid-cols-5 gap-1.5">
        {[
          { label: 'Parcelles', value: filteredParcels.length, cls: 'text-primary' },
          { label: 'Urbaines', value: urbanParcels.length, cls: 'text-emerald-600' },
          { label: 'Rurales', value: ruralParcels.length, cls: 'text-amber-600' },
          { label: 'Montant hyp.', value: `$${totalMortgageAmount.toLocaleString()}`, cls: 'text-rose-600' },
          { label: 'Taxes payées', value: `$${taxRevenue.paid.toLocaleString()}`, cls: 'text-blue-600' },
        ].map((kpi, i) => (
          <Card key={i} className="border-border/30"><CardContent className="p-2">
            <p className="text-[9px] text-muted-foreground truncate">{kpi.label}</p>
            <p className={`text-lg font-bold ${kpi.cls}`}>{kpi.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold flex items-center gap-1"><FileText className="h-3 w-3 text-primary" /> Type titre</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{byTitleType.length === 0 ? <NoData /> : (<ResponsiveContainer width="100%" height={CH}><BarChart data={byTitleType} layout="vertical" margin={{ left: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[0]} radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer>)}</CardContent></Card>

        <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold flex items-center gap-1"><Users className="h-3 w-3 text-primary" /> Propriétaires</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{byLegalStatus.length === 0 ? <NoData /> : (<ResponsiveContainer width="100%" height={CH}><PieChart><Pie data={byLegalStatus} cx="50%" cy="50%" outerRadius={55} innerRadius={30} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>{byLegalStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip contentStyle={{ fontSize: 10 }} /></PieChart></ResponsiveContainer>)}</CardContent></Card>

        <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold flex items-center gap-1"><Users className="h-3 w-3 text-pink-500" /> Genre</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{genderData.length === 0 ? <NoData /> : (<ResponsiveContainer width="100%" height={CH}><PieChart><Pie data={genderData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{genderData.map((_, i) => <Cell key={i} fill={i === 0 ? '#3b82f6' : '#ec4899'} />)}</Pie><Tooltip contentStyle={{ fontSize: 10 }} /></PieChart></ResponsiveContainer>)}</CardContent></Card>

        <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold flex items-center gap-1"><Building className="h-3 w-3 text-primary" /> Construction</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{byConstructionType.length === 0 ? <NoData /> : (<ResponsiveContainer width="100%" height={CH}><BarChart data={byConstructionType} layout="vertical" margin={{ left: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[3]} radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer>)}</CardContent></Card>

        <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold flex items-center gap-1"><Shield className="h-3 w-3 text-primary" /> Autorisation bâtir</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2"><ResponsiveContainer width="100%" height={CH}><PieChart><Pie data={permitDistribution} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, value }) => `${name}: ${value}`}><Cell fill={CHART_COLORS[2]} /><Cell fill={CHART_COLORS[4]} /></Pie><Tooltip contentStyle={{ fontSize: 10 }} /></PieChart></ResponsiveContainer></CardContent></Card>

        <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Usage déclaré</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{byDeclaredUsage.length === 0 ? <NoData /> : (<ResponsiveContainer width="100%" height={CH}><BarChart data={byDeclaredUsage} layout="vertical" margin={{ left: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[5]} radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer>)}</CardContent></Card>

        {byVille.length > 0 && <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Par ville</CardTitle></CardHeader><CardContent className="px-2 pb-2"><ResponsiveContainer width="100%" height={CH}><BarChart data={byVille.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={40} /><YAxis tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[2]} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>}

        {byCommune.length > 0 && <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Par commune</CardTitle></CardHeader><CardContent className="px-2 pb-2"><ResponsiveContainer width="100%" height={CH}><BarChart data={byCommune.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={40} /><YAxis tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[6]} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>}

        {byTerritoire.length > 0 && <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Par territoire</CardTitle></CardHeader><CardContent className="px-2 pb-2"><ResponsiveContainer width="100%" height={CH}><BarChart data={byTerritoire.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={40} /><YAxis tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[7]} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>}

        {byCollectivite.length > 0 && <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Par collectivité</CardTitle></CardHeader><CardContent className="px-2 pb-2"><ResponsiveContainer width="100%" height={CH}><BarChart data={byCollectivite.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={40} /><YAxis tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[8]} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>}

        <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold flex items-center gap-1"><Landmark className="h-3 w-3 text-primary" /> Taxes</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{byTaxPayment.length === 0 ? <NoData /> : (<ResponsiveContainer width="100%" height={CH}><PieChart><Pie data={byTaxPayment} cx="50%" cy="50%" outerRadius={55} innerRadius={30} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{byTaxPayment.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip contentStyle={{ fontSize: 10 }} /></PieChart></ResponsiveContainer>)}</CardContent></Card>

        {byTaxYear.length > 0 && <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Taxes/année</CardTitle></CardHeader><CardContent className="px-2 pb-2"><ResponsiveContainer width="100%" height={CH}><BarChart data={byTaxYear}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Legend wrapperStyle={{ fontSize: 9 }} /><Bar dataKey="paid" fill={CHART_COLORS[2]} name="Payées" stackId="a" /><Bar dataKey="pending" fill={CHART_COLORS[4]} name="Impayées" stackId="a" /></BarChart></ResponsiveContainer></CardContent></Card>}

        <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Hypothèques</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2"><ResponsiveContainer width="100%" height={CH}><PieChart><Pie data={mortgageDistribution} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, value }) => `${name}: ${value}`}><Cell fill={CHART_COLORS[4]} /><Cell fill={CHART_COLORS[2]} /></Pie><Tooltip contentStyle={{ fontSize: 10 }} /></PieChart></ResponsiveContainer></CardContent></Card>

        <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold flex items-center gap-1"><DollarSign className="h-3 w-3 text-primary" /> Montants hyp.</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-bold">${totalMortgageAmount.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Durée moy.</span><span className="font-bold">{avgMortgageDuration} mois</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Nombre</span><span className="font-bold">{filteredMortgages.length}</span></div>
            </div>
          </CardContent></Card>

        <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Créanciers</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{byCreditorType.length === 0 ? <NoData /> : (<ResponsiveContainer width="100%" height={CH}><BarChart data={byCreditorType} layout="vertical" margin={{ left: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[8]} radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer>)}</CardContent></Card>

        <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Statut hyp.</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{byMortgageStatus.length === 0 ? <NoData /> : (<ResponsiveContainer width="100%" height={CH}><PieChart><Pie data={byMortgageStatus} cx="50%" cy="50%" outerRadius={55} innerRadius={30} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{byMortgageStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip contentStyle={{ fontSize: 10 }} /></PieChart></ResponsiveContainer>)}</CardContent></Card>

        <Card className="col-span-2 border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold flex items-center gap-1"><TrendingUp className="h-3 w-3 text-primary" /> Évolution</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{trend.length === 0 ? <NoData /> : (<ResponsiveContainer width="100%" height={CH}><AreaChart data={trend}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 8 }} /><YAxis tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Area type="monotone" dataKey="value" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.15} /></AreaChart></ResponsiveContainer>)}</CardContent></Card>
      </div>
    </div>
  );
};
