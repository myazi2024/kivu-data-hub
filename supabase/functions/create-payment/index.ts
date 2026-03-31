import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PaymentRequest {
  items?: string[];
  invoice_id?: string;
  payment_type: 'publications' | 'cadastral_service' | 'expertise_fee' | 'certificate_access' | 'mutation_request' | 'permit_request' | 'mortgage_cancellation' | 'land_title_request';
  amount_usd?: number;
}

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
      throw new Error("Authentication required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Invalid authentication token");
    }

    // Parse & validate request body
    const body: PaymentRequest = await req.json();
    const { items: itemIds, invoice_id, payment_type, amount_usd } = body;

    if (!payment_type) {
      throw new Error("payment_type is required");
    }

    let lineItems: any[] = [];
    let totalAmount = 0;
    let orderMetadata: any = {
      user_id: user.id,
      email: user.email || "",
      payment_type,
    };

    // Handle Publications payment
    if (payment_type === 'publications' && itemIds && itemIds.length > 0) {
      const { data: publications, error: pubError } = await supabase
        .from("publications")
        .select("id, title, price_usd, cover_image_url, status")
        .in("id", itemIds)
        .eq("status", "published");

      if (pubError || !publications || publications.length === 0) {
        throw new Error("Invalid items in cart");
      }

      lineItems = publications.map(pub => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: pub.title,
            images: pub.cover_image_url ? [pub.cover_image_url] : [],
          },
          unit_amount: Math.round(pub.price_usd * 100),
        },
        quantity: 1,
      }));

      totalAmount = Math.round(publications.reduce((sum, pub) => sum + pub.price_usd, 0) * 100);
    }
    // Handle Cadastral Service payment
    else if (payment_type === 'cadastral_service' && invoice_id && amount_usd) {
      const { data: invoice, error: invoiceError } = await supabase
        .from("cadastral_invoices")
        .select("*")
        .eq("id", invoice_id)
        .eq("user_id", user.id)
        .single();

      if (invoiceError || !invoice) {
        throw new Error("Invalid invoice");
      }

      lineItems = [{
        price_data: {
          currency: "usd",
          product_data: {
            name: `Facture Cadastrale ${invoice.invoice_number}`,
            description: `Services cadastraux pour parcelle ${invoice.parcel_number}`,
          },
          unit_amount: Math.round(invoice.total_amount_usd * 100),
        },
        quantity: 1,
      }];

      totalAmount = Math.round(invoice.total_amount_usd * 100);
      orderMetadata.invoice_id = invoice_id;
      orderMetadata.parcel_number = invoice.parcel_number;
    }
    // Handle Expertise Fee / Certificate Access payment
    else if ((payment_type === 'expertise_fee' || payment_type === 'certificate_access') && invoice_id && amount_usd) {
      const { data: expertisePayment, error: epError } = await supabase
        .from("expertise_payments")
        .select("*")
        .eq("id", invoice_id)
        .eq("user_id", user.id)
        .single();

      if (epError || !expertisePayment) {
        throw new Error("Invalid expertise payment record");
      }

      const label = payment_type === 'certificate_access'
        ? "Accès au certificat d'expertise immobilière"
        : "Frais d'expertise immobilière";

      lineItems = [{
        price_data: {
          currency: "usd",
          product_data: {
            name: label,
            description: `Paiement expertise immobilière`,
          },
          unit_amount: Math.round(expertisePayment.total_amount_usd * 100),
        },
        quantity: 1,
      }];

      totalAmount = Math.round(expertisePayment.total_amount_usd * 100);
      orderMetadata.expertise_payment_id = invoice_id;
    }
    else if (payment_type === 'mutation_request' && invoice_id && amount_usd) {
      const { data: mutationRequest, error: mutationError } = await supabase
        .from("mutation_requests")
        .select("id, reference_number, parcel_number, total_amount_usd, user_id")
        .eq("id", invoice_id)
        .eq("user_id", user.id)
        .single();

      if (mutationError || !mutationRequest) {
        throw new Error("Invalid mutation request");
      }

      lineItems = [{
        price_data: {
          currency: "usd",
          product_data: {
            name: `Demande de mutation ${mutationRequest.reference_number}`,
            description: `Paiement mutation parcelle ${mutationRequest.parcel_number}`,
          },
          unit_amount: Math.round(Number(mutationRequest.total_amount_usd) * 100),
        },
        quantity: 1,
      }];

      totalAmount = Math.round(Number(mutationRequest.total_amount_usd) * 100);
      orderMetadata.mutation_request_id = invoice_id;
      orderMetadata.invoice_id = invoice_id;
      orderMetadata.parcel_number = mutationRequest.parcel_number;
    }
    else {
      throw new Error("Invalid payment request: missing items or invoice_id");
    }

    // Rate limiting
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count: recentAttempts } = await supabase
      .from("rate_limit_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("endpoint", "create-payment")
      .gte("created_at", oneHourAgo);

    if (recentAttempts && recentAttempts >= 10) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    await supabase.from("rate_limit_attempts").insert({
      user_id: user.id,
      endpoint: "create-payment",
      ip_address: req.headers.get("x-forwarded-for") || null,
    });

    // Validate Stripe is enabled
    const { data: stripeConfig, error: stripeConfigError } = await supabase
      .from('payment_methods_config')
      .select('*')
      .eq('provider_id', 'stripe')
      .eq('config_type', 'bank_card')
      .eq('is_enabled', true)
      .single();

    if (stripeConfigError || !stripeConfig) {
      throw new Error("Stripe payment method is not available");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists
    let customerId;
    if (user.email) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    // Build URLs
    const origin = req.headers.get("origin") || "";
    let successUrl: string;
    let cancelUrl: string;

    if (payment_type === 'expertise_fee' || payment_type === 'certificate_access' || payment_type === 'mutation_request') {
      successUrl = `${origin}/cadastral-map?payment=success&type=${payment_type}&session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `${origin}/cadastral-map?payment=cancelled`;
    } else if (payment_type === 'cadastral_service') {
      successUrl = `${origin}/services?payment=success&session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `${origin}/services?payment=cancelled`;
    } else {
      successUrl = `${origin}/publications?payment=success&session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `${origin}/publications?payment=cancelled`;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email || undefined,
      line_items: lineItems,
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: orderMetadata,
    });

    // Store order/transaction
    if (payment_type === 'publications') {
      await supabase.from("orders").insert({
        user_id: user.id,
        email: user.email || "",
        stripe_session_id: session.id,
        amount: totalAmount,
        status: "pending",
        items: lineItems.map((item, idx) => ({
          id: itemIds![idx],
          title: item.price_data.product_data.name,
          price: item.price_data.unit_amount / 100,
        })),
      });
    } else if (payment_type === 'cadastral_service' && invoice_id) {
      await supabase.from("payment_transactions").insert({
        user_id: user.id,
        invoice_id,
        payment_method: 'bank_card',
        provider: 'stripe',
        amount_usd: amount_usd!,
        status: 'pending',
        transaction_reference: session.id,
        metadata: { stripe_session_id: session.id },
      });

      await supabase.from("cadastral_invoices").update({
        payment_method: 'stripe',
        status: 'processing',
      }).eq('id', invoice_id);
    } else if ((payment_type === 'expertise_fee' || payment_type === 'certificate_access') && invoice_id) {
      await supabase.from("expertise_payments").update({
        transaction_id: session.id,
        payment_method: 'bank_card',
        payment_provider: 'stripe',
      }).eq('id', invoice_id);
    } else if (payment_type === 'mutation_request' && invoice_id) {
      await supabase.from("payment_transactions").insert({
        user_id: user.id,
        invoice_id,
        payment_method: 'bank_card',
        provider: 'stripe',
        amount_usd: amount_usd!,
        status: 'pending',
        transaction_reference: session.id,
        metadata: {
          stripe_session_id: session.id,
          payment_type: 'mutation_request',
          mutation_request_id: invoice_id,
        },
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
