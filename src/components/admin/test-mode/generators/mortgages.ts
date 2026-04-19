import { supabase } from '@/integrations/supabase/client';
import { pick, randInt, randomDateInPast } from './_shared';

/** Step 14: Mortgages — ~8% parcels */
export const generateMortgages = async (
  parcels: Array<{ id: string; parcel_number: string }>
) => {
  const selected = parcels.filter((_, i) => i % 12 === 3);
  const CREDITORS = ['Banque Commerciale du Congo', 'Trust Merchant Bank', 'Rawbank', 'Equity BCDC', 'KCB Bank'];
  const CREDITOR_TYPES = ['Banque', 'Microfinance', 'Banque', 'Banque', 'Microfinance'];
  const STATUSES = ['active', 'soldée', 'soldée', 'active', 'en_défaut'];

  const records = selected.map((p, i) => ({
    parcel_id: p.id,
    creditor_name: pick(CREDITORS, i),
    creditor_type: pick(CREDITOR_TYPES, i),
    mortgage_amount_usd: randInt(10000, 100000),
    duration_months: pick([36, 60, 120, 84, 48], i),
    contract_date: randomDateInPast(8),
    mortgage_status: pick(STATUSES, i),
    reference_number: `TEST-HYP-${Date.now().toString(36)}-${i}`,
  }));

  const allInserted: Array<{ id: string; mortgage_status: string; mortgage_amount_usd: number }> = [];
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { data, error } = await supabase
      .from('cadastral_mortgages')
      .insert(batch)
      .select('id, mortgage_status, mortgage_amount_usd');
    if (error) console.error(`Hypothèques (batch ${i}, non-bloquant):`, error);
    if (data) allInserted.push(...data);
  }
  return allInserted;
};

/**
 * Génère 2-6 paiements par hypothèque active|soldée pour que le hub historiques
 * et les RPC reçus/réconciliation soient testables.
 */
export const generateMortgagePayments = async (
  mortgages: Array<{ id: string; mortgage_status: string; mortgage_amount_usd: number }>
) => {
  const eligible = mortgages.filter(
    (m) => m.mortgage_status === 'active' || m.mortgage_status === 'soldée'
  );
  if (eligible.length === 0) return;

  const records: Record<string, unknown>[] = [];
  for (const m of eligible) {
    const isSettled = m.mortgage_status === 'soldée';
    const numPayments = randInt(2, 6);
    const monthly = Math.max(50, Math.round(m.mortgage_amount_usd / 60));
    for (let j = 0; j < numPayments; j++) {
      const isFinal = isSettled && j === numPayments - 1;
      records.push({
        mortgage_id: m.id,
        payment_amount_usd: isFinal ? monthly * 2 : monthly,
        payment_date: randomDateInPast(5),
        payment_type: isFinal ? 'solde_final' : 'mensualite',
      });
    }
  }

  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { error } = await supabase
      .from('cadastral_mortgage_payments')
      .insert(batch as never);
    if (error) console.error(`Paiements hypothèques (batch ${i}, non-bloquant):`, error);
  }
};
