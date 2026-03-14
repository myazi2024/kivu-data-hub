import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, CHART_COLORS } from '@/utils/analyticsHelpers';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { ShieldCheck, Scale } from 'lucide-react';

interface Props { data: LandAnalyticsData; }
const NoData = () => <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">Aucune donnée disponible</div>;

export const DisputeLiftingBlock: React.FC<Props> = ({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);

  // Filter disputes that have lifting requests
  const liftingDisputes = useMemo(() =>
    data.disputes.filter(d => d.lifting_status || d.lifting_request_reference),
    [data.disputes]
  );
  const filtered = useMemo(() => applyFilters(liftingDisputes, filter), [liftingDisputes, filter]);

  const byLiftingStatus = useMemo(() => countBy(filtered, 'lifting_status'), [filtered]);
  const byResolutionLevel = useMemo(() => countBy(filtered, 'resolution_level'), [filtered]);
  const byNature = useMemo(() => countBy(filtered, 'dispute_nature'), [filtered]);
  const byProvince = useMemo(() => countBy(filtered, 'province'), [filtered]);
  const byVille = useMemo(() => countBy(filtered, 'ville'), [filtered]);
  const byTerritoire = useMemo(() => countBy(filtered, 'territoire'), [filtered]);

  return (
    <div className="space-y-4">
      <AnalyticsFilters data={liftingDisputes} filter={filter} onChange={setFilter} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-sky-50 to-sky-100/50 dark:from-sky-950/30 dark:to-sky-900/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total demandes de levée</p>
            <p className="text-2xl font-bold text-sky-700 dark:text-sky-400">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Approuvées</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{filtered.filter(d => d.lifting_status === 'approved').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">En attente</p>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{filtered.filter(d => d.lifting_status === 'pending' || d.lifting_status === 'demande_levee').length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Statut de levée */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-sky-500" /> Statut des demandes de levée</CardTitle></CardHeader>
          <CardContent>{byLiftingStatus.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={byLiftingStatus} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {byLiftingStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie><Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {/* Niveau de résolution */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Scale className="h-4 w-4 text-purple-500" /> Niveau de résolution</CardTitle></CardHeader>
          <CardContent>{byResolutionLevel.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byResolutionLevel} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" /><YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10 }} />
                <Tooltip /><Bar dataKey="value" fill={CHART_COLORS[9]} radius={[0, 4, 4, 0]} name="Demandes" />
              </BarChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>

        {/* Nature du litige associé */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Nature du litige associé</CardTitle></CardHeader>
          <CardContent>{byNature.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byNature} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" /><YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10 }} />
                <Tooltip /><Bar dataKey="value" fill={CHART_COLORS[4]} radius={[0, 4, 4, 0]} name="Litiges" />
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
                  <Tooltip /><Bar dataKey="value" fill={CHART_COLORS[9]} radius={[4, 4, 0, 0]} name="Demandes" />
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
      </div>
    </div>
  );
};
