import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, CHART_COLORS } from '@/utils/analyticsHelpers';
import { CHART_HEIGHT as CH, NoData } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { AlertTriangle, Scale, TrendingUp } from 'lucide-react';

interface Props { data: LandAnalyticsData; }

export const DisputesBlock: React.FC<Props> = ({ data }) => {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);
  const filtered = useMemo(() => applyFilters(data.disputes, filter), [data.disputes, filter]);
  const enCours = useMemo(() => filtered.filter(d => d.current_status !== 'resolved' && d.current_status !== 'closed'), [filtered]);
  const resolus = useMemo(() => filtered.filter(d => d.current_status === 'resolved' || d.current_status === 'closed'), [filtered]);
  const byNature = useMemo(() => countBy(filtered, 'dispute_nature'), [filtered]);
  const byType = useMemo(() => countBy(filtered, 'dispute_type'), [filtered]);
  const byStatus = useMemo(() => countBy(filtered, 'current_status'), [filtered]);
  const byResolutionLevel = useMemo(() => countBy(enCours, 'resolution_level'), [enCours]);
  const byProvince = useMemo(() => countBy(filtered, 'province'), [filtered]);
  const byVille = useMemo(() => countBy(filtered, 'ville'), [filtered]);
  const byCommune = useMemo(() => countBy(filtered, 'commune'), [filtered]);
  const byTerritoire = useMemo(() => countBy(filtered, 'territoire'), [filtered]);
  const byCollectivite = useMemo(() => countBy(filtered, 'collectivite'), [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);
  const natureStatusCross = useMemo(() => {
    const map = new Map<string, { enCours: number; resolu: number }>();
    filtered.forEach(d => {
      const n = d.dispute_nature || 'Non spécifié';
      if (!map.has(n)) map.set(n, { enCours: 0, resolu: 0 });
      const e = map.get(n)!;
      if (d.current_status === 'resolved' || d.current_status === 'closed') e.resolu++; else e.enCours++;
    });
    return Array.from(map.entries()).map(([name, d]) => ({ name, ...d })).sort((a, b) => (b.enCours + b.resolu) - (a.enCours + a.resolu));
  }, [filtered]);
  const resolutionStatus = useMemo(() => [{ name: 'En cours', value: enCours.length }, { name: 'Résolus', value: resolus.length }], [enCours, resolus]);

  return (
    <div className="space-y-2">
      <AnalyticsFilters data={data.disputes} filter={filter} onChange={setFilter} />
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: 'Total', value: filtered.length, cls: 'text-red-600' },
          { label: 'En cours', value: enCours.length, cls: 'text-amber-600' },
          { label: 'Résolus', value: resolus.length, cls: 'text-emerald-600' },
          { label: 'Natures', value: byNature.length, cls: 'text-purple-600' },
        ].map((kpi, i) => (
          <Card key={i} className="border-border/30"><CardContent className="p-2">
            <p className="text-[9px] text-muted-foreground">{kpi.label}</p>
            <p className={`text-lg font-bold ${kpi.cls}`}>{kpi.value}</p>
          </CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-red-500" /> Nature</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{byNature.length === 0 ? <NoData /> : (<ResponsiveContainer width="100%" height={CH}><BarChart data={byNature} layout="vertical" margin={{ left: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 8 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[4]} radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer>)}</CardContent></Card>

        <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">En cours vs Résolus</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2"><ResponsiveContainer width="100%" height={CH}><PieChart><Pie data={resolutionStatus} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, value }) => `${name}: ${value}`}><Cell fill={CHART_COLORS[3]} /><Cell fill={CHART_COLORS[2]} /></Pie><Tooltip contentStyle={{ fontSize: 10 }} /></PieChart></ResponsiveContainer></CardContent></Card>

        <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Statut détaillé</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{byStatus.length === 0 ? <NoData /> : (<ResponsiveContainer width="100%" height={CH}><BarChart data={byStatus}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-20} textAnchor="end" height={40} /><YAxis tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[8]} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>)}</CardContent></Card>

        <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Type litige</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{byType.length === 0 ? <NoData /> : (<ResponsiveContainer width="100%" height={CH}><PieChart><Pie data={byType} cx="50%" cy="50%" outerRadius={55} innerRadius={30} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>{byType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip contentStyle={{ fontSize: 10 }} /></PieChart></ResponsiveContainer>)}</CardContent></Card>

        <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold flex items-center gap-1"><Scale className="h-3 w-3 text-purple-500" /> Résolution (en cours)</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{byResolutionLevel.length === 0 ? <NoData /> : (<ResponsiveContainer width="100%" height={CH}><BarChart data={byResolutionLevel} layout="vertical" margin={{ left: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 8 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[5]} radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer>)}</CardContent></Card>

        <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Nature × Résolution</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{natureStatusCross.length === 0 ? <NoData /> : (<ResponsiveContainer width="100%" height={CH}><BarChart data={natureStatusCross.slice(0, 6)} layout="vertical" margin={{ left: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 8 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Legend wrapperStyle={{ fontSize: 9 }} /><Bar dataKey="enCours" fill={CHART_COLORS[3]} name="En cours" stackId="a" /><Bar dataKey="resolu" fill={CHART_COLORS[2]} name="Résolus" stackId="a" /></BarChart></ResponsiveContainer>)}</CardContent></Card>

        {byProvince.length > 0 && <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Par province</CardTitle></CardHeader><CardContent className="px-2 pb-2"><ResponsiveContainer width="100%" height={CH}><BarChart data={byProvince.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={40} /><YAxis tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[4]} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>}

        {byVille.length > 0 && <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Par ville</CardTitle></CardHeader><CardContent className="px-2 pb-2"><ResponsiveContainer width="100%" height={CH}><BarChart data={byVille.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={40} /><YAxis tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[1]} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>}

        {byCommune.length > 0 && <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Par commune</CardTitle></CardHeader><CardContent className="px-2 pb-2"><ResponsiveContainer width="100%" height={CH}><BarChart data={byCommune.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={40} /><YAxis tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[6]} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>}

        {byTerritoire.length > 0 && <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Par territoire</CardTitle></CardHeader><CardContent className="px-2 pb-2"><ResponsiveContainer width="100%" height={CH}><BarChart data={byTerritoire.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={40} /><YAxis tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[7]} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>}

        {byCollectivite.length > 0 && <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold">Par collectivité</CardTitle></CardHeader><CardContent className="px-2 pb-2"><ResponsiveContainer width="100%" height={CH}><BarChart data={byCollectivite.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={40} /><YAxis tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[8]} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>}

        <Card className="col-span-2 border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-xs font-semibold flex items-center gap-1"><TrendingUp className="h-3 w-3 text-primary" /> Évolution</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{trend.length === 0 ? <NoData /> : (<ResponsiveContainer width="100%" height={CH}><AreaChart data={trend}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 8 }} /><YAxis tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Area type="monotone" dataKey="value" stroke={CHART_COLORS[4]} fill={CHART_COLORS[4]} fillOpacity={0.15} /></AreaChart></ResponsiveContainer>)}</CardContent></Card>
      </div>
    </div>
  );
};
