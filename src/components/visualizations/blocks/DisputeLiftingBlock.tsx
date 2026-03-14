import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, CHART_COLORS } from '@/utils/analyticsHelpers';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { ShieldCheck, Scale } from 'lucide-react';

interface Props { data: LandAnalyticsData; }
const CH = 160;
const NoData = () => <div className="flex items-center justify-center h-[100px] text-muted-foreground text-xs">Aucune donnée</div>;

export const DisputeLiftingBlock: React.FC<Props> = ({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const liftingDisputes = useMemo(() => data.disputes.filter(d => d.lifting_status || d.lifting_request_reference), [data.disputes]);
  const filtered = useMemo(() => applyFilters(liftingDisputes, filter), [liftingDisputes, filter]);
  const byLiftingStatus = useMemo(() => countBy(filtered, 'lifting_status'), [filtered]);
  const byResolutionLevel = useMemo(() => countBy(filtered, 'resolution_level'), [filtered]);
  const byNature = useMemo(() => countBy(filtered, 'dispute_nature'), [filtered]);
  const byProvince = useMemo(() => countBy(filtered, 'province'), [filtered]);
  const byVille = useMemo(() => countBy(filtered, 'ville'), [filtered]);
  const byTerritoire = useMemo(() => countBy(filtered, 'territoire'), [filtered]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={liftingDisputes} filter={filter} onChange={setFilter} />
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: 'Total levées', value: filtered.length, cls: 'text-sky-600' },
          { label: 'Approuvées', value: filtered.filter(d => d.lifting_status === 'approved').length, cls: 'text-emerald-600' },
          { label: 'En attente', value: filtered.filter(d => d.lifting_status === 'pending' || d.lifting_status === 'demande_levee').length, cls: 'text-amber-600' },
        ].map((kpi, i) => (
          <Card key={i} className="border-border/30"><CardContent className="p-2">
            <p className="text-[9px] text-muted-foreground">{kpi.label}</p>
            <p className={`text-lg font-bold ${kpi.cls}`}>{kpi.value}</p>
          </CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-primary" /> Statut levée</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{byLiftingStatus.length === 0 ? <NoData /> : (<ResponsiveContainer width="100%" height={CH}><PieChart><Pie data={byLiftingStatus} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{byLiftingStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip contentStyle={{ fontSize: 10 }} /></PieChart></ResponsiveContainer>)}</CardContent></Card>

        <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold flex items-center gap-1"><Scale className="h-3 w-3 text-purple-500" /> Niveau résolution</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{byResolutionLevel.length === 0 ? <NoData /> : (<ResponsiveContainer width="100%" height={CH}><BarChart data={byResolutionLevel} layout="vertical" margin={{ left: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 8 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[9]} radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer>)}</CardContent></Card>

        <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Nature litige</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{byNature.length === 0 ? <NoData /> : (<ResponsiveContainer width="100%" height={CH}><BarChart data={byNature} layout="vertical" margin={{ left: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 8 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[4]} radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer>)}</CardContent></Card>

        {byProvince.length > 0 && <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Par province</CardTitle></CardHeader><CardContent className="px-2 pb-2"><ResponsiveContainer width="100%" height={CH}><BarChart data={byProvince.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={40} /><YAxis tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[9]} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>}

        {byVille.length > 0 && <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Urbaine</CardTitle></CardHeader><CardContent className="px-2 pb-2"><ResponsiveContainer width="100%" height={CH}><BarChart data={byVille.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={40} /><YAxis tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[1]} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>}

        {byTerritoire.length > 0 && <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Rurale</CardTitle></CardHeader><CardContent className="px-2 pb-2"><ResponsiveContainer width="100%" height={CH}><BarChart data={byTerritoire.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={40} /><YAxis tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[7]} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>}
      </div>
    </div>
  );
};
