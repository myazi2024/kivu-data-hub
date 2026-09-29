import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return new Response(null, { status: 405, headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) throw new Error("Configuration unavailable");
    const client = createClient(url, key);
    const { data, error } = await client.rpc("get_home_bic_counts");
    if (error || !data?.[0]) throw error ?? new Error("Counts unavailable");
    const { parcels_count, services_count, disputes_count } = data[0];
    const { data: byDistrict } = await client.rpc("get_home_district_parcel_counts");
    const parcels_by_district: Record<string, number> = {};
    for (const row of (byDistrict ?? []) as { land_district: string; parcels_count: number }[]) {
      parcels_by_district[row.land_district] = Number(row.parcels_count) || 0;
    }
    return new Response(JSON.stringify({ parcels_count, services_count, disputes_count, parcels_by_district }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
    });
  } catch (error) {
    console.error("Home counts unavailable", error);
    return new Response(JSON.stringify({ error: "Counts unavailable" }), {
      status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});