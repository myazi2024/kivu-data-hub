import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Database, Users, Shield, AlertTriangle, Settings, FileDown, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { toast } from 'sonner';
import SystemConfigExportButton from './system/SystemConfigExportButton';

interface HubStats {
  auditLogsCount: number;
  hrEmployeesCount: number;
  testModeActive: boolean;
  appearanceConfigCount: number;
  recentConfigChanges: number;
  totalTables: number;
  totalRecords: number;
}

const AdminSystemHub = () => {
  const [stats, setStats] = useState<HubStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { settings } = useSystemSettings();

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [auditCount, hrCount, testMode, appearance, recentAudit, tablesData] = await Promise.all([
        supabase.from('audit_logs').select('*', { count: 'exact', head: true }),
        supabase.from('hr_employees').select('*', { count: 'exact', head: true }),
        supabase.from('cadastral_search_config').select('config_value').eq('config_key', 'test_mode').maybeSingle(),
        (supabase as any).from('app_appearance_config').select('*', { count: 'exact', head: true }),
        (supabase as any).from('system_config_audit').select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 86400_000).toISOString()),
        (supabase as any).rpc('list_public_tables_with_count'),
      ]);

      const totalRecords = (tablesData.data || []).reduce((s: number, t: any) => s + Number(t.row_count || 0), 0);

      setStats({
        auditLogsCount: auditCount.count || 0,
        hrEmployeesCount: hrCount.count || 0,
        testModeActive: (testMode.data?.config_value as any)?.enabled === true,
        appearanceConfigCount: appearance.count || 0,
        recentConfigChanges: recentAudit.count || 0,
        totalTables: (tablesData.data || []).length,
        totalRecords,
      });
    } catch (e: any) {
      toast.error('Erreur chargement stats');
    } finally {
      setLoading(false);
    }
  };

  const exportConfig = async () => {
    setExporting(true);
    try {
      const tables = ['app_appearance_config', 'parcel_actions_config', 'cadastral_search_config', 'cadastral_results_config', 'system_settings', 'analytics_charts_config', 'catalog_config', 'cadastral_contribution_config', 'certificate_templates'];
      const result: any = { exported_at: new Date().toISOString() };
      for (const t of tables) {
        const { data } = await (supabase as any).from(t).select('*');
        result[t] = data || [];
      }
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system_config_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Configuration exportée');
    } catch (e: any) {
      toast.error('Erreur export');
    } finally {
      setExporting(false);
    }
  };

  if (loading || !stats) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const auditAlert = stats.auditLogsCount > 1_000_000;
  const testAlert = stats.testModeActive;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />Hub Système</h2>
          <p className="text-xs text-muted-foreground">Vue transversale santé, audit, configurations</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportConfig} disabled={exporting} variant="outline" size="sm">
            {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileDown className="h-3.5 w-3.5 mr-1" />}
            Export JSON
          </Button>
          <SystemConfigExportButton />
        </div>
      </div>

      {/* Alertes */}
      {(auditAlert || testAlert) && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-3 space-y-2">
            {auditAlert && (
              <div className="flex items-center gap-2 text-xs">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span><strong>{stats.auditLogsCount.toLocaleString('fr-FR')}</strong> entrées audit_logs (&gt; 1M). Lancer la purge.</span>
              </div>
            )}
            {testAlert && (
              <div className="flex items-center gap-2 text-xs">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span>Mode Test actif — vérifiez qu'il n'est pas activé en production.</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Database, label: 'Tables BD', value: stats.totalTables, sub: `${stats.totalRecords.toLocaleString('fr-FR')} lignes` },
          { icon: Shield, label: 'Logs audit', value: stats.auditLogsCount.toLocaleString('fr-FR'), sub: `${stats.recentConfigChanges} chg config 24h` },
          { icon: Users, label: 'Employés RH', value: stats.hrEmployeesCount, sub: 'Total actifs' },
          { icon: Settings, label: 'Config UI', value: stats.appearanceConfigCount, sub: 'Clés apparence' },
        ].map((k, i) => (
          <Card key={i} className="rounded-xl">
            <CardContent className="p-3">
              <k.icon className="h-4 w-4 text-primary mb-1" />
              <div className="text-xl font-bold">{k.value}</div>
              <p className="text-[10px] text-muted-foreground">{k.label}</p>
              <p className="text-[10px] text-muted-foreground/70">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick links */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Accès rapide</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { tab: 'system-health', label: 'Santé système' },
            { tab: 'audit-logs', label: 'Logs d\'audit' },
            { tab: 'system-settings', label: 'Paramètres' },
            { tab: 'appearance', label: 'Apparence' },
            { tab: 'parcel-actions-config', label: 'Actions parcelle' },
            { tab: 'hr', label: 'Espace RH' },
          ].map(l => (
            <Button key={l.tab} asChild variant="outline" size="sm" className="justify-between">
              <Link to={`/admin?tab=${l.tab}`}>{l.label}<ArrowRight className="h-3 w-3" /></Link>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Settings preview */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Paramètres globaux actifs</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {Object.entries(settings).map(([k, v]) => (
            <div key={k} className="p-2 bg-muted/40 rounded">
              <p className="text-[10px] text-muted-foreground">{k}</p>
              <p className="font-mono text-[11px] truncate">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSystemHub;
