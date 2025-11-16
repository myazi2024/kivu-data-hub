import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CartItem {
  id: string;
  title: string;
  price: number; // in USD
  cover_image_url?: string;
}

interface PaymentRequest {
  items: CartItem[];
  email?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user (REQUIRED now)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authentication required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Invalid authentication token");
    }

    // Parse request - only get item IDs, not prices
    const { items: itemIds }: { items: string[] } = await req.json();
    
    if (!itemIds || itemIds.length === 0) {
      throw new Error("Cart is empty");
    }

    // SECURITY: Fetch real prices from database, not from client
    const { data: publications, error: pubError } = await supabaseClient
      .from("publications")
      .select("id, title, price_usd, cover_image_url, status")
      .in("id", itemIds)
      .eq("status", "published");

    if (pubError || !publications || publications.length === 0) {
      throw new Error("Invalid items in cart");
    }

    // Rate limiting: Check recent payment attempts
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count: recentAttempts } = await supabaseService
      .from("rate_limit_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("endpoint", "create-payment")
      .gte("created_at", oneHourAgo);

    if (recentAttempts && recentAttempts >= 10) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    // Log this attempt
    await supabaseService.from("rate_limit_attempts").insert({
      user_id: user.id,
      endpoint: "create-payment",
      ip_address: req.headers.get("x-forwarded-for") || null,
    });

    // Build items with server-side prices
    const items: CartItem[] = publications.map(pub => ({
      id: pub.id,
      title: pub.title,
      price: pub.price_usd,
      cover_image_url: pub.cover_image_url || undefined,
    }));

    // Determine email for the order
    const orderEmail = user.email || "guest@bic-goma.com";

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Calculate total amount in cents
    const totalAmount = Math.round(items.reduce((sum, item) => sum + item.price, 0) * 100);

    // Check if customer exists for authenticated users
    let customerId;
    if (user?.email) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    // Create line items for Stripe
    const lineItems = items.map(item => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.title,
          images: item.cover_image_url ? [item.cover_image_url] : [],
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: 1,
    }));

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : orderEmail,
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/publications?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/publications?payment=cancelled`,
      metadata: {
        user_id: user?.id || "guest",
        email: orderEmail,
      },
    });

    // Store order in database (supabaseService already created above)
    const { error: orderError } = await supabaseService.from("orders").insert({
      user_id: user?.id || null,
      email: orderEmail,
      stripe_session_id: session.id,
      amount: totalAmount,
      status: "pending",
      items: items,
    });

    if (orderError) {
      console.error("Error creating order:", orderError);
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