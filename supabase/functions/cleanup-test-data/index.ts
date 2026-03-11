import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Charger la config du mode test
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

    const config = configData.config_value as any;

    if (!config.enabled || !config.auto_cleanup) {
      return new Response(
        JSON.stringify({ message: "Auto-cleanup is disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const retentionDays = config.test_data_retention_days || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffISO = cutoffDate.toISOString();

    let deletedCounts = { cccCodes: 0, serviceAccess: 0, invoices: 0, contributions: 0, payments: 0 };

    // Supprimer dans l'ordre FK: enfants → parents

    // 1. Codes CCC expirés
    const { data: ccc } = await supabase
      .from("cadastral_contributor_codes")
      .delete()
      .ilike("parcel_number", "TEST-%")
      .lt("created_at", cutoffISO)
      .select("id");
    deletedCounts.cccCodes = ccc?.length || 0;

    // 2. Service access
    const { data: access } = await supabase
      .from("cadastral_service_access")
      .delete()
      .ilike("parcel_number", "TEST-%")
      .lt("created_at", cutoffISO)
      .select("id");
    deletedCounts.serviceAccess = access?.length || 0;

    // 3. Factures
    const { data: invoices } = await supabase
      .from("cadastral_invoices")
      .delete()
      .ilike("parcel_number", "TEST-%")
      .lt("created_at", cutoffISO)
      .select("id");
    deletedCounts.invoices = invoices?.length || 0;

    // 4. Contributions
    const { data: contributions } = await supabase
      .from("cadastral_contributions")
      .delete()
      .ilike("parcel_number", "TEST-%")
      .lt("created_at", cutoffISO)
      .select("id");
    deletedCounts.contributions = contributions?.length || 0;

    // 5. Payment transactions
    const { data: payments } = await supabase
      .from("payment_transactions")
      .delete()
      .eq("metadata->>test_mode", "true")
      .lt("created_at", cutoffISO)
      .select("id");
    deletedCounts.payments = payments?.length || 0;

    // Log audit
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
