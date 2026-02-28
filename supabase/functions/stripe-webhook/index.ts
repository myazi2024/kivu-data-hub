import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response(JSON.stringify({ error: "Missing signature or webhook secret" }), {
      status: 400,
    });
  }

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const paymentType = metadata.payment_type;

        if (paymentType === "cadastral_service" && metadata.invoice_id) {
          // Mettre à jour la transaction de paiement
          await supabase
            .from("payment_transactions")
            .update({
              status: "completed",
              transaction_reference: session.payment_intent as string,
              metadata: { stripe_session_id: session.id, completed_at: new Date().toISOString() }
            })
            .eq("transaction_reference", session.id);

          // Mettre à jour la facture cadastrale
          await supabase
            .from("cadastral_invoices")
            .update({
              status: "paid",
              payment_id: session.id,
              updated_at: new Date().toISOString()
            })
            .eq("id", metadata.invoice_id);

          // Créer les accès aux services
          const { data: invoice } = await supabase
            .from("cadastral_invoices")
            .select("selected_services, parcel_number, user_id")
            .eq("id", metadata.invoice_id)
            .single();

          if (invoice && invoice.selected_services) {
            const services = Array.isArray(invoice.selected_services) 
              ? invoice.selected_services 
              : JSON.parse(invoice.selected_services as any);

            const accessRecords = services.map((serviceId: string) => ({
              user_id: invoice.user_id,
              invoice_id: metadata.invoice_id,
              parcel_number: invoice.parcel_number,
              service_type: serviceId,
              expires_at: null // Accès permanent par défaut
            }));

            await supabase
              .from("cadastral_service_access")
              .insert(accessRecords);
          }

          // Créer une notification
          if (metadata.user_id) {
            await supabase.from("notifications").insert({
              user_id: metadata.user_id,
              type: "success",
              title: "Paiement confirmé",
              message: `Votre paiement de ${(session.amount_total! / 100).toFixed(2)} USD a été confirmé. Vos services sont maintenant accessibles.`,
              action_url: "/services"
            });
          }
        } else if (paymentType === "expertise_fee" || paymentType === "certificate_access") {
          // Handle expertise fee or certificate access payment
          const expertisePaymentId = metadata.expertise_payment_id;
          if (expertisePaymentId) {
            // Update expertise_payments record
            await supabase
              .from("expertise_payments")
              .update({
                status: "completed",
                paid_at: new Date().toISOString(),
                transaction_id: session.payment_intent as string,
              })
              .eq("id", expertisePaymentId);

            // Get the expertise request ID from the payment record
            const { data: expertisePayment } = await supabase
              .from("expertise_payments")
              .select("expertise_request_id")
              .eq("id", expertisePaymentId)
              .single();

            if (expertisePayment?.expertise_request_id) {
              // Update payment_status on the expertise request
              await supabase
                .from("real_estate_expertise_requests")
                .update({ payment_status: "paid", updated_at: new Date().toISOString() })
                .eq("id", expertisePayment.expertise_request_id);
            }

            // Notification
            if (metadata.user_id) {
              const notifMessage = paymentType === "certificate_access"
                ? "Votre paiement pour l'accès au certificat d'expertise a été confirmé."
                : "Votre paiement pour la demande d'expertise immobilière a été confirmé.";
              await supabase.from("notifications").insert({
                user_id: metadata.user_id,
                type: "success",
                title: "Paiement expertise confirmé",
                message: notifMessage,
                action_url: "/cadastral-map"
              });
            }
          }
        } else if (paymentType === "publications") {
          // Mettre à jour la commande
          await supabase
            .from("orders")
            .update({
              status: "completed",
              updated_at: new Date().toISOString()
            })
            .eq("stripe_session_id", session.id);

          // Créer les accès de téléchargement
          const { data: order } = await supabase
            .from("orders")
            .select("items, user_id")
            .eq("stripe_session_id", session.id)
            .single();

          if (order && order.items) {
            const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items as any);
            
            for (const item of items) {
              await supabase.from("publication_downloads").insert({
                user_id: order.user_id,
                publication_id: item.id,
                payment_id: session.id
              });
            }
          }

          // Notification pour l'utilisateur
          if (metadata.user_id) {
            await supabase.from("notifications").insert({
              user_id: metadata.user_id,
              type: "success",
              title: "Achat confirmé",
              message: `Vos publications sont maintenant disponibles au téléchargement.`,
              action_url: "/publications"
            });
          }
        }
        break;
      }

      case "checkout.session.expired":
      case "payment_intent.payment_failed": {
        const session = event.data.object as any;
        const metadata = session.metadata || {};

        if (metadata.expertise_payment_id) {
          // Handle expertise payment failure
          await supabase
            .from("expertise_payments")
            .update({ status: "failed" })
            .eq("id", metadata.expertise_payment_id);
        } else if (metadata.invoice_id) {
          await supabase
            .from("payment_transactions")
            .update({ status: "failed", error_message: "Payment failed or expired" })
            .eq("transaction_reference", session.id);

          await supabase
            .from("cadastral_invoices")
            .update({ status: "failed" })
            .eq("id", metadata.invoice_id);
        } else {
          await supabase
            .from("orders")
            .update({ status: "failed" })
            .eq("stripe_session_id", session.id);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }
});
