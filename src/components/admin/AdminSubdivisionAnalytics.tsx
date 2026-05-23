import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, Clock, CheckCircle2, XCircle, RotateCcw, Layers, MapPin, TrendingUp, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

/**
 * Trends / top zones still need row-level data — capped at 5000 (was 1000).
 * KPIs eux viennent désormais du RPC `get_subdivision_admin_stats` (sans plafond).
 */
interface Row {
  id: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  total_amount_usd: number | null;
  number_of_lots: number | null;
  parent_parcel_area_sqm: number | null;
  parent_parcel_location: string | null;
}

interface ServerStats {
  total: number; pending: number; in_review: number; approved: number;
  rejected: number; returned: number; awaiting_payment: number; completed: number;
  escalated: number; submission_paid: number; final_paid: number;
  revenue_usd: number; lots_total: number; last_7d: number; last_30d: number;
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n);
const pct = (a: number, b: number) => (b === 0 ? '0%' : `${Math.round((a / b) * 100)}%`);

const AdminSubdivisionAnalytics: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [serverStats, setServerStats] = useState<ServerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [statsRes, rowsRes] = await Promise.all([
        (supabase as any).rpc('get_subdivision_admin_stats'),
        supabase
          .from('subdivision_requests')
          .select('id,status,created_at,reviewed_at,total_amount_usd,number_of_lots,parent_parcel_area_sqm,parent_parcel_location')
          .order('created_at', { ascending: false })
          .limit(5000),
      ]);
      if (statsRes.error) console.error('stats RPC error:', statsRes.error);
      else setServerStats(statsRes.data as ServerStats);
      if (rowsRes.error) console.error('rows error:', rowsRes.error);
      else setRows((rowsRes.data as unknown as Row[]) || []);
      setLoading(false);
    })();
  }, []);

  const derived = useMemo(() => {
    const reviewed = rows.filter(r => r.reviewed_at);
    const avgDelayDays = reviewed.length === 0 ? 0 :
      reviewed.reduce((s, r) => {
        const d = (new Date(r.reviewed_at!).getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return s + d;
      }, 0) / reviewed.length;

    const totalSurface = rows.reduce((s, r) => s + (r.parent_parcel_area_sqm || 0), 0);

    const monthly: Record<string, number> = {};
    rows.forEach(r => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = (monthly[key] || 0) + 1;
    });
    const monthlyArr = Object.entries(monthly).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);

    const zoneCount: Record<string, { count: number; surface: number }> = {};
    rows.forEach(r => {
      const z = (r.parent_parcel_location && r.parent_parcel_location.trim()) || 'Inconnu';
      if (!zoneCount[z]) zoneCount[z] = { count: 0, surface: 0 };
      zoneCount[z].count += 1;
      zoneCount[z].surface += r.parent_parcel_area_sqm || 0;
    });
    const topZones = Object.entries(zoneCount).sort((a, b) => b[1].count - a[1].count).slice(0, 8);

    return { avgDelayDays, totalSurface, monthlyArr, topZones };
  }, [rows]);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const s = serverStats ?? {
    total: 0, pending: 0, in_review: 0, approved: 0, rejected: 0, returned: 0,
    awaiting_payment: 0, completed: 0, escalated: 0, submission_paid: 0, final_paid: 0,
    revenue_usd: 0, lots_total: 0, last_7d: 0, last_30d: 0,
  };
  const pendingTotal = s.pending + s.in_review + s.awaiting_payment;
  const maxMonthly = Math.max(1, ...derived.monthlyArr.map(([, v]) => v));
  const truncated = rows.length >= 5000;

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
            <KpiCard icon={<Layers className="h-4 w-4" />} label="Total demandes" value={fmt(s.total)} />
            <KpiCard icon={<CheckCircle2 className="h-4 w-4 text-primary" />} label="Approuvées" value={`${fmt(s.approved)} (${pct(s.approved, s.total)})`} />
            <KpiCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Payées (final)" value={`${fmt(s.final_paid)} (${pct(s.final_paid, s.total)})`} />
            <KpiCard icon={<XCircle className="h-4 w-4 text-destructive" />} label="Rejetées" value={`${fmt(s.rejected)} (${pct(s.rejected, s.total)})`} />
            <KpiCard icon={<RotateCcw className="h-4 w-4 text-muted-foreground" />} label="Renvoyées" value={`${fmt(s.returned)} (${pct(s.returned, s.total)})`} />
            <KpiCard icon={<Clock className="h-4 w-4" />} label="En attente" value={fmt(pendingTotal)} />
            <KpiCard icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} label="Escaladées" value={fmt(s.escalated)} />
            <KpiCard icon={<Clock className="h-4 w-4" />} label="Délai moyen" value={`${derived.avgDelayDays.toFixed(1)} j`} />
            <KpiCard icon={<Layers className="h-4 w-4" />} label="Lots cumulés" value={fmt(s.lots_total)} />
            <KpiCard icon={<MapPin className="h-4 w-4" />} label="Surface analysée" value={`${fmt(derived.totalSurface)} m²`} />
            <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Revenus encaissés" value={`$${fmt(s.revenue_usd)}`} />
            <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="7 j / 30 j" value={`${fmt(s.last_7d)} / ${fmt(s.last_30d)}`} />
          </div>
          {truncated && (
            <p className="mt-3 text-[11px] text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Tendances & zones limitées aux 5000 plus récentes. KPI globaux issus du serveur.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Volume mensuel (12 derniers mois)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-32">
            {derived.monthlyArr.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune donnée</p>
            ) : derived.monthlyArr.map(([key, val]) => (
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
          <CardTitle className="text-sm">Top localisations (par volume)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Localisation</TableHead>
                <TableHead className="text-right">Demandes</TableHead>
                <TableHead className="text-right">Surface (m²)</TableHead>
                <TableHead className="text-right">Part</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {derived.topZones.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Aucune donnée</TableCell></TableRow>
              ) : derived.topZones.map(([zone, v]) => (
                <TableRow key={zone}>
                  <TableCell className="font-medium">{zone}</TableCell>
                  <TableCell className="text-right font-mono">{v.count}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(v.surface)}</TableCell>
                  <TableCell className="text-right"><Badge variant="secondary">{pct(v.count, rows.length)}</Badge></TableCell>
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
