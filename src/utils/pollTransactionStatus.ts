import { supabase } from '@/integrations/supabase/client';

/**
 * Polling centralisé pour vérifier le statut d'une transaction de paiement.
 * Interroge la table payment_transactions toutes les 2s pendant max 30s.
 */
export async function pollTransactionStatus(
  transactionId: string,
  maxAttempts = 15,
  intervalMs = 2000
): Promise<'completed' | 'failed' | 'timeout'> {
  let attempts = 0;
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, intervalMs));
    const { data: tx } = await supabase
      .from('payment_transactions')
      .select('status')
      .eq('id', transactionId)
      .single();
    if (tx?.status === 'completed') return 'completed';
    if (tx?.status === 'failed') return 'failed';
    attempts++;
  }
  return 'timeout';
}
