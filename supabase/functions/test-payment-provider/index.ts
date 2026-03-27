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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { provider_id, config_type } = await req.json();

    if (!provider_id || !config_type) {
      return new Response(
        JSON.stringify({ success: false, message: "provider_id et config_type requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load provider config from DB
    const { data: providerConfig, error } = await supabase
      .from("payment_methods_config")
      .select("*")
      .eq("provider_id", provider_id)
      .eq("config_type", config_type)
      .maybeSingle();

    if (error || !providerConfig) {
      return new Response(
        JSON.stringify({ success: false, message: "Fournisseur non trouvé en base de données" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!providerConfig.is_enabled) {
      return new Response(
        JSON.stringify({ success: false, message: "Ce fournisseur est désactivé" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const credentials = (providerConfig.api_credentials as Record<string, string>) || {};

    // Check that at least one credential is configured
    const hasCredentials = Object.values(credentials).some(
      (v) => typeof v === "string" && v.length > 4
    );

    if (!hasCredentials) {
      return new Response(
        JSON.stringify({ success: false, message: "Aucune clé API configurée pour ce fournisseur" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Provider-specific connectivity tests
    let testResult = { success: true, message: "Clés API configurées et fournisseur actif" };

    if (provider_id === "stripe" && credentials.secretKey) {
      try {
        const resp = await fetch("https://api.stripe.com/v1/balance", {
          headers: { Authorization: `Bearer ${credentials.secretKey}` },
        });
        const body = await resp.text();
        if (resp.ok) {
          testResult = { success: true, message: "Connexion Stripe vérifiée avec succès" };
        } else {
          testResult = { success: false, message: `Stripe: clé invalide (${resp.status})` };
        }
      } catch (e) {
        testResult = { success: false, message: "Impossible de contacter l'API Stripe" };
      }
    }

    // For other providers (airtel, orange, mpesa, flutterwave, paypal),
    // we do a basic validation since they may not have simple ping endpoints
    if (["flutterwave"].includes(provider_id) && credentials.secretKey) {
      try {
        const resp = await fetch("https://api.flutterwave.com/v3/banks/CD", {
          headers: { Authorization: `Bearer ${credentials.secretKey}` },
        });
        await resp.text();
        if (resp.ok) {
          testResult = { success: true, message: "Connexion Flutterwave vérifiée avec succès" };
        } else {
          testResult = { success: false, message: `Flutterwave: clé invalide (${resp.status})` };
        }
      } catch {
        testResult = { success: false, message: "Impossible de contacter l'API Flutterwave" };
      }
    }

    return new Response(JSON.stringify(testResult), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: err.message || "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
