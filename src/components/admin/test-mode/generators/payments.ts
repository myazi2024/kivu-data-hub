import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { assertInserted, pick, randInt } from './_shared';

/** Step 3: Generate payments for paid invoices */
export const generatePayments = async (
  userId: string,
  invoices: Array<{ id: string; parcel_number: string; status: string }>
) => {
  const paidInvoices = invoices.filter((inv) => inv.status === 'paid');
  if (paidInvoices.length === 0) return [];

  const METHODS = ['mobile_money', 'card', 'bank_transfer'];
  const PROVIDERS = ['airtel_money', 'stripe', 'orange_money', 'vodacom_mpesa'];

  const records = paidInvoices.map((inv, i) => ({
    invoice_id: inv.id,
    amount_usd: randInt(5, 25),
    payment_method: pick(METHODS, i),
    provider: pick(PROVIDERS, i),
    status: 'completed',
    phone_number: i % 2 === 0 ? `+24380000${String(i).padStart(4, '0')}` : null,
    transaction_reference: `TEST-TXN-${Date.now()}-${i}`,
    user_id: userId,
    metadata: { test_mode: 'true', generated_at: new Date().toISOString() } as unknown as Json,
    created_at: new Date(Date.now() - randInt(0, 10 * 365) * 24 * 3600 * 1000).toISOString(),
  }));

  const allInserted: Array<{ id: string }> = [];
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { data, error } = await supabase
      .from('payment_transactions')
      .insert(batch)
      .select('id');
    if (error) throw new Error(`Paiements (batch ${i}): ${error.message}`);
    allInserted.push(...assertInserted(data, 'Paiements'));
  }
  return allInserted;
};
