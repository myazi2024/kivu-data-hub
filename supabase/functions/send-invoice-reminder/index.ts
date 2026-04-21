import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { invoice_id, reminder_number } = await req.json();
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: 'invoice_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: invoice, error } = await supabase
      .from('cadastral_invoices')
      .select('invoice_number, client_email, client_name, total_amount_usd, parcel_number, status')
      .eq('id', invoice_id)
      .single();
    if (error || !invoice) throw new Error('Invoice not found');
    if (invoice.status !== 'pending') throw new Error('Invoice not pending');

    // TODO: Wire to actual email provider. Currently logs only.
    console.log(`[REMINDER #${reminder_number}] To: ${invoice.client_email} | Invoice ${invoice.invoice_number} | $${invoice.total_amount_usd}`);

    return new Response(JSON.stringify({ ok: true, queued: true, recipient: invoice.client_email }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('send-invoice-reminder error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
