import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Trash2, RefreshCw, ShieldCheck, AlertTriangle, History } from 'lucide-react';
import { toast } from 'sonner';
import {
  detectOrphansAndMissing, purgeOrphans, syncRegistryToDb,
  logConfigAudit, type OrphanReport,
} from '@/utils/analyticsConfigSync';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface AuditRow {
  id: string;
  action: string;
  tab_key: string | null;
  item_count: number;
  admin_name: string | null;
  created_at: string;
}

export const SyncManager: React.FC = () => {
  const qc = useQueryClient();
  const [report, setReport] = useState<OrphanReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<'purge' | 'sync' | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [showAudit, setShowAudit] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await detectOrphansAndMissing();
      setReport(r);
    } catch (e: any) {
      toast.error(`Détection: ${e.message}`);
    } finally { setLoading(false); }
  }, []);

  const loadAudit = useCallback(async () => {
    const { data, error } = await supabase
      .from('analytics_config_audit')
      .select('id,action,tab_key,item_count,admin_name,created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error) setAudit((data || []) as AuditRow[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { if (showAudit) loadAudit(); }, [showAudit, loadAudit]);

  const handlePurge = async () => {
    if (!report) return;
    setBusy('purge');
    try {
      const n = await purgeOrphans(report);
      await logConfigAudit({ action: 'cleanup_orphans', item_count: n, diff: { tabs: report.orphanTabs, items: report.orphanItems } });
      toast.success(`${n} entrée(s) orpheline(s) supprimée(s)`);
      await refresh();
      qc.invalidateQueries({ queryKey: ['analytics-charts-config'] });
    } catch (e: any) {
      toast.error(`Purge: ${e.message}`);
    } finally { setBusy(null); }
  };

  const handleSync = async () => {
    if (!report) return;
    setBusy('sync');
    try {
      const n = await syncRegistryToDb(report);
      await logConfigAudit({ action: 'sync_registry', item_count: n, diff: { tabs: report.missingTabs, items: report.missingItems } });
      toast.success(`${n} entrée(s) ajoutée(s) depuis le registre`);
      await refresh();
      qc.invalidateQueries({ queryKey: ['analytics-charts-config'] });
    } catch (e: any) {
      toast.error(`Sync: ${e.message}`);
    } finally { setBusy(null); }
  };

  if (loading || !report) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center text-muted-foreground text-sm gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyse de la cohérence registre ↔ base de données...
        </CardContent>
      </Card>
    );
  }

  const totalOrphans = report.orphanTabs.length + report.orphanItems.length;
  const totalMissing = report.missingTabs.length + report.missingItems.length;
  const allClean = totalOrphans === 0 && totalMissing === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Cohérence Registre ↔ Base de données
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Détecte et corrige les divergences entre le code (registre) et les overrides en base.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAudit(s => !s)}>
              <History className="h-3 w-3 mr-1" />
              {showAudit ? 'Masquer audit' : 'Voir audit'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {allClean ? (
          <div className="flex items-center gap-2 p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-xs text-emerald-700 dark:text-emerald-400">
              Configuration cohérente. Aucun orphelin, rien à synchroniser.
            </span>
          </div>
        ) : null}

        {/* Orphans */}
        <div className="rounded-md border p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-semibold">Orphelins en BD</span>
              <Badge variant={totalOrphans ? 'destructive' : 'outline'} className="text-[9px]">{totalOrphans}</Badge>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs"
              onClick={handlePurge} disabled={!totalOrphans || busy !== null}>
              {busy === 'purge' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
              Nettoyer
            </Button>
          </div>
          {totalOrphans > 0 && (
            <ScrollArea className="max-h-32">
              <div className="space-y-0.5 text-[10px] font-mono text-muted-foreground">
                {report.orphanTabs.map(t => (
                  <div key={`ot-${t}`}>🗂️ tab orphelin : <span className="text-foreground">{t}</span> (purge complète)</div>
                ))}
                {report.orphanItems.map((it, i) => (
                  <div key={`oi-${i}`}>📊 {it.tab_key} / <span className="text-foreground">{it.item_key}</span> ({it.item_type})</div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Missing */}
        <div className="rounded-md border p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 text-sky-600" />
              <span className="text-xs font-semibold">Manquants en BD (présents dans le registre)</span>
              <Badge variant={totalMissing ? 'default' : 'outline'} className="text-[9px]">{totalMissing}</Badge>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs"
              onClick={handleSync} disabled={!totalMissing || busy !== null}>
              {busy === 'sync' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Synchroniser
            </Button>
          </div>
          {totalMissing > 0 && (
            <ScrollArea className="max-h-32">
              <div className="space-y-0.5 text-[10px] font-mono text-muted-foreground">
                {report.missingTabs.map(t => (
                  <div key={`mt-${t}`}>🗂️ tab manquant : <span className="text-foreground">{t}</span></div>
                ))}
                {report.missingItems.map((it, i) => (
                  <div key={`mi-${i}`}>📊 {it.tab_key} / <span className="text-foreground">{it.item_key}</span> ({it.item_type})</div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Audit log */}
        {showAudit && (
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <History className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold">Audit log (50 dernières actions)</span>
            </div>
            <ScrollArea className="max-h-48">
              {audit.length === 0 ? (
                <div className="text-[11px] text-muted-foreground py-2">Aucune action enregistrée pour le moment.</div>
              ) : (
                <div className="space-y-0.5 text-[10px] font-mono">
                  {audit.map(a => (
                    <div key={a.id} className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-foreground">{new Date(a.created_at).toLocaleString('fr-FR')}</span>
                      <Badge variant="outline" className="text-[9px] h-4 px-1">{a.action}</Badge>
                      {a.tab_key && <span>{a.tab_key}</span>}
                      <span>· {a.item_count} item(s)</span>
                      {a.admin_name && <span>· {a.admin_name}</span>}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/** Compact badge for header showing orphan count. */
export const OrphanCountBadge: React.FC<{ tabKey: string }> = ({ tabKey }) => {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    detectOrphansAndMissing().then(r => {
      const c = r.orphanItems.filter(i => i.tab_key === tabKey).length
        + (r.orphanTabs.includes(tabKey) ? 1 : 0);
      setCount(c);
    }).catch(() => {});
  }, [tabKey]);
  if (!count) return null;
  return (
    <Badge variant="destructive" className="text-[8px] h-3.5 px-1" title={`${count} orphelin(s) en BD`}>
      {count} orph.
    </Badge>
  );
};
