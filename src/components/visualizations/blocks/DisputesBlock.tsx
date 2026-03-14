import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, CHART_COLORS } from '@/utils/analyticsHelpers';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { AlertTriangle, Scale, TrendingUp } from 'lucide-react';

interface Props { data: LandAnalyticsData; }
const NoData = () => <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">Aucune donnée disponible</div>;

export const DisputesBlock: React.FC<Props> = ({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.disputes, filter), [data.disputes, filter]);

  // Filter for "en cours" vs "pas en cours"
  const enCours = useMemo(() => filtered.filter(d => d.current_status !== 'resolved' && d.current_status !== 'closed'), [filtered]);
  const resolus = useMemo(() => filtered.filter(d => d.current_status === 'resolved' || d.current_status === 'closed'), [filtered]);

  const byNature = useMemo(() => countBy(filtered, 'dispute_nature'), [filtered]);
  const byType = useMemo(() => countBy(filtered, 'dispute_type'), [filtered]);
  const byStatus = useMemo(() => countBy(filtered, 'current_status'), [filtered]);
  const byResolutionLevel = useMemo(() => countBy(enCours, 'resolution_level'), [enCours]);
  const byProvince = useMemo(() => countBy(filtered, 'province'), [filtered]);
  const byVille = useMemo(() => countBy(filtered, 'ville'), [filtered]);
  const byTerritoire = useMemo(() => countBy(filtered, 'territoire'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  // Cross: nature vs status
  const natureStatusCross = useMemo(() => {
    const map = new Map<string, { enCours: number; resolu: number }>();
    filtered.forEach(d => {
      const nature = d.dispute_nature || 'Non spécifié';
      if (!map.has(nature)) map.set(nature, { enCours: 0, resolu: 0 });
      const e = map.get(nature)!;
      if (d.current_status === 'resolved' || d.current_status === 'closed') e.resolu++;
      else e.enCours++;
    });
    return Array.from(map.entries()).map(([name, d]) => ({ name, ...d })).sort((a, b) => (b.enCours + b.resolu) - (a.enCours + a.resolu));
  }, [filtered]);

  const resolutionStatus = useMemo(() => [
    { name: 'En cours', value: enCours.length },
    { name: 'Résolus/Fermés', value: resolus.length },
  ], [enCours, resolus]);

  return (
    <div className="space-y-4">
      <AnalyticsFilters data={data.disputes} filter={filter} onChange={setFilter} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total litiges</p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">En cours</p>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{enCours.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Résolus</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{resolus.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Natures distinctes</p>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{byNature.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nature du litige */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Nature du litige</CardTitle></CardHeader>
          <CardContent>{byNature.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byNature} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" /><YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
                <Tooltip /><Bar dataKey="value" fill={CHART_COLORS[4]} radius={[0, 4, 4, 0]} name="Litiges" />
              </BarChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {/* En cours vs résolus */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">En cours vs Résolus</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={resolutionStatus} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  <Cell fill={CHART_COLORS[3]} /><Cell fill={CHART_COLORS[2]} />
                </Pie><Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Statut détaillé */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Statut détaillé</CardTitle></CardHeader>
          <CardContent>{byStatus.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} /><YAxis />
                <Tooltip /><Bar dataKey="value" fill={CHART_COLORS[8]} radius={[4, 4, 0, 0]} name="Litiges" />
              </BarChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {/* Type de litige */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Type de litige</CardTitle></CardHeader>
          <CardContent>{byType.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={byType} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                  {byType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie><Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {/* Niveau de résolution (litiges en cours) */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Scale className="h-4 w-4 text-purple-500" /> Niveau de résolution (en cours)</CardTitle></CardHeader>
          <CardContent>{byResolutionLevel.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byResolutionLevel} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" /><YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10 }} />
                <Tooltip /><Bar dataKey="value" fill={CHART_COLORS[5]} radius={[0, 4, 4, 0]} name="Litiges" />
              </BarChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {/* Croisement Nature x Statut résolution */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Nature × Résolution</CardTitle></CardHeader>
          <CardContent>{natureStatusCross.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={natureStatusCross.slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" /><YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 9 }} />
                <Tooltip /><Legend />
                <Bar dataKey="enCours" fill={CHART_COLORS[3]} radius={[0, 4, 4, 0]} name="En cours" stackId="a" />
                <Bar dataKey="resolu" fill={CHART_COLORS[2]} radius={[0, 4, 4, 0]} name="Résolus" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {/* Localisation */}
        {byProvince.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Par province</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byProvince.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} /><YAxis />
                  <Tooltip /><Bar dataKey="value" fill={CHART_COLORS[4]} radius={[4, 4, 0, 0]} name="Litiges" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {byVille.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Localisation urbaine</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byVille.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} /><YAxis />
                  <Tooltip /><Bar dataKey="value" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} name="Litiges" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {byTerritoire.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Localisation rurale</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byTerritoire.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} /><YAxis />
                  <Tooltip /><Bar dataKey="value" fill={CHART_COLORS[7]} radius={[4, 4, 0, 0]} name="Litiges" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Tendance */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-500" /> Évolution des litiges</CardTitle></CardHeader>
          <CardContent>{trend.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis />
                <Tooltip /><Area type="monotone" dataKey="value" stroke={CHART_COLORS[4]} fill={CHART_COLORS[4]} fillOpacity={0.15} name="Litiges" />
              </AreaChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>
      </div>
    </div>
  );
};
