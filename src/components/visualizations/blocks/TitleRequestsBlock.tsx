import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, CHART_COLORS } from '@/utils/analyticsHelpers';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { FileText, Users, MapPin, Building, TrendingUp } from 'lucide-react';

interface Props { data: LandAnalyticsData; }

const NoData = () => <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">Aucune donnée disponible</div>;

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

  // Urban location breakdown
  const urbanRecords = useMemo(() => filtered.filter(r => r.section_type === 'urbaine'), [filtered]);
  const ruralRecords = useMemo(() => filtered.filter(r => r.section_type === 'rurale'), [filtered]);
  const byVille = useMemo(() => countBy(urbanRecords, 'ville'), [urbanRecords]);
  const byCommune = useMemo(() => countBy(urbanRecords, 'commune'), [urbanRecords]);
  const byTerritoire = useMemo(() => countBy(ruralRecords, 'territoire'), [ruralRecords]);
  const byCollectivite = useMemo(() => countBy(ruralRecords, 'collectivite'), [ruralRecords]);

  // Section type distribution
  const bySectionType = useMemo(() => countBy(filtered, 'section_type'), [filtered]);

  // Gender for Personne physique - from owner_legal_status cross with requester_type
  const personnesPhysiques = useMemo(() => filtered.filter(r => r.requester_type === 'Personne physique'), [filtered]);
  const byOwnerLegalStatus = useMemo(() => countBy(filtered, 'owner_legal_status'), [filtered]);

  return (
    <div className="space-y-4">
      <AnalyticsFilters data={data.titleRequests} filter={filter} onChange={setFilter} />
      
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/20 border-indigo-200/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total demandes</p>
            <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Section urbaine</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{urbanRecords.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Section rurale</p>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{ruralRecords.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/20 border-rose-200/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pers. physiques</p>
            <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">{personnesPhysiques.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Type de demande */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-indigo-500" /> Type de demande</CardTitle></CardHeader>
          <CardContent>{byRequestType.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byRequestType} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" /><YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} name="Demandes" />
              </BarChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {/* Demandeur par statut juridique */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-cyan-500" /> Demandeur (statut juridique)</CardTitle></CardHeader>
          <CardContent>{byRequesterType.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={byRequesterType} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                  {byRequesterType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {/* Statut des demandes */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Statut des demandes</CardTitle></CardHeader>
          <CardContent>{byStatus.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis />
                <Tooltip />
                <Bar dataKey="value" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} name="Demandes" />
              </BarChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {/* Statut paiement */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Statut de paiement</CardTitle></CardHeader>
          <CardContent>{byPayment.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={byPayment} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {byPayment.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {/* Section urbaine vs rurale */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-500" /> Section urbaine vs rurale</CardTitle></CardHeader>
          <CardContent>{bySectionType.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={bySectionType} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {bySectionType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {/* Mise en valeur - Construction */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building className="h-4 w-4 text-amber-500" /> Mise en valeur (construction)</CardTitle></CardHeader>
          <CardContent>{byConstructionType.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byConstructionType} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" /><YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill={CHART_COLORS[3]} radius={[0, 4, 4, 0]} name="Parcelles" />
              </BarChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {/* Usage déclaré */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Usage déclaré</CardTitle></CardHeader>
          <CardContent>{byDeclaredUsage.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byDeclaredUsage} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" /><YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill={CHART_COLORS[5]} radius={[0, 4, 4, 0]} name="Parcelles" />
              </BarChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {/* Statut juridique propriétaire */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Statut juridique du propriétaire</CardTitle></CardHeader>
          <CardContent>{byOwnerLegalStatus.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={byOwnerLegalStatus} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                  {byOwnerLegalStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {/* Localisation section urbaine */}
        {byVille.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Localisation urbaine (par ville)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byVille.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} /><YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} name="Demandes" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {byCommune.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Localisation urbaine (par commune)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byCommune.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} /><YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill={CHART_COLORS[6]} radius={[4, 4, 0, 0]} name="Demandes" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Localisation rurale */}
        {byTerritoire.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Localisation rurale (par territoire)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byTerritoire.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} /><YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill={CHART_COLORS[7]} radius={[4, 4, 0, 0]} name="Demandes" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {byCollectivite.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Localisation rurale (par collectivité)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byCollectivite.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} /><YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill={CHART_COLORS[8]} radius={[4, 4, 0, 0]} name="Demandes" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Tendance temporelle */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-500" /> Évolution des demandes</CardTitle></CardHeader>
          <CardContent>{trend.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.15} name="Demandes" />
              </AreaChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>
      </div>
    </div>
  );
};
