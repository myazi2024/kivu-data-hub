import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
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

    // Helper: retrieve real Stripe fee from a payment_intent (Lot 2 — provider fees tracking)
    const fetchStripeFee = async (paymentIntentId: string | null | undefined): Promise<{ fee_usd: number; raw: any } | null> => {
      if (!paymentIntentId) return null;
      try {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge.balance_transaction'] });
        const charge: any = (pi as any).latest_charge;
        const bt: any = charge?.balance_transaction;
        if (!bt) return null;
        // Stripe fee is in the smallest unit of bt.currency. We assume USD reporting; convert cents → USD.
        const fee_usd = Number(bt.fee || 0) / 100;
        return {
          fee_usd,
          raw: {
            source: 'stripe_balance_transaction',
            currency: bt.currency,
            fee: bt.fee,
            fee_details: bt.fee_details || [],
            net: bt.net,
            balance_transaction_id: bt.id,
            retrieved_at: new Date().toISOString(),
          },
        };
      } catch (err) {
        console.error('fetchStripeFee error:', err);
        return null;
      }
    };

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const paymentType = metadata.payment_type;

        // Retrieve real provider fee once per session (used by all branches)
        const feeInfo = await fetchStripeFee(session.payment_intent as string | null);
        const feeUpdate = feeInfo
          ? {
              provider_fee_usd: feeInfo.fee_usd,
              provider_fee_currency: 'USD',
              provider_fee_raw: feeInfo.raw,
            }
          : {};

        if (paymentType === "cadastral_service" && metadata.invoice_id) {
          await supabase
            .from("payment_transactions")
            .update({
              status: "completed",
              transaction_reference: session.payment_intent as string,
              ...feeUpdate,
              metadata: { stripe_session_id: session.id, completed_at: new Date().toISOString() }
            })
            .eq("transaction_reference", session.id);

          await supabase
            .from("cadastral_invoices")
            .update({
              status: "paid",
              updated_at: new Date().toISOString()
            })
            .eq("id", metadata.invoice_id);

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
              expires_at: null
            }));

            await supabase
              .from("cadastral_service_access")
              .insert(accessRecords);
          }

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
          let expertisePaymentId = metadata.expertise_payment_id as string | undefined;
          let expertiseRequestId: string | null = null;
          let expertiseUserId: string | null = metadata.user_id || null;

          if (!expertisePaymentId) {
            const { data: paymentBySession } = await supabase
              .from("expertise_payments")
              .select("id, expertise_request_id, user_id")
              .eq("transaction_id", session.id)
              .maybeSingle();

            if (paymentBySession) {
              expertisePaymentId = paymentBySession.id;
              expertiseRequestId = paymentBySession.expertise_request_id;
              expertiseUserId = expertiseUserId || paymentBySession.user_id;
            }
          }

          if (expertisePaymentId) {
            await supabase
              .from("expertise_payments")
              .update({
                status: "completed",
                paid_at: new Date().toISOString(),
                transaction_id: session.id,
              })
              .eq("id", expertisePaymentId);

            if (!expertiseRequestId) {
              const { data: expertisePayment } = await supabase
                .from("expertise_payments")
                .select("expertise_request_id, user_id")
                .eq("id", expertisePaymentId)
                .single();

              expertiseRequestId = expertisePayment?.expertise_request_id || null;
              expertiseUserId = expertiseUserId || expertisePayment?.user_id || null;
            }

            if (expertiseRequestId && paymentType === "expertise_fee") {
              await supabase
                .from("real_estate_expertise_requests")
                .update({ payment_status: "paid", updated_at: new Date().toISOString() })
                .eq("id", expertiseRequestId);
            }

            if (expertiseUserId) {
              const notifMessage = paymentType === "certificate_access"
                ? "Votre paiement pour l'accès au certificat d'expertise a été confirmé."
                : "Votre paiement pour la demande d'expertise immobilière a été confirmé.";

              await supabase.from("notifications").insert({
                user_id: expertiseUserId,
                type: "success",
                title: "Paiement expertise confirmé",
                message: notifMessage,
                action_url: "/cadastral-map"
              });
            }
          }
        } else if (paymentType === "mutation_request") {
          const mutationRequestId = (metadata.mutation_request_id || metadata.invoice_id) as string | undefined;

          const { data: mutationTx } = await supabase
            .from("payment_transactions")
            .update({
              status: "completed",
              transaction_reference: session.id,
              ...feeUpdate,
              metadata: {
                stripe_session_id: session.id,
                completed_at: new Date().toISOString(),
                payment_type: "mutation_request",
                mutation_request_id: mutationRequestId || null,
              },
            })
            .eq("transaction_reference", session.id)
            .select("id, invoice_id")
            .maybeSingle();

          const targetRequestId = mutationRequestId || mutationTx?.invoice_id || null;

          if (targetRequestId) {
            await supabase
              .from("mutation_requests")
              .update({
                payment_status: "paid",
                status: "in_review",
                paid_at: new Date().toISOString(),
                payment_id: mutationTx?.id || null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", targetRequestId);
          }

          if (metadata.user_id) {
            await supabase.from("notifications").insert({
              user_id: metadata.user_id,
              type: "success",
              title: "Paiement mutation confirmé",
              message: "Votre paiement de mutation a été confirmé et la demande est en cours d'examen.",
              action_url: "/mon-compte?tab=mutations",
            });
          }
        } else if (paymentType === "land_title_request" || paymentType === "permit_request" || paymentType === "mortgage_cancellation") {
          // Generic handler for cadastral service payment types
          await supabase
            .from("payment_transactions")
            .update({
              status: "completed",
              transaction_reference: session.payment_intent as string,
              ...feeUpdate,
              metadata: {
                stripe_session_id: session.id,
                completed_at: new Date().toISOString(),
                payment_type: paymentType,
              },
            })
            .eq("transaction_reference", session.id);

          // Update the corresponding request table
          if (paymentType === "land_title_request" && (metadata.land_title_request_id || metadata.invoice_id)) {
            const requestId = metadata.land_title_request_id || metadata.invoice_id;
            await supabase
              .from("land_title_requests")
              .update({
                payment_status: "paid",
                status: "in_review",
                paid_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", requestId);
          }

          if (metadata.user_id) {
            const typeLabels: Record<string, string> = {
              land_title_request: "titre foncier",
              permit_request: "autorisation de bâtir",
              mortgage_cancellation: "mainlevée hypothécaire",
            };
            await supabase.from("notifications").insert({
              user_id: metadata.user_id,
              type: "success",
              title: "Paiement confirmé",
              message: `Votre paiement pour la demande de ${typeLabels[paymentType] || paymentType} a été confirmé.`,
              action_url: "/mon-compte",
            });
          }
        } else if (paymentType === "publications") {
          await supabase
            .from("orders")
            .update({
              status: "completed",
              updated_at: new Date().toISOString()
            })
            .eq("stripe_session_id", session.id);

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

        let expertisePaymentId = metadata.expertise_payment_id as string | undefined;

        if (!expertisePaymentId && session?.id) {
          const { data: paymentBySession } = await supabase
            .from("expertise_payments")
            .select("id")
            .eq("transaction_id", session.id)
            .maybeSingle();

          expertisePaymentId = paymentBySession?.id;
        }

        if (expertisePaymentId) {
          await supabase
            .from("expertise_payments")
            .update({ status: "failed" })
            .eq("id", expertisePaymentId);
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
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 400,
    });
  }
});
