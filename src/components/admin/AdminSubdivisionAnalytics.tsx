import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, Clock, CheckCircle2, XCircle, RotateCcw, Layers, MapPin, TrendingUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Row {
  id: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  total_amount_usd: number | null;
  number_of_lots: number | null;
  parent_parcel_area_sqm: number | null;
  province: string | null;
  ville: string | null;
  commune: string | null;
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n);
const pct = (a: number, b: number) => (b === 0 ? '0%' : `${Math.round((a / b) * 100)}%`);

const AdminSubdivisionAnalytics: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('subdivision_requests')
        .select('id,status,created_at,reviewed_at,total_amount_usd,number_of_lots,parent_parcel_area_sqm,province,ville,commune')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) {
        console.error(error);
      } else {
        setRows((data as unknown as Row[]) || []);
      }
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const approved = rows.filter(r => r.status === 'approved' || r.status === 'completed').length;
    const rejected = rows.filter(r => r.status === 'rejected').length;
    const returned = rows.filter(r => r.status === 'returned').length;
    const pending = rows.filter(r => ['pending', 'in_review', 'awaiting_payment'].includes(r.status)).length;

    const totalLots = rows.reduce((s, r) => s + (r.number_of_lots || 0), 0);
    const totalSurface = rows.reduce((s, r) => s + (r.parent_parcel_area_sqm || 0), 0);
    const totalRevenue = rows
      .filter(r => r.status === 'approved' || r.status === 'completed')
      .reduce((s, r) => s + (r.total_amount_usd || 0), 0);

    const reviewed = rows.filter(r => r.reviewed_at);
    const avgDelayDays = reviewed.length === 0 ? 0 :
      reviewed.reduce((s, r) => {
        const d = (new Date(r.reviewed_at!).getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return s + d;
      }, 0) / reviewed.length;

    // Monthly volume (last 12 months)
    const monthly: Record<string, number> = {};
    rows.forEach(r => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = (monthly[key] || 0) + 1;
    });
    const monthlyArr = Object.entries(monthly)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12);

    // Top zones
    const zoneCount: Record<string, { count: number; surface: number }> = {};
    rows.forEach(r => {
      const z = r.commune || r.ville || r.province || 'Inconnu';
      if (!zoneCount[z]) zoneCount[z] = { count: 0, surface: 0 };
      zoneCount[z].count += 1;
      zoneCount[z].surface += r.parent_parcel_area_sqm || 0;
    });
    const topZones = Object.entries(zoneCount)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8);

    return { total, approved, rejected, returned, pending, totalLots, totalSurface, totalRevenue, avgDelayDays, monthlyArr, topZones };
  }, [rows]);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const maxMonthly = Math.max(1, ...stats.monthlyArr.map(([, v]) => v));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Analytics — Lotissement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard icon={<Layers className="h-4 w-4" />} label="Total demandes" value={fmt(stats.total)} />
            <KpiCard icon={<CheckCircle2 className="h-4 w-4 text-primary" />} label="Approuvées" value={`${fmt(stats.approved)} (${pct(stats.approved, stats.total)})`} />
            <KpiCard icon={<XCircle className="h-4 w-4 text-destructive" />} label="Rejetées" value={`${fmt(stats.rejected)} (${pct(stats.rejected, stats.total)})`} />
            <KpiCard icon={<RotateCcw className="h-4 w-4 text-muted-foreground" />} label="Renvoyées" value={`${fmt(stats.returned)} (${pct(stats.returned, stats.total)})`} />
            <KpiCard icon={<Clock className="h-4 w-4" />} label="En attente" value={fmt(stats.pending)} />
            <KpiCard icon={<Clock className="h-4 w-4" />} label="Délai moyen" value={`${stats.avgDelayDays.toFixed(1)} j`} />
            <KpiCard icon={<MapPin className="h-4 w-4" />} label="Surface lotie" value={`${fmt(stats.totalSurface)} m²`} />
            <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Revenus approuvés" value={`$${fmt(stats.totalRevenue)}`} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Volume mensuel (12 derniers mois)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-32">
            {stats.monthlyArr.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune donnée</p>
            ) : stats.monthlyArr.map(([key, val]) => (
              <div key={key} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary/70 rounded-t transition-all"
                  style={{ height: `${(val / maxMonthly) * 100}%`, minHeight: val > 0 ? '4px' : '0' }}
                  title={`${key}: ${val}`}
                />
                <span className="text-[10px] text-muted-foreground rotate-45 origin-left whitespace-nowrap">{key.slice(2)}</span>
                <span className="text-[10px] font-semibold">{val}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Top zones (par volume)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone</TableHead>
                <TableHead className="text-right">Demandes</TableHead>
                <TableHead className="text-right">Surface (m²)</TableHead>
                <TableHead className="text-right">Part</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.topZones.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Aucune donnée</TableCell></TableRow>
              ) : stats.topZones.map(([zone, v]) => (
                <TableRow key={zone}>
                  <TableCell className="font-medium">{zone}</TableCell>
                  <TableCell className="text-right font-mono">{v.count}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(v.surface)}</TableCell>
                  <TableCell className="text-right"><Badge variant="secondary">{pct(v.count, stats.total)}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const KpiCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="rounded-md border bg-card p-3">
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">{icon}{label}</div>
    <div className="text-lg font-bold">{value}</div>
  </div>
);

export default AdminSubdivisionAnalytics;
