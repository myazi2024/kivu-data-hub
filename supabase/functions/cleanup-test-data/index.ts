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

    // FK-safe deletion order (children → parents)

    // 1. Fraud attempts (FK → contributions)
    const { data: contribRows } = await supabase
      .from("cadastral_contributions")
      .select("id")
      .ilike("parcel_number", "TEST-%")
      .lt("created_at", cutoffISO);
    const contribIds = contribRows?.map((r: any) => r.id) ?? [];
    if (contribIds.length > 0) {
      const { data: faData } = await supabase.from("fraud_attempts").delete().in("contribution_id", contribIds).select("id");
      deletedCounts["fraud_attempts"] = faData?.length || 0;
    }

    // 2. Contributor codes
    const { data: cccData } = await supabase.from("cadastral_contributor_codes").delete().ilike("parcel_number", "TEST-%").lt("created_at", cutoffISO).select("id");
    deletedCounts["cadastral_contributor_codes"] = cccData?.length || 0;

    // 3. Service access (FK → invoices)
    const { data: saData } = await supabase.from("cadastral_service_access").delete().ilike("parcel_number", "TEST-%").lt("created_at", cutoffISO).select("id");
    deletedCounts["cadastral_service_access"] = saData?.length || 0;

    // 4. Payment transactions (before invoices)
    const { data: ptData } = await supabase.from("payment_transactions").delete().filter("metadata->>test_mode", "eq", "true").lt("created_at", cutoffISO).select("id");
    deletedCounts["payment_transactions"] = ptData?.length || 0;

    // 5. Invoices
    const { data: invData } = await supabase.from("cadastral_invoices").delete().ilike("parcel_number", "TEST-%").lt("created_at", cutoffISO).select("id");
    deletedCounts["cadastral_invoices"] = invData?.length || 0;

    // 6. Contributions
    const { data: conData } = await supabase.from("cadastral_contributions").delete().ilike("parcel_number", "TEST-%").lt("created_at", cutoffISO).select("id");
    deletedCounts["cadastral_contributions"] = conData?.length || 0;

    // 7. Parcel children
    const { data: parcelRows } = await supabase.from("cadastral_parcels").select("id").ilike("parcel_number", "TEST-%").lt("created_at", cutoffISO);
    const parcelIds = parcelRows?.map((r: any) => r.id) ?? [];
    if (parcelIds.length > 0) {
      const { data: ohData } = await supabase.from("cadastral_ownership_history").delete().in("parcel_id", parcelIds).select("id");
      deletedCounts["cadastral_ownership_history"] = ohData?.length || 0;
      const { data: thData } = await supabase.from("cadastral_tax_history").delete().in("parcel_id", parcelIds).select("id");
      deletedCounts["cadastral_tax_history"] = thData?.length || 0;
    }

    // 8. Parcels
    const { data: pData } = await supabase.from("cadastral_parcels").delete().ilike("parcel_number", "TEST-%").lt("created_at", cutoffISO).select("id");
    deletedCounts["cadastral_parcels"] = pData?.length || 0;

    // 9. Independent tables
    const independentTables = [
      { table: "real_estate_expertise_requests", column: "parcel_number", value: "TEST-%" },
      { table: "cadastral_land_disputes", column: "parcel_number", value: "TEST-%" },
      { table: "land_title_requests", column: "reference_number", value: "TEST-%" },
      { table: "cadastral_boundary_conflicts", column: "reporting_parcel_number", value: "TEST-%" },
      { table: "generated_certificates", column: "reference_number", value: "TEST-%" },
    ];

    for (const entry of independentTables) {
      const { data } = await supabase
        .from(entry.table)
        .delete()
        .ilike(entry.column, entry.value)
        .lt("created_at", cutoffISO)
        .select("id");
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
