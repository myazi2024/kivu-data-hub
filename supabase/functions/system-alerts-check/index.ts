import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COOLDOWN_MS = 6 * 3600_000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const fired: string[] = [];

  const fireIfAllowed = async (key: string, title: string, message: string, payload: any = {}) => {
    const { data: state } = await supabase.from('system_alerts_state').select('last_fired_at').eq('alert_key', key).maybeSingle();
    if (state && new Date(state.last_fired_at).getTime() > Date.now() - COOLDOWN_MS) return;

    const { data: admins } = await supabase.from('user_roles').select('user_id').in('role', ['admin', 'super_admin']);
    if (admins?.length) {
      const rows = admins.map((a: any) => ({
        user_id: a.user_id,
        title,
        message,
        type: 'system_alert',
        action_url: '/admin?tab=system-hub',
      }));
      await supabase.from('notifications').insert(rows);
    }
    await supabase.from('system_alerts_state').upsert({
      alert_key: key,
      last_fired_at: new Date().toISOString(),
      fire_count: (state ? 1 : 1),
      last_payload: payload,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'alert_key' });
    fired.push(key);
  };

  // Rule 1: audit_logs > 1M
  const { count: auditCount } = await supabase.from('audit_logs').select('*', { count: 'exact', head: true });
  if ((auditCount ?? 0) > 1_000_000) {
    await fireIfAllowed('audit_logs_overflow', 'Audit logs > 1M', `${auditCount?.toLocaleString('fr-FR')} entrées dans audit_logs. Lancer la purge.`, { count: auditCount });
  }

  // Rule 2: latency thresholds
  const { data: settings } = await supabase.from('system_settings').select('setting_key, setting_value').in('setting_key', ['health_db_threshold_ms', 'health_edge_threshold_ms']);
  const thresh: Record<string, number> = {};
  (settings || []).forEach((s: any) => { thresh[s.setting_key] = Number(s.setting_value) || 0; });

  const { data: lastSnap } = await supabase.from('system_health_snapshots').select('*').order('captured_at', { ascending: false }).limit(1).maybeSingle();
  if (lastSnap) {
    if (thresh.health_db_threshold_ms && lastSnap.db_latency_ms > thresh.health_db_threshold_ms) {
      await fireIfAllowed('db_latency_high', 'Latence DB élevée', `${lastSnap.db_latency_ms}ms > seuil ${thresh.health_db_threshold_ms}ms`, lastSnap);
    }
    if (thresh.health_edge_threshold_ms && lastSnap.edge_fn_latency_ms > thresh.health_edge_threshold_ms) {
      await fireIfAllowed('edge_latency_high', 'Latence Edge élevée', `${lastSnap.edge_fn_latency_ms}ms > seuil ${thresh.health_edge_threshold_ms}ms`, lastSnap);
    }
  }

  // Rule 3: edge down 3+ snapshots
  const { data: last3 } = await supabase.from('system_health_snapshots').select('edge_fn_status').order('captured_at', { ascending: false }).limit(3);
  if ((last3?.length || 0) >= 3 && last3!.every((s: any) => s.edge_fn_status === 'down')) {
    await fireIfAllowed('edge_down_3', 'Edge functions DOWN', '3 derniers snapshots: edge functions inaccessibles.', { last3 });
  }

  // Rule 4: test mode > 24h
  const { data: tm } = await supabase.from('cadastral_search_config').select('config_value, updated_at').eq('config_key', 'test_mode').maybeSingle();
  const enabled = (tm?.config_value as any)?.enabled === true;
  if (enabled && tm?.updated_at && new Date(tm.updated_at).getTime() < Date.now() - 86400_000) {
    await fireIfAllowed('test_mode_long', 'Mode Test actif > 24h', 'Le mode test est activé depuis plus de 24h. Vérifier qu\'il ne tourne pas en production.', tm);
  }

  return new Response(JSON.stringify({ fired }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
