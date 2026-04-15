import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_STATUSES = ["completed", "failed", "cancelled"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Authenticate user via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role
    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"]);

    if (roleError || !roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate request body
    const { paymentId, newStatus } = await req.json();

    if (!paymentId || typeof paymentId !== "string") {
      return new Response(JSON.stringify({ error: "paymentId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
      return new Response(
        JSON.stringify({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify payment exists and is pending
    const { data: payment, error: fetchError } = await supabase
      .from("payments")
      .select("id, status")
      .eq("id", paymentId)
      .single();

    if (fetchError || !payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payment.status !== "pending") {
      return new Response(
        JSON.stringify({ error: `Cannot update payment with status '${payment.status}'` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update payment status using service role
    const { error: updateError } = await supabase
      .from("payments")
      .update({ status: newStatus })
      .eq("id", paymentId);

    if (updateError) {
      throw updateError;
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "PAYMENT_STATUS_UPDATED",
      table_name: "payments",
      record_id: paymentId,
      old_values: { status: payment.status },
      new_values: { status: newStatus },
    });

    return new Response(
      JSON.stringify({ success: true, paymentId, newStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error updating payment status:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
