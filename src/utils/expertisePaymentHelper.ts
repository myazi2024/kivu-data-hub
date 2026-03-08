import { supabase } from '@/integrations/supabase/client';
import { pollTransactionStatus } from '@/utils/pollTransactionStatus';

interface MobileMoneyPaymentParams {
  provider: string;
  phone: string;
  amountUsd: number;
  paymentType: 'expertise_fee' | 'certificate_access';
  paymentRecordId: string;
}

interface StripePaymentParams {
  paymentRecordId: string;
  paymentType: 'expertise_fee' | 'certificate_access';
  amountUsd: number;
}

/**
 * Processes a Mobile Money payment for expertise services.
 * Invokes the Edge Function, polls for completion, and updates the payment record.
 */
export async function processExpertiseMobileMoneyPayment(params: MobileMoneyPaymentParams): Promise<string> {
  const { provider, phone, amountUsd, paymentType, paymentRecordId } = params;

  const { data: paymentResult, error } = await supabase.functions.invoke(
    'process-mobile-money-payment',
    {
      body: {
        payment_provider: provider,
        phone_number: phone,
        amount_usd: amountUsd,
        payment_type: paymentType,
        invoice_id: paymentRecordId,
      },
    }
  );

  if (error) throw error;

  const txId = paymentResult?.transaction_id;
  if (txId) {
    const result = await pollTransactionStatus(txId);
    if (result === 'failed') throw new Error('Le paiement a échoué');
    if (result === 'timeout') throw new Error('Délai de paiement dépassé');
  }

  await supabase
    .from('expertise_payments')
    .update({
      status: 'completed',
      paid_at: new Date().toISOString(),
      transaction_id: txId || 'TXN-' + Date.now(),
    })
    .eq('id', paymentRecordId);

  return txId || '';
}

/**
 * Initiates a Stripe payment for expertise services.
 * Returns true if redirected (caller should stop), false otherwise.
 */
export async function processExpertiseStripePayment(params: StripePaymentParams): Promise<boolean> {
  const { paymentRecordId, paymentType, amountUsd } = params;

  const { data: stripeSession, error } = await supabase.functions.invoke('create-payment', {
    body: {
      invoice_id: paymentRecordId,
      payment_type: paymentType,
      amount_usd: amountUsd,
    },
  });

  if (error) throw error;

  if (stripeSession?.url) {
    window.location.href = stripeSession.url;
    return true; // redirected
  }

  return false;
}
