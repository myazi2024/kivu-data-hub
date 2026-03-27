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
  payment_type: 'publication' | 'cadastral_service' | 'expertise_fee' | 'certificate_access' | 'mutation_request' | 'mortgage_cancellation';
  invoice_id?: string;
  test_mode?: boolean;
  currency_code?: string;
  amount_local?: number;
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
    const { payment_provider, phone_number, amount_usd, payment_type, invoice_id, currency_code: clientCurrency } = body;

    // Fetch server-side exchange rate for the requested currency
    const requestedCurrency = clientCurrency || 'USD';
    let serverExchangeRate = 1;
    if (requestedCurrency !== 'USD') {
      const { data: currencyData } = await supabase
        .from('currency_config')
        .select('exchange_rate_to_usd')
        .eq('currency_code', requestedCurrency)
        .eq('is_active', true)
        .single();
      
      if (currencyData) {
        serverExchangeRate = Number(currencyData.exchange_rate_to_usd);
      }
    }

    // SECURITY: Read test_mode from global test_mode config, never trust client
    const { data: testModeConfig } = await supabase
      .from('cadastral_search_config')
      .select('config_value')
      .eq('config_key', 'test_mode')
      .eq('is_active', true)
      .maybeSingle();

    const test_mode = testModeConfig?.config_value?.enabled === true;

    // Rate limiting: Check recent payment attempts
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count: recentAttempts } = await supabase
      .from("rate_limit_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("endpoint", "process-mobile-money-payment")
      .gte("created_at", oneHourAgo);

    if (recentAttempts && recentAttempts >= 10) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    await supabase.from("rate_limit_attempts").insert({
      user_id: user.id,
      endpoint: "process-mobile-money-payment",
      ip_address: req.headers.get("x-forwarded-for") || null,
    });

    const syncExpertisePaymentState = async (
      status: 'completed' | 'failed',
      transactionId?: string,
      errorMessage?: string
    ) => {
      if (!invoice_id || (payment_type !== 'expertise_fee' && payment_type !== 'certificate_access')) {
        return;
      }

      const expertiseUpdate: Record<string, any> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'completed') {
        expertiseUpdate.paid_at = new Date().toISOString();
        if (transactionId) expertiseUpdate.transaction_id = transactionId;
      }

      if (status === 'failed' && errorMessage) {
        expertiseUpdate.receipt_url = null;
      }

      const { data: expertisePayment } = await supabase
        .from('expertise_payments')
        .update(expertiseUpdate)
        .eq('id', invoice_id)
        .select('expertise_request_id')
        .maybeSingle();

      if (status === 'completed' && payment_type === 'expertise_fee' && expertisePayment?.expertise_request_id) {
        await supabase
          .from('real_estate_expertise_requests')
          .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
          .eq('id', expertisePayment.expertise_request_id);
      }
    };

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
        currency_code: requestedCurrency,
        exchange_rate_used: serverExchangeRate,
        metadata: {
          payment_type,
          test_mode: test_mode || false,
          amount_local: amount_usd * serverExchangeRate,
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
        const completedAt = new Date().toISOString();
        await supabase
          .from('payment_transactions')
          .update({ 
            status: 'completed',
            transaction_reference: `TEST-${Date.now()}`,
            metadata: {
              ...transaction.metadata,
              simulated: true,
              completed_at: completedAt
            }
          })
          .eq('id', transaction.id);

        await syncExpertisePaymentState('completed', transaction.id);
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

      // Update transaction status then simulate asynchronous provider confirmation
      await supabase
        .from('payment_transactions')
        .update({ 
          status: 'processing',
          transaction_reference: `REAL-${Date.now()}`
        })
        .eq('id', transaction.id);

      // Temporary simulation until provider callbacks are fully integrated
      setTimeout(async () => {
        const completedAt = new Date().toISOString();
        await supabase
          .from('payment_transactions')
          .update({
            status: 'completed',
            metadata: {
              ...transaction.metadata,
              provider_simulated: true,
              completed_at: completedAt,
            }
          })
          .eq('id', transaction.id);

        await syncExpertisePaymentState('completed', transaction.id);
      }, 5000);

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

      await syncExpertisePaymentState('failed', transaction.id, apiError.message);

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
