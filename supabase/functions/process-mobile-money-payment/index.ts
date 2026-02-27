import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  item_id?: string;
  items?: string[];
  payment_provider: string;
  phone_number: string;
  amount_usd: number;
  payment_type: 'publication' | 'cadastral_service' | 'expertise_fee' | 'certificate_access';
  invoice_id?: string;
  test_mode?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body: PaymentRequest = await req.json();
    const { payment_provider, phone_number, amount_usd, payment_type, invoice_id, test_mode } = body;

    // Validate payment provider is enabled
    const { data: providerConfig, error: providerError } = await supabase
      .from('payment_methods_config')
      .select('*')
      .eq('provider_id', payment_provider)
      .eq('is_enabled', true)
      .single();

    if (providerError || !providerConfig) {
      throw new Error('Payment provider not available');
    }

    // Create payment transaction record
    const { data: transaction, error: txError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: user.id,
        invoice_id: invoice_id || null,
        payment_method: 'mobile_money',
        provider: payment_provider,
        phone_number: phone_number,
        amount_usd: amount_usd,
        status: 'pending',
        metadata: {
          payment_type,
          test_mode: test_mode || false,
        }
      })
      .select()
      .single();

    if (txError) throw txError;

    // In test mode or if no real API credentials, simulate payment
    if (test_mode || !providerConfig.api_credentials?.apiKey) {
      console.log('⚠️ SIMULATION MODE - Payment will be auto-completed after 3 seconds');
      
      // Simulate async payment processing
      setTimeout(async () => {
        await supabase
          .from('payment_transactions')
          .update({ 
            status: 'completed',
            transaction_reference: `TEST-${Date.now()}`,
            metadata: {
              ...transaction.metadata,
              simulated: true,
              completed_at: new Date().toISOString()
            }
          })
          .eq('id', transaction.id);
      }, 3000);

      return new Response(
        JSON.stringify({
          success: true,
          transaction_id: transaction.id,
          status: 'pending',
          message: 'Paiement en cours de traitement (mode test)',
          test_mode: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Real payment processing with provider API
    // TODO: Integrate with real Mobile Money APIs (Airtel, Orange, M-Pesa)
    // For now, we'll simulate the payment
    try {
      // Example integration structure (to be implemented with real APIs):
      /*
      const paymentResult = await fetch(providerConfig.api_credentials.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${providerConfig.api_credentials.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: phone_number,
          amount: amount_usd,
          currency: 'USD',
          reference: transaction.id
        })
      });
      */

      // Update transaction status
      await supabase
        .from('payment_transactions')
        .update({ 
          status: 'processing',
          transaction_reference: `REAL-${Date.now()}`
        })
        .eq('id', transaction.id);

      return new Response(
        JSON.stringify({
          success: true,
          transaction_id: transaction.id,
          status: 'processing',
          message: 'Confirmez le paiement sur votre téléphone',
          test_mode: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (apiError: any) {
      // Update transaction with error
      await supabase
        .from('payment_transactions')
        .update({ 
          status: 'failed',
          error_message: apiError.message
        })
        .eq('id', transaction.id);

      throw apiError;
    }

  } catch (error: any) {
    console.error('Payment processing error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Payment processing failed',
        success: false
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
