import { supabase } from '@/integrations/supabase/client';
import { pollTransactionStatus } from '@/utils/pollTransactionStatus';

export type ExpertisePaymentKind = 'expertise_fee' | 'certificate_access';
export type ExpertisePaymentMethod = 'mobile_money' | 'bank_card';

export interface ExpertisePaymentRecord {
  id: string;
  total_amount_usd: number;
}

/**
 * Crée (ou réutilise) la ligne de paiement côté serveur. Le montant est lu par
 * le serveur sur la demande (frais d'expertise) ou dans la grille (accès au
 * certificat) : le navigateur ne fournit jamais de montant.
 */
export async function createExpertisePayment(params: {
  requestId: string;
  kind: ExpertisePaymentKind;
  method: ExpertisePaymentMethod;
  provider?: string;
  phone?: string;
}): Promise<ExpertisePaymentRecord> {
  const { data, error } = await (supabase as any).rpc('create_expertise_payment', {
    p_request_id: params.requestId,
    p_kind: params.kind,
    p_method: params.method,
    p_provider: params.method === 'mobile_money' ? params.provider ?? null : null,
    p_phone: params.method === 'mobile_money' ? params.phone ?? null : null,
  });
  if (error) throw new Error(error.message || 'Impossible de préparer le paiement');
  const raw = data as { id?: string; total_amount_usd?: number } | null;
  if (!raw?.id) throw new Error('Impossible de préparer le paiement');
  return { id: raw.id, total_amount_usd: Number(raw.total_amount_usd) || 0 };
}

/**
 * Paiement Mobile Money : l'Edge Function vérifie le montant enregistré et
 * confirme elle-même le statut. Le navigateur se contente d'attendre le résultat.
 */
export async function processExpertiseMobileMoneyPayment(params: {
  provider: string;
  phone: string;
  payment: ExpertisePaymentRecord;
  paymentType: ExpertisePaymentKind;
}): Promise<string> {
  const { provider, phone, payment, paymentType } = params;

  const { data: paymentResult, error } = await supabase.functions.invoke(
    'process-mobile-money-payment',
    {
      body: {
        payment_provider: provider,
        phone_number: phone,
        amount_usd: payment.total_amount_usd,
        payment_type: paymentType,
        invoice_id: payment.id,
      },
    },
  );

  if (error) throw error;

  const txId: string | undefined = paymentResult?.transaction_id;
  if (txId) {
    const result = await pollTransactionStatus(txId);
    if (result === 'failed') throw new Error('Le paiement a échoué');
    if (result === 'timeout') throw new Error('Délai de paiement dépassé');
  }

  return txId || '';
}

/**
 * Paiement par carte (Stripe). Retourne true si l'utilisateur a été redirigé.
 */
export async function processExpertiseStripePayment(params: {
  payment: ExpertisePaymentRecord;
  paymentType: ExpertisePaymentKind;
}): Promise<boolean> {
  const { payment, paymentType } = params;

  const { data: stripeSession, error } = await supabase.functions.invoke('create-payment', {
    body: {
      invoice_id: payment.id,
      payment_type: paymentType,
      amount_usd: payment.total_amount_usd,
    },
  });

  if (error) throw error;

  if (stripeSession?.url) {
    window.location.href = stripeSession.url;
    return true;
  }
  return false;
}

/** Validation du numéro Mobile Money (RDC). */
export function isValidDrcMobileNumber(phone: string): boolean {
  return /^(\+?243|0)(8[1-9]|9[0-9])\d{7}$/.test(phone.replace(/\s/g, ''));
}
