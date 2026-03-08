import { supabase } from '@/integrations/supabase/client';

/**
 * Polling centralisé pour vérifier le statut d'une transaction de paiement.
 * Interroge la table payment_transactions toutes les 2s pendant max 30s.
 * Fix #12: Supporte AbortSignal pour annuler le polling si le dialog est fermé.
 */
export async function pollTransactionStatus(
  transactionId: string,
  maxAttempts = 15,
  intervalMs = 2000,
  signal?: AbortSignal
): Promise<'completed' | 'failed' | 'timeout' | 'aborted'> {
  let attempts = 0;
  while (attempts < maxAttempts) {
    if (signal?.aborted) return 'aborted';

    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, intervalMs);
      if (signal) {
        const onAbort = () => { clearTimeout(timer); resolve(); };
        signal.addEventListener('abort', onAbort, { once: true });
      }
    });

    if (signal?.aborted) return 'aborted';

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
