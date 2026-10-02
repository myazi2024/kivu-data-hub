import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getAdminUserId, isCronCaller, forbidden } from '../_shared/internalAuth.ts';
import { enforceRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const rl = await enforceRateLimit(req, 'email.invoice_reminder');
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    if (!(await isCronCaller(req, supabase)) && !(await getAdminUserId(req, supabase))) {
      return forbidden(corsHeaders);
    }

    const { invoice_id, reminder_number } = await req.json();
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: 'invoice_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: invoice, error } = await supabase
      .from('cadastral_invoices')
      .select('invoice_number, client_email, client_name, total_amount_usd, parcel_number, status')
      .eq('id', invoice_id)
      .single();
    if (error || !invoice) throw new Error('Invoice not found');
    if (invoice.status !== 'pending') throw new Error('Invoice not pending');

    // TODO: Wire to actual email provider. Currently logs only.
    console.log(`[REMINDER #${Number(reminder_number) || 1}] queued for invoice ${String(invoice_id).slice(0, 8)}`);

    return new Response(JSON.stringify({ ok: true, queued: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('send-invoice-reminder error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
