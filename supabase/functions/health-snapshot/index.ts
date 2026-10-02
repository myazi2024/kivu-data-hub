import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { isCronCaller, getAdminUserId, forbidden } from '../_shared/internalAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Simple ping de disponibilité (sans écriture)
  if (req.method === 'HEAD' || new URL(req.url).searchParams.has('ping')) {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (!(await isCronCaller(req, supabase)) && !(await getAdminUserId(req, supabase))) {
    return forbidden(corsHeaders);
  }

  const ping = async (fn: () => Promise<unknown>) => {
    const t0 = performance.now();
    try { await fn(); return { ms: Math.round(performance.now() - t0), ok: true }; }
    catch { return { ms: Math.round(performance.now() - t0), ok: false }; }
  };

  const db = await ping(async () => { await supabase.from('system_settings').select('setting_key').limit(1); });
  const auth = await ping(() => supabase.auth.getSession());
  const storage = await ping(() => supabase.storage.listBuckets());
  const edge = await ping(() => fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/health-snapshot?ping=1`, { method: 'HEAD' }));

  // Tables/records counts (best-effort)
  let total_tables: number | null = null;
  let total_records: number | null = null;
  try {
    const { data } = await (supabase as any).rpc('list_public_tables_with_count');
    if (Array.isArray(data)) {
      total_tables = data.length;
      total_records = data.reduce((s: number, t: any) => s + Number(t.row_count || 0), 0);
    }
  } catch (_) { /* ignore */ }

  await supabase.from('system_health_snapshots').insert({
    db_latency_ms: db.ms,
    auth_latency_ms: auth.ms,
    storage_latency_ms: storage.ms,
    edge_fn_latency_ms: edge.ms,
    edge_fn_status: edge.ok ? 'up' : 'down',
    total_tables,
    total_records,
  });

  // Purge > 30 days
  const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString();
  await supabase.from('system_health_snapshots').delete().lt('captured_at', cutoff);

  return new Response(JSON.stringify({ ok: true, db: db.ms, auth: auth.ms, storage: storage.ms, edge: edge.ms }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
