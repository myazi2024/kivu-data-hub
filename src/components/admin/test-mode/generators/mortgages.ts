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

  const allInserted: Array<{ id: string }> = [];
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { data, error } = await supabase
      .from('cadastral_mortgages')
      .insert(batch)
      .select('id');
    if (error) console.error(`Hypothèques (batch ${i}, non-bloquant):`, error);
    if (data) allInserted.push(...data);
  }
  return allInserted;
};
