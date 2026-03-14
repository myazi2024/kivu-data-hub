import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, CHART_COLORS } from '@/utils/analyticsHelpers';
import { CHART_HEIGHT as CH, NoData } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { FileText, Users, MapPin, Building, TrendingUp, DollarSign } from 'lucide-react';

interface Props { data: LandAnalyticsData; }

export const TitleRequestsBlock: React.FC<Props> = ({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.titleRequests, filter), [data.titleRequests, filter]);

  const byRequestType = useMemo(() => countBy(filtered, 'request_type'), [filtered]);
  const byRequesterType = useMemo(() => countBy(filtered, 'requester_type'), [filtered]);
  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const byPayment = useMemo(() => countBy(filtered, 'payment_status'), [filtered]);
  const byConstructionType = useMemo(() => countBy(filtered, 'construction_type'), [filtered]);
  const byDeclaredUsage = useMemo(() => countBy(filtered, 'declared_usage'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);
  const urbanRecords = useMemo(() => filtered.filter(r => r.section_type === 'urbaine'), [filtered]);
  const ruralRecords = useMemo(() => filtered.filter(r => r.section_type === 'rurale'), [filtered]);
  const byVille = useMemo(() => countBy(urbanRecords, 'ville'), [urbanRecords]);
  const byCommune = useMemo(() => countBy(urbanRecords, 'commune'), [urbanRecords]);
  const byQuartier = useMemo(() => countBy(urbanRecords, 'quartier'), [urbanRecords]);
  const byTerritoire = useMemo(() => countBy(ruralRecords, 'territoire'), [ruralRecords]);
  const byCollectivite = useMemo(() => countBy(ruralRecords, 'collectivite'), [ruralRecords]);
  const byGroupement = useMemo(() => countBy(ruralRecords, 'groupement'), [ruralRecords]);
  const bySectionType = useMemo(() => countBy(filtered, 'section_type'), [filtered]);
  const byOwnerLegalStatus = useMemo(() => countBy(filtered, 'owner_legal_status'), [filtered]);
  const totalRevenue = useMemo(() => filtered.reduce((s, r) => s + (r.total_amount_usd || 0), 0), [filtered]);
  const paidRevenue = useMemo(() => filtered.filter(r => r.payment_status === 'paid').reduce((s, r) => s + (r.total_amount_usd || 0), 0), [filtered]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.titleRequests} filter={filter} onChange={setFilter} />
      
      <div className="grid grid-cols-5 gap-1.5">
        {[
          { label: 'Total', value: filtered.length, cls: 'text-primary' },
          { label: 'Urbaine', value: urbanRecords.length, cls: 'text-emerald-600' },
          { label: 'Rurale', value: ruralRecords.length, cls: 'text-amber-600' },
          { label: 'Revenus', value: `$${paidRevenue.toLocaleString()}`, cls: 'text-blue-600' },
          { label: 'Total facturé', value: `$${totalRevenue.toLocaleString()}`, cls: 'text-rose-600' },
        ].map((kpi, i) => (
          <Card key={i} className="border-border/30">
            <CardContent className="p-2">
              <p className="text-[9px] text-muted-foreground truncate">{kpi.label}</p>
              <p className={`text-lg font-bold ${kpi.cls}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card className="border-border/30">
          <CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold flex items-center gap-1"><FileText className="h-3 w-3 text-primary" /> Type de demande</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{byRequestType.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={CH}>
              <BarChart data={byRequestType} layout="vertical" margin={{ left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[0]} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        <Card className="border-border/30">
          <CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold flex items-center gap-1"><Users className="h-3 w-3 text-primary" /> Demandeur</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{byRequesterType.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={CH}>
              <PieChart>
                <Pie data={byRequesterType} cx="50%" cy="50%" outerRadius={55} innerRadius={30} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {byRequesterType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie><Tooltip contentStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        <Card className="border-border/30">
          <CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Statut</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{byStatus.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={CH}>
              <BarChart data={byStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 8 }} /><YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[1]} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        <Card className="border-border/30">
          <CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold flex items-center gap-1"><DollarSign className="h-3 w-3 text-primary" /> Paiement</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{byPayment.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={CH}>
              <PieChart>
                <Pie data={byPayment} cx="50%" cy="50%" outerRadius={55} innerRadius={30} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {byPayment.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie><Tooltip contentStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        <Card className="border-border/30">
          <CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold flex items-center gap-1"><MapPin className="h-3 w-3 text-primary" /> Urbaine vs Rurale</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{bySectionType.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={CH}>
              <PieChart>
                <Pie data={bySectionType} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {bySectionType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie><Tooltip contentStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        <Card className="border-border/30">
          <CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold flex items-center gap-1"><Building className="h-3 w-3 text-primary" /> Construction</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{byConstructionType.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={CH}>
              <BarChart data={byConstructionType} layout="vertical" margin={{ left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[3]} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        <Card className="border-border/30">
          <CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Usage déclaré</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{byDeclaredUsage.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={CH}>
              <BarChart data={byDeclaredUsage} layout="vertical" margin={{ left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[5]} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        <Card className="border-border/30">
          <CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Statut juridique</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{byOwnerLegalStatus.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={CH}>
              <PieChart>
                <Pie data={byOwnerLegalStatus} cx="50%" cy="50%" outerRadius={55} innerRadius={30} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {byOwnerLegalStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie><Tooltip contentStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {byVille.length > 0 && (
          <Card className="border-border/30">
            <CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Par ville</CardTitle></CardHeader>
            <CardContent className="px-2 pb-2">
              <ResponsiveContainer width="100%" height={CH}>
                <BarChart data={byVille.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={40} /><YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[2]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {byCommune.length > 0 && (
          <Card className="border-border/30">
            <CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Par commune</CardTitle></CardHeader>
            <CardContent className="px-2 pb-2">
              <ResponsiveContainer width="100%" height={CH}>
                <BarChart data={byCommune.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={40} /><YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[6]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {byQuartier.length > 0 && (
          <Card className="border-border/30">
            <CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Par quartier</CardTitle></CardHeader>
            <CardContent className="px-2 pb-2">
              <ResponsiveContainer width="100%" height={CH}>
                <BarChart data={byQuartier.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={40} /><YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[10]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {byTerritoire.length > 0 && (
          <Card className="border-border/30">
            <CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Par territoire</CardTitle></CardHeader>
            <CardContent className="px-2 pb-2">
              <ResponsiveContainer width="100%" height={CH}>
                <BarChart data={byTerritoire.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={40} /><YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[7]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {byCollectivite.length > 0 && (
          <Card className="border-border/30">
            <CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Par collectivité</CardTitle></CardHeader>
            <CardContent className="px-2 pb-2">
              <ResponsiveContainer width="100%" height={CH}>
                <BarChart data={byCollectivite.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={40} /><YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[8]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {byGroupement.length > 0 && (
          <Card className="border-border/30">
            <CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Par groupement</CardTitle></CardHeader>
            <CardContent className="px-2 pb-2">
              <ResponsiveContainer width="100%" height={CH}>
                <BarChart data={byGroupement.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={40} /><YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[11]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card className="col-span-2 border-border/30">
          <CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold flex items-center gap-1"><TrendingUp className="h-3 w-3 text-primary" /> Évolution</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{trend.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={CH}>
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 8 }} /><YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 10 }} /><Area type="monotone" dataKey="value" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>
      </div>
    </div>
  );
};
