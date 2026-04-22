import { useState } from 'react';
import { useRequestsHealth } from '@/hooks/useRequestsHealth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { AlertTriangle, FileWarning, RefreshCw, Zap, ExternalLink, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { SLAConfigPanel } from './requests/SLAConfigPanel';
import { MonthlyExportPanel } from './requests/MonthlyExportPanel';

const TAB_BY_SERVICE: Record<string, string> = {
  land_title_requests: 'land-title-requests',
  mutation_requests: 'mutations',
  subdivision_requests: 'subdivision-hub',
  real_estate_expertise_requests: 'expertise-requests',
  cadastral_building_permits: 'permits',
  cadastral_land_disputes: 'land-disputes',
  cadastral_mortgages: 'mortgages',
};

const AdminRequestsHub = () => {
  const { rows, missing, loading, error, refresh, escalateStale } = useRequestsHealth();
  const [escalating, setEscalating] = useState(false);

  const totalStale = rows.reduce((s, r) => s + r.stale_30d, 0);
  const totalEscalated = rows.reduce((s, r) => s + r.escalated_count, 0);
  const totalPending = rows.reduce((s, r) => s + r.pending + r.in_review, 0);
  const totalApproved = rows.reduce((s, r) => s + r.approved, 0);

  const handleEscalate = async () => {
    setEscalating(true);
    try {
      const results = await escalateStale(30);
      const total = results.reduce((s, r) => s + r.escalated_count, 0);
      toast.success(`${total} demande(s) escaladée(s)`);
    } catch (e: any) {
      toast.error(e.message || 'Échec de l\'escalade');
    } finally { setEscalating(false); }
  };

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Chargement du hub demandes…</div>;
  if (error) return <div className="p-4 text-sm text-destructive">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Hub Demandes & Procédures</h1>
          <p className="text-xs text-muted-foreground">Vue transversale santé, SLA, certificats & escalade</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="h-3 w-3 mr-1" /> Rafraîchir</Button>
          <Button size="sm" onClick={handleEscalate} disabled={escalating}>
            <Zap className="h-3 w-3 mr-1" /> Escalader stales (&gt;30j)
          </Button>
        </div>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase">En attente / revue</p>
          <p className="text-2xl font-bold">{totalPending}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase">Stale &gt; 30j</p>
          <p className="text-2xl font-bold text-destructive">{totalStale}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase">Cert. manquants</p>
          <p className="text-2xl font-bold text-destructive">{missing.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase">Escaladées</p>
          <p className="text-2xl font-bold">{totalEscalated}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="missing">Certificats manquants ({missing.length})</TabsTrigger>
          <TabsTrigger value="sla">SLA</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Santé par service</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {rows.map(r => {
                const tab = TAB_BY_SERVICE[r.service];
                const stalePct = r.total > 0 ? Math.round((r.stale_30d / r.total) * 100) : 0;
                return (
                  <Link key={r.service} to={`/admin?tab=${tab}`}
                    className="flex items-center justify-between p-3 border rounded-md hover:bg-accent/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{r.service_label}</p>
                        {r.stale_30d > 0 && <Badge variant="destructive" className="text-[10px]">{r.stale_30d} stales</Badge>}
                        {r.escalated_count > 0 && <Badge variant="outline" className="text-[10px]">{r.escalated_count} esc.</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.total} total · {r.pending} pending · {r.in_review} review · {r.approved} approuvés · {r.rejected} rejetés
                        {stalePct > 0 && ` · ${stalePct}% en retard`}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="missing" className="mt-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileWarning className="h-4 w-4 text-destructive" />
                Demandes approuvées sans certificat ({missing.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {missing.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune anomalie. Tous les certificats sont générés. ✅</p>
              ) : (
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {missing.map(m => {
                    const tab = TAB_BY_SERVICE[m.request_table];
                    return (
                      <div key={m.request_id} className="flex items-center justify-between text-xs p-2 border rounded">
                        <div className="flex items-center gap-2 min-w-0">
                          <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                          <span className="font-mono truncate">{m.reference_number}</span>
                          <Badge variant="outline" className="text-[9px]">{m.request_table.replace('_requests', '')}</Badge>
                        </div>
                        <Link to={`/admin?tab=${tab}`} className="text-primary hover:underline flex items-center gap-1">
                          Voir <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla" className="mt-3">
          <SLAConfigPanel />
        </TabsContent>

        <TabsContent value="export" className="mt-3">
          <MonthlyExportPanel />
        </TabsContent>
      </Tabs>

      <p className="text-[10px] text-muted-foreground">
        Total approuvés tous services : <strong>{totalApproved}</strong>. La régénération automatique de certificats nécessite l'edge function dédiée — ici la liste sert au suivi manuel.
      </p>
    </div>
  );
};

export default AdminRequestsHub;
