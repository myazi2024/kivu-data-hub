import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { untypedRpc } from '@/integrations/supabase/untyped';
import { Activity, Database, Server, RefreshCw, CheckCircle, AlertTriangle, XCircle, Save, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useSystemHealthSnapshots } from '@/hooks/useSystemHealthSnapshots';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';

interface ServiceStatus {
  name: string;
  status: 'online' | 'degraded' | 'offline';
  latency?: number;
  lastCheck: Date;
}

const AdminSystemHealth = () => {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbStats, setDbStats] = useState({ totalTables: 0, totalRecords: 0 });
  const { settings } = useSystemSettings();
  const { snapshots, refetch: refetchSnaps, insertSnapshot } = useSystemHealthSnapshots(24);

  const dbThreshold = Number(settings.health_db_threshold_ms) || 500;
  const edgeThreshold = Number(settings.health_edge_threshold_ms) || 1000;
  const thresholds = {
    db: dbThreshold,
    auth: 300,
    storage: 500,
    edge: edgeThreshold,
    ...(settings.latency_thresholds || {}),
  };

  const checkSystemHealth = async () => {
    setLoading(true);
    try {
      const startTime = Date.now();
      const { error: dbError } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
      const dbLatency = Date.now() - startTime;

      const authStart = Date.now();
      const { error: authError } = await supabase.auth.getSession();
      const authLatency = Date.now() - authStart;

      // Dynamic table list via RPC
      let totalTables = 0;
      let totalRecords = 0;
      try {
        const { data: tablesData, error: rpcErr } = await untypedRpc.list_public_tables_with_count();
        if (!rpcErr && tablesData) {
          const list = tablesData as Array<{ row_count?: number | string }>;
          totalTables = list.length;
          totalRecords = list.reduce((s, t) => s + Number(t.row_count || 0), 0);
        }
      } catch { /* fallback */ }
      setDbStats({ totalTables, totalRecords });

      const storageStart = Date.now();
      const { error: storageError } = await supabase.storage.getBucket('avatars');
      const storageLatency = Date.now() - storageStart;

      const edgeFnStart = Date.now();
      let edgeFnStatus: 'online' | 'degraded' | 'offline' = 'offline';
      let edgeFnLatency: number | undefined;
      try {
        const { data: healthData, error: fnError } = await supabase.functions.invoke('health-check');
        edgeFnLatency = Date.now() - edgeFnStart;
        if (fnError) edgeFnStatus = 'degraded';
        else if (healthData?.ok === false) edgeFnStatus = 'degraded';
        else edgeFnStatus = edgeFnLatency > thresholds.edge ? 'degraded' : 'online';
      } catch {
        edgeFnLatency = Date.now() - edgeFnStart;
        edgeFnStatus = 'offline';
      }

      const newServices: ServiceStatus[] = [
        { name: 'Base de données', status: dbError ? 'offline' : dbLatency > thresholds.db ? 'degraded' : 'online', latency: dbLatency, lastCheck: new Date() },
        { name: 'Authentification', status: authError ? 'offline' : authLatency > thresholds.auth ? 'degraded' : 'online', latency: authLatency, lastCheck: new Date() },
        { name: 'API REST', status: dbError ? 'offline' : 'online', latency: dbLatency, lastCheck: new Date() },
        { name: 'Stockage', status: storageError ? 'degraded' : storageLatency > thresholds.storage ? 'degraded' : 'online', latency: storageLatency, lastCheck: new Date() },
        { name: 'Edge Functions', status: edgeFnStatus, latency: edgeFnLatency, lastCheck: new Date() },
      ];
      setServices(newServices);

      // Save snapshot
      await insertSnapshot({
        db_latency_ms: dbLatency,
        auth_latency_ms: authLatency,
        storage_latency_ms: storageLatency,
        edge_fn_latency_ms: edgeFnLatency || null,
        edge_fn_status: edgeFnStatus,
        total_records: totalRecords,
        total_tables: totalTables,
      });
      await refetchSnaps();

      toast.success('Vérification terminée');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de la vérification');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { checkSystemHealth(); /* eslint-disable-next-line */ }, []);

  const getStatusIcon = (status: string) =>
    status === 'online' ? <CheckCircle className="h-4 w-4 text-green-500" /> :
    status === 'degraded' ? <AlertTriangle className="h-4 w-4 text-yellow-500" /> :
    <XCircle className="h-4 w-4 text-red-500" />;

  const getStatusBadge = (status: string) =>
    status === 'online' ? <Badge className="bg-green-500/10 text-green-600 text-[10px]">En ligne</Badge> :
    status === 'degraded' ? <Badge className="bg-yellow-500/10 text-yellow-600 text-[10px]">Dégradé</Badge> :
    <Badge variant="destructive" className="text-[10px]">Hors ligne</Badge>;

  const overallStatus = services.every(s => s.status === 'online') ? 'online' :
    services.some(s => s.status === 'offline') ? 'offline' : 'degraded';

  const chartData = snapshots.map(s => ({
    time: format(new Date(s.captured_at), 'HH:mm'),
    db: s.db_latency_ms || 0,
    auth: s.auth_latency_ms || 0,
    storage: s.storage_latency_ms || 0,
    edge: s.edge_fn_latency_ms || 0,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Santé du Système</h2>
          <p className="text-xs text-muted-foreground">Surveillance temps réel + historique 24h</p>
        </div>
        <Button onClick={checkSystemHealth} disabled={loading} size="sm" className="text-xs">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Overall */}
      <Card className="rounded-2xl shadow-sm border-0 bg-card/80">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${overallStatus === 'online' ? 'bg-green-500/10' : overallStatus === 'degraded' ? 'bg-yellow-500/10' : 'bg-red-500/10'}`}>
                <Activity className={`h-5 w-5 ${overallStatus === 'online' ? 'text-green-500' : overallStatus === 'degraded' ? 'text-yellow-500' : 'text-red-500'}`} />
              </div>
              <div>
                <p className="text-sm font-medium">État Global</p>
                <p className="text-xs text-muted-foreground">{services.filter(s => s.status === 'online').length}/{services.length} services en ligne</p>
              </div>
            </div>
            {getStatusBadge(overallStatus)}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="rounded-xl shadow-sm border-0 bg-card/80">
          <CardContent className="p-3 text-center">
            <Database className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{dbStats.totalTables}</p>
            <p className="text-[10px] text-muted-foreground">Tables (dynamique)</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm border-0 bg-card/80">
          <CardContent className="p-3 text-center">
            <Server className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{dbStats.totalRecords.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Enregistrements</p>
          </CardContent>
        </Card>
      </div>

      {/* Services */}
      <Card className="rounded-2xl shadow-sm border-0 bg-card/80">
        <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-semibold">Services</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-2">
            {services.map((service, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-muted/30">
                <div className="flex items-center gap-2">
                  {getStatusIcon(service.status)}
                  <div>
                    <p className="text-xs font-medium">{service.name}</p>
                    <p className="text-[10px] text-muted-foreground">{service.latency !== undefined ? `${service.latency}ms` : '-'}</p>
                  </div>
                </div>
                {getStatusBadge(service.status)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Latency chart */}
      {chartData.length > 1 && (
        <Card className="rounded-2xl shadow-sm border-0 bg-card/80">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" />Latence (24h)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11 }} />
                <Line type="monotone" dataKey="db" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="DB" />
                <Line type="monotone" dataKey="auth" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} name="Auth" />
                <Line type="monotone" dataKey="storage" stroke="hsl(var(--secondary-foreground))" strokeWidth={2} dot={false} name="Storage" />
                <Line type="monotone" dataKey="edge" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="Edge" />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-muted-foreground text-center mt-2">{snapshots.length} mesures sur les dernières 24h</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminSystemHealth;
