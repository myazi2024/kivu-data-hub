import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Records a simulated (TEST) payment transaction server-side.
// Clients can no longer insert into payment_transactions directly.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = await enforceRateLimit(req, "payment.create");
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Non autorisé" }, 401);
    const userId = userData.user.id;

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: cfg } = await admin
      .from("cadastral_search_config")
      .select("config_value")
      .eq("config_key", "test_mode")
      .eq("is_active", true)
      .maybeSingle();
    if (!(cfg?.config_value as { enabled?: boolean } | null)?.enabled) {
      return json({ error: "Mode test inactif" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const kind = body?.kind;
    let invoiceId: string | null = null;
    let amount = 0;
    let reference: string;

    if (kind === "cadastral_invoice") {
      invoiceId = typeof body.invoice_id === "string" ? body.invoice_id : null;
      if (!invoiceId) return json({ error: "invoice_id requis" }, 400);
      const { data: inv } = await admin
        .from("cadastral_invoices")
        .select("id, user_id")
        .eq("id", invoiceId)
        .maybeSingle();
      if (!inv || inv.user_id !== userId) return json({ error: "Facture introuvable" }, 404);
      reference = `TEST-${Date.now()}`;
    } else if (kind === "permit_request") {
      const n = Number(body.amount_usd);
      if (!Number.isFinite(n) || n < 0 || n > 100000) return json({ error: "Montant invalide" }, 400);
      amount = n;
      reference = `TEST-PERMIT-${Date.now()}`;
    } else {
      return json({ error: "Type inconnu" }, 400);
    }

    const { data: txn, error } = await admin
      .from("payment_transactions")
      .insert({
        user_id: userId,
        invoice_id: invoiceId,
        payment_method: "TEST",
        provider: "TEST_SIMULATION",
        phone_number: "0000000000",
        amount_usd: amount,
        currency_code: "USD",
        status: "completed",
        transaction_reference: reference,
      })
      .select("id")
      .single();
    if (error) throw error;

    return json({ transaction_id: txn.id });
  } catch (e) {
    console.error("record-test-payment error", e);
    return json({ error: "Erreur serveur" }, 500);
  }
});
