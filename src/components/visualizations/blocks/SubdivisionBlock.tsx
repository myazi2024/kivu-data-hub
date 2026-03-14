import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend } from 'recharts';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, CHART_COLORS } from '@/utils/analyticsHelpers';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Scissors, TrendingUp } from 'lucide-react';

interface Props { data: LandAnalyticsData; }
const NoData = () => <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">Aucune donnée disponible</div>;

export const SubdivisionBlock: React.FC<Props> = ({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.subdivisionRequests, filter), [data.subdivisionRequests, filter]);

  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const byProvince = useMemo(() => countBy(filtered, 'province'), [filtered]);
  const byVille = useMemo(() => countBy(filtered, 'ville'), [filtered]);
  const byTerritoire = useMemo(() => countBy(filtered, 'territoire'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);
  const totalLots = useMemo(() => filtered.reduce((s, r) => s + (r.number_of_lots || 0), 0), [filtered]);

  return (
    <div className="space-y-4">
      <AnalyticsFilters data={data.subdivisionRequests} filter={filter} onChange={setFilter} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-teal-50 to-teal-100/50 dark:from-teal-950/30 dark:to-teal-900/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total demandes</p>
            <p className="text-2xl font-bold text-teal-700 dark:text-teal-400">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total lots prévus</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{totalLots}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Approuvées</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{filtered.filter(r => r.status === 'approved').length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Scissors className="h-4 w-4 text-teal-500" /> Statut des demandes</CardTitle></CardHeader>
          <CardContent>{byStatus.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={byStatus} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {byStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie><Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {byProvince.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Par province</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byProvince.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" /><YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip /><Bar dataKey="value" fill={CHART_COLORS[7]} radius={[0, 4, 4, 0]} name="Demandes" />
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
                  <Tooltip /><Bar dataKey="value" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} name="Demandes" />
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
                  <Tooltip /><Bar dataKey="value" fill={CHART_COLORS[7]} radius={[4, 4, 0, 0]} name="Demandes" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card className="md:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-500" /> Évolution des demandes de lotissement</CardTitle></CardHeader>
          <CardContent>{trend.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis />
                <Tooltip /><Area type="monotone" dataKey="value" stroke={CHART_COLORS[7]} fill={CHART_COLORS[7]} fillOpacity={0.15} name="Demandes" />
              </AreaChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>
      </div>
    </div>
  );
};
