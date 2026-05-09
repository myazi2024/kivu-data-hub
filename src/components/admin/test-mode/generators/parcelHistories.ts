import { supabase } from '@/integrations/supabase/client';
import { LEGAL_STATUSES, assertInserted, pick, randInt, randomDateInPast } from './_shared';

/** Step 11: Ownership history — ~15% parcels × 2 owners */
export const generateOwnershipHistory = async (
  parcels: Array<{ id: string; parcel_number: string }>
) => {
  const selected = parcels.filter((_, i) => i % 7 === 0);
  const MUTATION_TYPES = ['Vente', 'Donation', 'Succession', 'Vente', 'Donation'];

  const records = selected.flatMap((p, i) => {
    const startDate = randomDateInPast(10);
    const midDate = randomDateInPast(5);
    return [
      {
        parcel_id: p.id,
        owner_name: `Ancien Propriétaire ${i + 1}`,
        ownership_start_date: startDate,
        ownership_end_date: midDate,
        legal_status: pick(LEGAL_STATUSES, i),
        mutation_type: pick(MUTATION_TYPES, i),
      },
      {
        parcel_id: p.id,
        owner_name: `Propriétaire Actuel ${i + 1}`,
        ownership_start_date: midDate,
        ownership_end_date: null,
        legal_status: pick(LEGAL_STATUSES, i + 1),
        mutation_type: pick(MUTATION_TYPES, i + 1),
      },
    ];
  });

  const allInserted: Array<{ id: string }> = [];
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { data, error } = await supabase
      .from('cadastral_ownership_history')
      .insert(batch)
      .select('id');
    if (error) console.error(`Historique propriété (batch ${i}, non-bloquant):`, error);
    if (data) allInserted.push(...data);
  }
  return allInserted;
};

/** Step 12: Tax history — ~15% parcels × 3 years */
export const generateTaxHistory = async (
  parcels: Array<{ id: string; parcel_number: string }>
) => {
  const currentYear = new Date().getFullYear();
  const selected = parcels.filter((_, i) => i % 7 === 0);

  const TAX_STATUSES_PAID = ['paid', 'paid', 'paid', 'paid'];
  const TAX_STATUSES_UNPAID = ['pending', 'overdue', 'pending', 'overdue'];
  const records = selected.flatMap((p, i) =>
    [0, 1, 2].map((yearOffset) => {
      const isUnpaid = yearOffset === 2 && i % 3 !== 0;
      return {
        parcel_id: p.id,
        tax_year: currentYear - 2 + yearOffset,
        amount_usd: randInt(20, 300),
        payment_status: isUnpaid ? pick(TAX_STATUSES_UNPAID, i) : pick(TAX_STATUSES_PAID, i),
        payment_date: isUnpaid ? null : `${currentYear - 2 + yearOffset}-${String(randInt(1, 6)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
      };
    })
  );

  const allInserted: Array<{ id: string }> = [];
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { data, error } = await supabase
      .from('cadastral_tax_history')
      .insert(batch)
      .select('id');
    if (error) throw new Error(`Historique taxes (batch ${i}): ${error.message}`);
    allInserted.push(...assertInserted(data, 'Historique taxes'));
  }
  return allInserted;
};

/** Step 13: Boundary history — ~7% parcels */
export const generateBoundaryHistory = async (
  parcels: Array<{ id: string; parcel_number: string }>
) => {
  const selected = parcels.filter((_, i) => i % 15 === 0);
  const PURPOSES = ['Réajustement ou rectification', 'Morcellement ou fusion', 'Mise en valeur ou mutation'];

  const records = selected.map((p, i) => ({
    parcel_id: p.id,
    pv_reference_number: `TEST-PV-${Date.now().toString(36)}-${i}`,
    surveyor_name: `Géomètre Test ${i + 1}`,
    survey_date: randomDateInPast(8),
    boundary_purpose: pick(PURPOSES, i),
  }));

  const allInserted: Array<{ id: string }> = [];
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { data, error } = await supabase
      .from('cadastral_boundary_history')
      .insert(batch)
      .select('id');
    if (error) console.error(`Historique bornages (batch ${i}, non-bloquant):`, error);
    if (data) allInserted.push(...data);
  }
  return allInserted;
};
