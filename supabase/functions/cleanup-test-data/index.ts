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

    // Security: Verify JWT and admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = claimsData.claims.sub as string;

    // Verify admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin"])
      .limit(1);

    if (!roleData || roleData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Forbidden: admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    const errors: Record<string, string> = {};

    /** Helper: delete with error tracking */
    const safeDelete = async (
      label: string,
      query: PromiseLike<{ data: any; error: any }>
    ) => {
      const { data, error } = await query;
      if (error) {
        errors[label] = error.message;
        console.error(`Cleanup ${label}:`, error.message);
      }
      deletedCounts[label] = data?.length || 0;
    };

    // FK-safe deletion order (children → parents)

    // 1. Fraud attempts + permit_payments + permit_admin_actions (FK → contributions via contribution_id)
    const { data: contribRows } = await supabase
      .from("cadastral_contributions")
      .select("id")
      .ilike("parcel_number", "TEST-%")
      .lt("created_at", cutoffISO);
    const contribIds = contribRows?.map((r: any) => r.id) ?? [];
    if (contribIds.length > 0) {
      await safeDelete(
        "fraud_attempts",
        supabase.from("fraud_attempts").delete().in("contribution_id", contribIds).select("id")
      );
      // permit_payments and permit_admin_actions use contribution_id (NOT permit_id)
      await safeDelete(
        "permit_payments",
        supabase.from("permit_payments").delete().in("contribution_id", contribIds).select("id")
      );
      await safeDelete(
        "permit_admin_actions",
        supabase.from("permit_admin_actions").delete().in("contribution_id", contribIds).select("id")
      );
    }

    // 2. Contributor codes
    await safeDelete(
      "cadastral_contributor_codes",
      supabase.from("cadastral_contributor_codes").delete().ilike("parcel_number", "TEST-%").lt("created_at", cutoffISO).select("id")
    );

    // 3. Service access (FK → invoices)
    await safeDelete(
      "cadastral_service_access",
      supabase.from("cadastral_service_access").delete().ilike("parcel_number", "TEST-%").lt("created_at", cutoffISO).select("id")
    );

    // 4. Payment transactions (before invoices)
    await safeDelete(
      "payment_transactions",
      supabase.from("payment_transactions").delete().filter("metadata->>test_mode", "eq", "true").lt("created_at", cutoffISO).select("id")
    );

    // 5. Invoices
    await safeDelete(
      "cadastral_invoices",
      supabase.from("cadastral_invoices").delete().ilike("parcel_number", "TEST-%").lt("created_at", cutoffISO).select("id")
    );

    // 6. Contributions
    await safeDelete(
      "cadastral_contributions",
      supabase.from("cadastral_contributions").delete().ilike("parcel_number", "TEST-%").lt("created_at", cutoffISO).select("id")
    );

    // 7. Resolve parcel_ids EARLY — needed to purge FK children before parcels
    const { data: parcelRows } = await supabase
      .from("cadastral_parcels")
      .select("id")
      .ilike("parcel_number", "TEST-%")
      .lt("created_at", cutoffISO);
    const parcelIds = parcelRows?.map((r: any) => r.id) ?? [];

    // 7a. FK-safe: purge tables referencing cadastral_parcels.id BEFORE parcels.
    // Double pass per table: by parcel_id (catches legacy refs) + by reference_number (catches orphan TEST refs).
    if (parcelIds.length > 0) {
      await safeDelete(
        "mutation_requests_by_parcel",
        supabase.from("mutation_requests").delete().in("parcel_id", parcelIds).select("id")
      );
      await safeDelete(
        "subdivision_requests_by_parcel",
        supabase.from("subdivision_requests").delete().in("parcel_id", parcelIds).select("id")
      );
      await safeDelete(
        "land_title_requests_by_parcel",
        supabase.from("land_title_requests").delete().in("parcel_id", parcelIds).select("id")
      );
      await safeDelete(
        "cadastral_land_disputes_by_parcel",
        supabase.from("cadastral_land_disputes").delete().in("parcel_id", parcelIds).select("id")
      );

      // expertise_payments → real_estate_expertise_requests (by parcel_id)
      const { data: expByParcel } = await supabase
        .from("real_estate_expertise_requests")
        .select("id")
        .in("parcel_id", parcelIds);
      const expByParcelIds = expByParcel?.map((r: any) => r.id) ?? [];
      if (expByParcelIds.length > 0) {
        await safeDelete(
          "expertise_payments_by_parcel",
          supabase.from("expertise_payments").delete().in("expertise_request_id", expByParcelIds).select("id")
        );
        await safeDelete(
          "real_estate_expertise_requests_by_parcel",
          supabase.from("real_estate_expertise_requests").delete().in("id", expByParcelIds).select("id")
        );
      }
    }

    // 7b. Reference-based pass (orphan TEST refs without parcel_id)
    await safeDelete(
      "mutation_requests",
      supabase.from("mutation_requests").delete().ilike("reference_number", "TEST-%").lt("created_at", cutoffISO).select("id")
    );
    await safeDelete(
      "subdivision_requests",
      supabase.from("subdivision_requests").delete().ilike("reference_number", "TEST-%").lt("created_at", cutoffISO).select("id")
    );
    await safeDelete(
      "land_title_requests",
      supabase.from("land_title_requests").delete().ilike("reference_number", "TEST-%").lt("created_at", cutoffISO).select("id")
    );
    await safeDelete(
      "cadastral_land_disputes",
      supabase.from("cadastral_land_disputes").delete().ilike("parcel_number", "TEST-%").lt("created_at", cutoffISO).select("id")
    );
    const { data: expReqRows } = await supabase
      .from("real_estate_expertise_requests")
      .select("id")
      .ilike("reference_number", "TEST-%")
      .lt("created_at", cutoffISO);
    const expReqIds = expReqRows?.map((r: any) => r.id) ?? [];
    if (expReqIds.length > 0) {
      await safeDelete(
        "expertise_payments",
        supabase.from("expertise_payments").delete().in("expertise_request_id", expReqIds).select("id")
      );
    }
    await safeDelete(
      "real_estate_expertise_requests",
      supabase.from("real_estate_expertise_requests").delete().ilike("reference_number", "TEST-%").lt("created_at", cutoffISO).select("id")
    );

    // 7c. Parcel children (mortgages/payments/history/permits)
    if (parcelIds.length > 0) {
      const { data: mortgageRows } = await supabase
        .from("cadastral_mortgages")
        .select("id")
        .in("parcel_id", parcelIds);
      const mortgageIds = mortgageRows?.map((r: any) => r.id) ?? [];
      if (mortgageIds.length > 0) {
        await safeDelete(
          "cadastral_mortgage_payments",
          supabase.from("cadastral_mortgage_payments").delete().in("mortgage_id", mortgageIds).select("id")
        );
      }

      await safeDelete(
        "cadastral_ownership_history",
        supabase.from("cadastral_ownership_history").delete().in("parcel_id", parcelIds).select("id")
      );
      await safeDelete(
        "cadastral_tax_history",
        supabase.from("cadastral_tax_history").delete().in("parcel_id", parcelIds).select("id")
      );
      await safeDelete(
        "cadastral_boundary_history",
        supabase.from("cadastral_boundary_history").delete().in("parcel_id", parcelIds).select("id")
      );
      await safeDelete(
        "cadastral_mortgages",
        supabase.from("cadastral_mortgages").delete().in("parcel_id", parcelIds).select("id")
      );
      await safeDelete(
        "cadastral_building_permits",
        supabase.from("cadastral_building_permits").delete().in("parcel_id", parcelIds).select("id")
      );
    }

    // 8. Parcels (now safe — all FK children purged)
    await safeDelete(
      "cadastral_parcels",
      supabase.from("cadastral_parcels").delete().ilike("parcel_number", "TEST-%").lt("created_at", cutoffISO).select("id")
    );

    // 9. Independent tables
    await safeDelete(
      "cadastral_boundary_conflicts",
      supabase.from("cadastral_boundary_conflicts").delete().ilike("reporting_parcel_number", "TEST-%").lt("created_at", cutoffISO).select("id")
    );
    // Bug 12 fix: generated_certificates uses generated_at, not created_at
    await safeDelete(
      "generated_certificates",
      supabase.from("generated_certificates").delete().ilike("reference_number", "TEST-%").lt("generated_at", cutoffISO).select("id")
    );

    // Audit log
    await supabase.rpc("log_audit_action", {
      action_param: "AUTO_TEST_DATA_CLEANUP",
      table_name_param: "cadastral_contributions",
      record_id_param: null,
      old_values_param: { retention_days: retentionDays, cutoff: cutoffISO },
      new_values_param: {
        deleted: deletedCounts,
        ...(Object.keys(errors).length > 0 ? { errors } : {}),
      },
    });

    console.log("Auto-cleanup completed:", deletedCounts);
    if (Object.keys(errors).length > 0) {
      console.warn("Auto-cleanup errors:", errors);
    }

    return new Response(
      JSON.stringify({ success: true, deleted: deletedCounts, errors }),
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
