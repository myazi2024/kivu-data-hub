import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const start = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Quick DB ping
    const dbStart = Date.now();
    const { error: dbError } = await supabase
      .from("profiles")
      .select("user_id", { count: "exact", head: true })
      .limit(1);
    const dbLatency = Date.now() - dbStart;

    return new Response(
      JSON.stringify({
        ok: !dbError,
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - start,
        db_latency_ms: dbLatency,
        db_status: dbError ? "error" : "ok",
        runtime: "deno",
      }),
      {
        status: dbError ? 503 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - start,
        error: err.message,
      }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
