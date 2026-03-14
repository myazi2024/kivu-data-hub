import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { AnalyticsFilter, defaultFilter, applyFilters, countBy, trendByMonth, CHART_COLORS } from '@/utils/analyticsHelpers';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Scissors, TrendingUp } from 'lucide-react';

interface Props { data: LandAnalyticsData; }
const CH = 160;
const NoData = () => <div className="flex items-center justify-center h-[100px] text-muted-foreground text-[10px]">Aucune donnée</div>;

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
    <div className="space-y-2">
      <AnalyticsFilters data={data.subdivisionRequests} filter={filter} onChange={setFilter} />
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: 'Total', value: filtered.length, cls: 'text-teal-600' },
          { label: 'Lots prévus', value: totalLots, cls: 'text-blue-600' },
          { label: 'Approuvées', value: filtered.filter(r => r.status === 'approved').length, cls: 'text-emerald-600' },
        ].map((kpi, i) => (
          <Card key={i} className="border-border/30"><CardContent className="p-2">
            <p className="text-[9px] text-muted-foreground">{kpi.label}</p>
            <p className={`text-lg font-bold ${kpi.cls}`}>{kpi.value}</p>
          </CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-[10px] flex items-center gap-1"><Scissors className="h-3 w-3 text-primary" /> Statut</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{byStatus.length === 0 ? <NoData /> : (<ResponsiveContainer width="100%" height={CH}><PieChart><Pie data={byStatus} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{byStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip contentStyle={{ fontSize: 10 }} /></PieChart></ResponsiveContainer>)}</CardContent></Card>

        {byProvince.length > 0 && <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-[10px]">Par province</CardTitle></CardHeader><CardContent className="px-2 pb-2"><ResponsiveContainer width="100%" height={CH}><BarChart data={byProvince.slice(0, 8)} layout="vertical" margin={{ left: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[7]} radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>}

        {byVille.length > 0 && <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-[10px]">Urbaine</CardTitle></CardHeader><CardContent className="px-2 pb-2"><ResponsiveContainer width="100%" height={CH}><BarChart data={byVille.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={40} /><YAxis tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[1]} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>}

        {byTerritoire.length > 0 && <Card className="border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-[10px]">Rurale</CardTitle></CardHeader><CardContent className="px-2 pb-2"><ResponsiveContainer width="100%" height={CH}><BarChart data={byTerritoire.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={40} /><YAxis tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Bar dataKey="value" fill={CHART_COLORS[7]} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>}

        <Card className="col-span-2 border-border/30"><CardHeader className="pb-1 px-2 pt-2"><CardTitle className="text-[10px] flex items-center gap-1"><TrendingUp className="h-3 w-3 text-primary" /> Évolution</CardTitle></CardHeader>
          <CardContent className="px-2 pb-2">{trend.length === 0 ? <NoData /> : (<ResponsiveContainer width="100%" height={CH}><AreaChart data={trend}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 8 }} /><YAxis tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Area type="monotone" dataKey="value" stroke={CHART_COLORS[7]} fill={CHART_COLORS[7]} fillOpacity={0.15} /></AreaChart></ResponsiveContainer>)}</CardContent></Card>
      </div>
    </div>
  );
};
