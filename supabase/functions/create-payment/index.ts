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
    const { items, email }: PaymentRequest = await req.json();
    
    if (!items || items.length === 0) {
      throw new Error("Cart is empty");
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user (optional for guest purchases)
    let user = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      user = data.user;
    }

    // Determine email for the order
    const orderEmail = user?.email || email || "guest@bic-goma.com";

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

    // Store order in database using service role
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

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