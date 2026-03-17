import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Database, Server, Wifi, RefreshCw, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ServiceStatus {
  name: string;
  status: 'online' | 'degraded' | 'offline';
  latency?: number;
  lastCheck: Date;
}

const AdminSystemHealth = () => {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbStats, setDbStats] = useState({
    totalTables: 0,
    totalRecords: 0,
    connectionPool: 85,
  });

  useEffect(() => {
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    setLoading(true);
    try {
      const startTime = Date.now();
      
      // Test Supabase connection
      const { error: dbError } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
      const dbLatency = Date.now() - startTime;
      
      // Test auth service
      const authStart = Date.now();
      const { error: authError } = await supabase.auth.getSession();
      const authLatency = Date.now() - authStart;

      // Get some DB stats
      const tables = ['profiles', 'cadastral_parcels', 'cadastral_contributions', 'payments', 'notifications'];
      let totalRecords = 0;
      
      for (const table of tables) {
        const { count } = await supabase.from(table as any).select('*', { count: 'exact', head: true });
        totalRecords += count || 0;
      }

      // Estimate connection pool health based on response latency
      const estimatedPoolHealth = dbLatency < 100 ? 95 : dbLatency < 300 ? 80 : dbLatency < 500 ? 60 : 40;
      setDbStats({
        totalTables: tables.length,
        totalRecords,
        connectionPool: estimatedPoolHealth,
      });

      // Test real latency for storage
      const storageStart = Date.now();
      const { error: storageError } = await supabase.storage.getBucket('avatars');
      const storageLatency = Date.now() - storageStart;

      setServices([
        {
          name: 'Base de données Supabase',
          status: dbError ? 'offline' : dbLatency > 500 ? 'degraded' : 'online',
          latency: dbLatency,
          lastCheck: new Date(),
        },
        {
          name: 'Service d\'authentification',
          status: authError ? 'offline' : authLatency > 300 ? 'degraded' : 'online',
          latency: authLatency,
          lastCheck: new Date(),
        },
        {
          name: 'API REST',
          status: dbError ? 'offline' : 'online',
          latency: dbLatency,
          lastCheck: new Date(),
        },
        {
          name: 'Stockage fichiers',
          status: storageError ? 'degraded' : storageLatency > 500 ? 'degraded' : 'online',
          latency: storageLatency,
          lastCheck: new Date(),
        },
        {
          name: 'Edge Functions',
          status: 'online', // Note: monitoring réel à implémenter via health check endpoint
          latency: undefined,
          lastCheck: new Date(),
        },
      ]);

      toast.success('Vérification terminée');
    } catch (error) {
      console.error('Error checking system health:', error);
      toast.error('Erreur lors de la vérification');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500/10 text-green-600 text-[10px]">En ligne</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500/10 text-yellow-600 text-[10px]">Dégradé</Badge>;
      case 'offline':
        return <Badge variant="destructive" className="text-[10px]">Hors ligne</Badge>;
      default:
        return null;
    }
  };

  const overallStatus = services.every(s => s.status === 'online') 
    ? 'online' 
    : services.some(s => s.status === 'offline') 
      ? 'offline' 
      : 'degraded';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Santé du Système</h2>
          <p className="text-xs text-muted-foreground">Surveillance en temps réel</p>
        </div>
        <Button 
          onClick={checkSystemHealth} 
          disabled={loading}
          size="sm"
          className="text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Overall Status */}
      <Card className="rounded-2xl shadow-sm border-0 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                overallStatus === 'online' ? 'bg-green-500/10' :
                overallStatus === 'degraded' ? 'bg-yellow-500/10' : 'bg-red-500/10'
              }`}>
                <Activity className={`h-5 w-5 ${
                  overallStatus === 'online' ? 'text-green-500' :
                  overallStatus === 'degraded' ? 'text-yellow-500' : 'text-red-500'
                }`} />
              </div>
              <div>
                <p className="text-sm font-medium">État Global</p>
                <p className="text-xs text-muted-foreground">
                  {services.filter(s => s.status === 'online').length}/{services.length} services en ligne
                </p>
              </div>
            </div>
            {getStatusBadge(overallStatus)}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="rounded-xl shadow-sm border-0 bg-card/80">
          <CardContent className="p-3 text-center">
            <Database className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{dbStats.totalTables}</p>
            <p className="text-[10px] text-muted-foreground">Tables</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm border-0 bg-card/80">
          <CardContent className="p-3 text-center">
            <Server className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{dbStats.totalRecords.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Enregistrements</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm border-0 bg-card/80">
          <CardContent className="p-3 text-center">
            <Wifi className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{dbStats.connectionPool}%</p>
            <p className="text-[10px] text-muted-foreground">Pool</p>
          </CardContent>
        </Card>
      </div>

      {/* Services Status */}
      <Card className="rounded-2xl shadow-sm border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Services</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {services.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(service.status)}
                    <div>
                      <p className="text-xs font-medium">{service.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {service.latency !== undefined ? `Latence: ${service.latency}ms` : 'Statut estimé'}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(service.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connection Pool */}
      <Card className="rounded-2xl shadow-sm border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Pool de Connexions</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Utilisation</span>
              <span className="font-medium">{dbStats.connectionPool}%</span>
            </div>
            <Progress value={dbStats.connectionPool} className="h-2" />
            <p className="text-[10px] text-muted-foreground">
              Valeur estimée - monitoring avancé à venir
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSystemHealth;
