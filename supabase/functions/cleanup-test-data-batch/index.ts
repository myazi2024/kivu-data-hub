import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STEPS = [
  "permit_payments",
  "permit_admin_actions",
  "fraud_attempts",
  "contributor_codes",
  "service_access",
  "payment_transactions",
  "invoices",
  "contributions",
  "mutation_requests",
  "subdivision_requests",
  "land_disputes",
  "expertise_payments",
  "expertise_requests",
  "land_title_requests",
  "ownership_history",
  "tax_history",
  "boundary_history",
  "mortgage_payments",
  "mortgages",
  "building_permits",
  "parcels",
  "generated_certificates",
  "boundary_conflicts",
];

const BATCH = 500;
const MAX_ITERATIONS_PER_STEP = 200; // safety: 200 * 500 = 100k rows per step

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate caller JWT and admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Invalid JWT" }, 401);
    }
    const callerId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    // Check admin or super_admin role via user_roles
    const { data: roles, error: rolesErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .in("role", ["admin", "super_admin"]);
    if (rolesErr) {
      console.error("roles check failed", rolesErr);
      return json({ error: "Role check failed" }, 500);
    }
    if (!roles || roles.length === 0) {
      return json({ error: "Forbidden: admin role required" }, 403);
    }

    const summary: Record<string, number> = {};
    let total = 0;

    for (const step of STEPS) {
      let stepTotal = 0;
      for (let i = 0; i < MAX_ITERATIONS_PER_STEP; i++) {
        const { data, error } = await admin.rpc(
          "_cleanup_test_data_chunk_internal",
          { p_step: step, p_limit: BATCH },
        );
        if (error) {
          console.error(`Step ${step} failed:`, error);
          // Return 200 with ok:false so frontend can display the failed step name
          // instead of a generic "non-2xx" error.
          return json({
            ok: false,
            failed_step: step,
            error: error.message,
            partial_summary: summary,
            partial_total: total,
          });
        }
        const deleted = (data as number) ?? 0;
        stepTotal += deleted;
        if (deleted === 0) break;
      }
      summary[step] = stepTotal;
      total += stepTotal;
    }

    // Audit log
    await admin.from("audit_logs").insert({
      action: "MANUAL_TEST_DATA_CLEANUP_BATCHED",
      table_name: "cadastral_parcels",
      user_id: callerId,
      new_values: { total_deleted: total, per_step: summary },
    });

    return json({ ok: true, success: true, total_deleted: total, per_step: summary });
  } catch (e) {
    console.error("Unhandled error:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
