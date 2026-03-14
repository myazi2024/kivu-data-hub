import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, CHART_COLORS } from '@/utils/analyticsHelpers';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { FileText, Users, Building, Shield, Landmark, TrendingUp } from 'lucide-react';

interface Props { data: LandAnalyticsData; }
const NoData = () => <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">Aucune donnée disponible</div>;

export const ParcelsWithTitleBlock: React.FC<Props> = ({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);

  // Parcels = main source, enriched with contribution gender data
  const filteredParcels = useMemo(() => applyFilters(data.parcels, filter), [data.parcels, filter]);
  const filteredContribs = useMemo(() => applyFilters(data.contributions, filter), [data.contributions, filter]);
  const filteredPermits = useMemo(() => applyFilters(data.buildingPermits, filter), [data.buildingPermits, filter]);
  const filteredTaxes = useMemo(() => applyFilters(data.taxHistory, filter), [data.taxHistory, filter]);
  const filteredMortgages = useMemo(() => applyFilters(data.mortgages, filter), [data.mortgages, filter]);

  // Title type
  const byTitleType = useMemo(() => countBy(filteredParcels, 'property_title_type'), [filteredParcels]);

  // Owner legal status
  const byLegalStatus = useMemo(() => countBy(filteredParcels, 'current_owner_legal_status'), [filteredParcels]);

  // Gender from contributions' current_owners_details
  const genderData = useMemo(() => {
    const map = new Map<string, number>();
    filteredContribs.forEach(c => {
      if (c.current_owners_details && Array.isArray(c.current_owners_details)) {
        c.current_owners_details.forEach((o: any) => {
          if (o?.gender) map.set(o.gender, (map.get(o.gender) || 0) + 1);
        });
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredContribs]);

  // Construction
  const byConstructionType = useMemo(() => countBy(filteredParcels, 'construction_type'), [filteredParcels]);
  const byDeclaredUsage = useMemo(() => countBy(filteredParcels, 'declared_usage'), [filteredParcels]);

  // Building permits - parcels with vs without
  const parcelIdsWithPermit = useMemo(() => new Set(filteredPermits.map(p => p.parcel_id)), [filteredPermits]);
  const permitDistribution = useMemo(() => {
    const withPermit = filteredParcels.filter(p => parcelIdsWithPermit.has(p.id)).length;
    const without = filteredParcels.length - withPermit;
    return [{ name: 'Avec autorisation', value: withPermit }, { name: 'Sans autorisation', value: without }];
  }, [filteredParcels, parcelIdsWithPermit]);

  // Location
  const urbanParcels = useMemo(() => filteredParcels.filter(p => p.parcel_type === 'SU'), [filteredParcels]);
  const ruralParcels = useMemo(() => filteredParcels.filter(p => p.parcel_type === 'SR'), [filteredParcels]);
  const byVille = useMemo(() => countBy(urbanParcels, 'ville'), [urbanParcels]);
  const byTerritoire = useMemo(() => countBy(ruralParcels, 'territoire'), [ruralParcels]);

  // Taxes - payment status distribution
  const byTaxPayment = useMemo(() => countBy(filteredTaxes, 'payment_status'), [filteredTaxes]);
  const byTaxYear = useMemo(() => {
    const map = new Map<number, { paid: number; pending: number }>();
    filteredTaxes.forEach(t => {
      if (!map.has(t.tax_year)) map.set(t.tax_year, { paid: 0, pending: 0 });
      const e = map.get(t.tax_year)!;
      if (t.payment_status === 'paid') e.paid++; else e.pending++;
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, d]) => ({ name: String(year), paid: d.paid, pending: d.pending }));
  }, [filteredTaxes]);

  // Mortgages
  const parcelIdsWithMortgage = useMemo(() => new Set(filteredMortgages.map(m => m.parcel_id)), [filteredMortgages]);
  const mortgageDistribution = useMemo(() => {
    const with_ = filteredParcels.filter(p => parcelIdsWithMortgage.has(p.id)).length;
    return [{ name: 'Avec hypothèque', value: with_ }, { name: 'Sans hypothèque', value: filteredParcels.length - with_ }];
  }, [filteredParcels, parcelIdsWithMortgage]);

  const avgMortgageDuration = useMemo(() => {
    if (filteredMortgages.length === 0) return 0;
    return Math.round(filteredMortgages.reduce((s, m) => s + (m.duration_months || 0), 0) / filteredMortgages.length);
  }, [filteredMortgages]);

  const byCreditorType = useMemo(() => countBy(filteredMortgages, 'creditor_type'), [filteredMortgages]);
  const byMortgageStatus = useMemo(() => countBy(filteredMortgages, 'mortgage_status'), [filteredMortgages]);

  const trend = useMemo(() => trendByMonth(filteredParcels), [filteredParcels]);

  return (
    <div className="space-y-4">
      <AnalyticsFilters data={data.parcels} filter={filter} onChange={setFilter} />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total parcelles', value: filteredParcels.length, color: 'indigo' },
          { label: 'Urbaines (SU)', value: urbanParcels.length, color: 'emerald' },
          { label: 'Rurales (SR)', value: ruralParcels.length, color: 'amber' },
          { label: 'Avec hypothèque', value: parcelIdsWithMortgage.size, color: 'rose' },
          { label: 'Durée moy. hyp.', value: `${avgMortgageDuration} mois`, color: 'purple' },
        ].map((kpi, i) => (
          <Card key={i} className={`bg-gradient-to-br from-${kpi.color}-50 to-${kpi.color}-100/50 dark:from-${kpi.color}-950/30 dark:to-${kpi.color}-900/20`}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-xl font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Type de titre */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-indigo-500" /> Type de titre de propriété</CardTitle></CardHeader>
          <CardContent>{byTitleType.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byTitleType} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" /><YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                <Tooltip /><Bar dataKey="value" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} name="Parcelles" />
              </BarChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {/* Propriétaires statut juridique */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-cyan-500" /> Propriétaires (statut juridique)</CardTitle></CardHeader>
          <CardContent>{byLegalStatus.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={byLegalStatus} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                  {byLegalStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie><Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {/* Genre (Personne physique) */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-pink-500" /> Genre (Personne physique)</CardTitle></CardHeader>
          <CardContent>{genderData.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={genderData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {genderData.map((_, i) => <Cell key={i} fill={i === 0 ? '#3b82f6' : '#ec4899'} />)}
                </Pie><Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {/* Construction */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building className="h-4 w-4 text-amber-500" /> Type de construction</CardTitle></CardHeader>
          <CardContent>{byConstructionType.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byConstructionType} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" /><YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                <Tooltip /><Bar dataKey="value" fill={CHART_COLORS[3]} radius={[0, 4, 4, 0]} name="Parcelles" />
              </BarChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {/* Autorisation de bâtir */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-green-500" /> Autorisation de bâtir</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={permitDistribution} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  <Cell fill={CHART_COLORS[2]} /><Cell fill={CHART_COLORS[4]} />
                </Pie><Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Usage déclaré */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Usage déclaré des parcelles</CardTitle></CardHeader>
          <CardContent>{byDeclaredUsage.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byDeclaredUsage} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" /><YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                <Tooltip /><Bar dataKey="value" fill={CHART_COLORS[5]} radius={[0, 4, 4, 0]} name="Parcelles" />
              </BarChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {/* Localisation urbaine */}
        {byVille.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Parcelles urbaines par ville</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byVille.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} /><YAxis />
                  <Tooltip /><Bar dataKey="value" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} name="Parcelles" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Localisation rurale */}
        {byTerritoire.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Parcelles rurales par territoire</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byTerritoire.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} /><YAxis />
                  <Tooltip /><Bar dataKey="value" fill={CHART_COLORS[7]} radius={[4, 4, 0, 0]} name="Parcelles" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Taxes */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Landmark className="h-4 w-4 text-blue-500" /> Taxes foncières (statut paiement)</CardTitle></CardHeader>
          <CardContent>{byTaxPayment.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={byTaxPayment} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {byTaxPayment.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie><Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {/* Taxes par année */}
        {byTaxYear.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Taxes par année (payées vs impayées)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byTaxYear}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis />
                  <Tooltip /><Legend />
                  <Bar dataKey="paid" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} name="Payées" stackId="a" />
                  <Bar dataKey="pending" fill={CHART_COLORS[4]} radius={[4, 4, 0, 0]} name="Impayées" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Hypothèques - avec/sans */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Parcelles avec/sans hypothèque</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={mortgageDistribution} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  <Cell fill={CHART_COLORS[4]} /><Cell fill={CHART_COLORS[2]} />
                </Pie><Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Type de créancier */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Type de créancier hypothécaire</CardTitle></CardHeader>
          <CardContent>{byCreditorType.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byCreditorType} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" /><YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip /><Bar dataKey="value" fill={CHART_COLORS[8]} radius={[0, 4, 4, 0]} name="Hypothèques" />
              </BarChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {/* Statut hypothèque */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Statut des hypothèques</CardTitle></CardHeader>
          <CardContent>{byMortgageStatus.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={byMortgageStatus} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {byMortgageStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie><Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {/* Tendance */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-500" /> Évolution des enregistrements</CardTitle></CardHeader>
          <CardContent>{trend.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis />
                <Tooltip /><Area type="monotone" dataKey="value" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.15} name="Parcelles" />
              </AreaChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>
      </div>
    </div>
  );
};
