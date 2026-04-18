import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Database, Loader2 } from 'lucide-react';
import { SystemConfigAuditViewer } from './config/SystemConfigAuditViewer';

interface ConfigTableStat {
  table_name: string;
  row_count: number;
  last_change_at: string | null;
  last_change_by: string | null;
}

const CONFIG_TABLES = [
  'app_appearance_config',
  'cadastral_contribution_config',
  'cadastral_results_config',
  'cadastral_search_config',
  'cadastral_services_config',
  'catalog_config',
  'currency_config',
  'expertise_fees_config',
  'land_title_fees_config',
  'map_config',
  'map_providers',
  'mutation_fees_config',
  'parcel_actions_config',
  'payment_methods_config',
  'permit_fees_config',
  'pitch_slides_config',
  'property_tax_rates_config',
  'subdivision_rate_config',
  'tax_exemptions_config',
  'tax_payment_fees_config',
];

const AdminConfigHub: React.FC = () => {
  const [stats, setStats] = useState<ConfigTableStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const results: ConfigTableStat[] = [];
      for (const t of CONFIG_TABLES) {
        const { count } = await (supabase as any)
          .from(t)
          .select('*', { count: 'exact', head: true });
        const { data: lastAudit } = await (supabase as any)
          .from('system_config_audit')
          .select('created_at, admin_name')
          .eq('table_name', t)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        results.push({
          table_name: t,
          row_count: count || 0,
          last_change_at: lastAudit?.created_at || null,
          last_change_by: lastAudit?.admin_name || null,
        });
      }
      setStats(results);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" /> Hub Configuration
          </CardTitle>
          <CardDescription>
            Vue centralisée des {CONFIG_TABLES.length} tables de configuration système.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.map((s) => (
                <Card key={s.table_name} className="border">
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-mono font-medium truncate">{s.table_name}</span>
                      <Badge variant="outline">{s.row_count}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.last_change_by
                        ? `Dernier: ${s.last_change_by} · ${new Date(s.last_change_at!).toLocaleString('fr-FR')}`
                        : 'Aucune modification tracée'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SystemConfigAuditViewer limit={100} title="Toutes modifications config (50 récentes)" />
    </div>
  );
};

export default AdminConfigHub;
