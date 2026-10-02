import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getAdminUserId, isCronCaller, forbidden } from '../_shared/internalAuth.ts';
import { enforceRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const rl = await enforceRateLimit(req, 'payment.refund');
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const adminId = await getAdminUserId(req, supabase);
    if (!adminId) return forbidden(corsHeaders);

    const { refund_id } = await req.json();
    if (!refund_id) {
      return new Response(JSON.stringify({ error: 'refund_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: refund, error: fetchErr } = await supabase
      .from('payment_refunds')
      .select('*')
      .eq('id', refund_id)
      .single();
    if (fetchErr || !refund) throw new Error('Refund not found');
    if (refund.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Ce remboursement a déjà été traité.' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark as processing (garde de statut)
    await supabase.from('payment_refunds').update({ status: 'processing' }).eq('id', refund_id).eq('status', 'pending');

    // TODO: route to provider (stripe/mobile money) based on refund.provider
    // Currently a stub — admins finalize manually until PSP secrets are added.
    const stubResponse = {
      provider: refund.provider,
      stub: true,
      message: 'PSP integration pending — refund logged in DB only',
    };

    await supabase.from('payment_refunds').update({
      status: 'pending',
      provider_response: stubResponse,
      notes: 'En attente intégration PSP (Stripe/Mobile Money)',
    }).eq('id', refund_id);

    return new Response(JSON.stringify({ ok: true, stub: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('process-refund error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
