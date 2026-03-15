import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** FK-safe deletion order: children → parents */
const DELETION_ORDER = [
  { table: "cadastral_contributor_codes", filter: "ilike", column: "parcel_number", value: "TEST-%" },
  { table: "cadastral_service_access", filter: "ilike", column: "parcel_number", value: "TEST-%" },
  { table: "cadastral_invoices", filter: "ilike", column: "parcel_number", value: "TEST-%" },
  { table: "cadastral_contributions", filter: "ilike", column: "parcel_number", value: "TEST-%" },
  { table: "payment_transactions", filter: "jsonb", column: "metadata->>test_mode", value: "true" },
  { table: "real_estate_expertise_requests", filter: "ilike", column: "parcel_number", value: "TEST-%" },
  { table: "cadastral_land_disputes", filter: "ilike", column: "parcel_number", value: "TEST-%" },
  { table: "land_title_requests", filter: "ilike", column: "reference_number", value: "TEST-%" },
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load test mode config
    const { data: configData } = await supabase
      .from("cadastral_search_config")
      .select("config_value")
      .eq("config_key", "test_mode")
      .eq("is_active", true)
      .maybeSingle();

    if (!configData?.config_value) {
      return new Response(
        JSON.stringify({ message: "No test mode config found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = configData.config_value as Record<string, unknown>;

    if (!config.enabled || !config.auto_cleanup) {
      return new Response(
        JSON.stringify({ message: "Auto-cleanup is disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const retentionDays = (config.test_data_retention_days as number) || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffISO = cutoffDate.toISOString();

    const deletedCounts: Record<string, number> = {};

    for (const entry of DELETION_ORDER) {
      let query = supabase
        .from(entry.table)
        .delete();

      if (entry.filter === "ilike") {
        query = (query as any).ilike(entry.column, entry.value);
      } else {
        query = (query as any).filter(entry.column, "eq", entry.value);
      }

      const { data } = await (query as any).lt("created_at", cutoffISO).select("id");
      deletedCounts[entry.table] = data?.length || 0;
    }

    // Audit log
    await supabase.rpc("log_audit_action", {
      action_param: "AUTO_TEST_DATA_CLEANUP",
      table_name_param: "cadastral_contributions",
      record_id_param: null,
      old_values_param: { retention_days: retentionDays, cutoff: cutoffISO },
      new_values_param: { deleted: deletedCounts },
    });

    console.log("Auto-cleanup completed:", deletedCounts);

    return new Response(
      JSON.stringify({ success: true, deleted: deletedCounts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auto-cleanup error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
