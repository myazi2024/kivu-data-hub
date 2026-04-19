import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import {
  PROVINCES, LEGAL_STATUSES, assertInserted, getProvinceInfo, pick, randInt,
} from './_shared';

/** Step 16: Certificates — 2/province with varied statuses */
export const generateCertificates = async (
  parcelNumbers: string[],
  suffix: string,
  userId?: string
) => {
  const CERT_TYPES = ['titre_foncier', 'mutation_fonciere', 'certificat_enregistrement', 'titre_foncier', 'mutation_fonciere'];
  const CERT_STATUSES = ['generated', 'pending', 'completed', 'generated', 'completed'];
  const selectedParcels = parcelNumbers.filter((_, i) => i % 10 === 2).slice(0, PROVINCES.length * 2);

  const records = selectedParcels.map((pn, i) => ({
    reference_number: `TEST-CERT-${String(i + 1).padStart(3, '0')}-${suffix}`,
    certificate_type: pick(CERT_TYPES, i),
    parcel_number: pn,
    recipient_name: `Test Propriétaire ${i + 1}`,
    status: pick(CERT_STATUSES, i),
    generated_by: userId ?? null,
    metadata: { test_mode: 'true' } as unknown as Json,
    generated_at: new Date(Date.now() - randInt(0, 10 * 365) * 24 * 3600 * 1000).toISOString(),
  }));

  const allInserted: Array<{ id: string }> = [];
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { data, error } = await supabase
      .from('generated_certificates')
      .insert(batch)
      .select('id');
    if (error) console.error(`Certificats (batch ${i}, non-bloquant):`, error);
    if (data) allInserted.push(...data);
  }
  return allInserted;
};

/** Step 17a: Mutation requests — 2/province with enriched fees */
export const generateMutationRequests = async (
  userId: string,
  parcels: Array<{ id: string; parcel_number: string }>,
  suffix: string
) => {
  const MUT_TYPES = ['vente', 'donation', 'succession', 'vente', 'donation'];
  const MUT_STATUSES = ['pending', 'approved', 'rejected', 'pending', 'approved', 'pending', 'rejected', 'approved', 'pending', 'approved'];
  const TITLE_AGES = ['less_than_10', '10_or_more'];
  const selected = parcels.filter((_, i) => i % 10 === 4).slice(0, PROVINCES.length * 2);

  const records = selected.map((p, i) => {
    const status = pick(MUT_STATUSES, i);
    const hasLateFee = i % 3 === 0;
    return {
      reference_number: `TEST-MUT-${String(i + 1).padStart(3, '0')}-${suffix}`,
      parcel_number: p.parcel_number,
      parcel_id: p.id,
      mutation_type: pick(MUT_TYPES, i),
      requester_type: i % 3 === 0 ? 'heritier' : 'proprietaire',
      requester_name: `Test Requérant Mutation ${i + 1}`,
      beneficiary_name: i % 2 === 0 ? `Test Bénéficiaire ${i + 1}` : null,
      status,
      payment_status: 'paid',
      total_amount_usd: randInt(80, 200),
      market_value_usd: randInt(10000, 80000),
      mutation_fee_amount: randInt(40, 100),
      late_fee_amount: hasLateFee ? randInt(10, 50) : null,
      title_age: pick(TITLE_AGES, i),
      user_id: userId,
      proposed_changes: {
        new_owner_name: `Test Nouveau Propriétaire ${i + 1}`,
        new_owner_legal_status: pick(LEGAL_STATUSES, i),
        title_age: pick(TITLE_AGES, i),
        ...(hasLateFee ? { late_fees: { fee: randInt(10, 50), reason: 'Retard de mutation' } } : {}),
      } as unknown as Json,
      fee_items: [
        { fee_name: 'Frais de dossier', amount_usd: 83, is_mandatory: true },
        ...(i % 2 === 0 ? [{ fee_name: 'Frais de mutation', amount_usd: 83, is_mandatory: true }] : []),
      ] as unknown as Json,
      rejection_reason: status === 'rejected' ? 'Documents insuffisants (test)' : null,
      reviewed_at: status !== 'pending' ? new Date().toISOString() : null,
      created_at: new Date(Date.now() - randInt(0, 10 * 365) * 24 * 3600 * 1000).toISOString(),
    };
  });

  const { data, error } = await supabase
    .from('mutation_requests')
    .insert(records)
    .select('id');

  if (error) throw new Error(`Mutations: ${error.message}`);
  return assertInserted(data, 'Mutations');
};

/** Step 17b: Subdivision requests — 1/province */
export const generateSubdivisionRequests = async (
  userId: string,
  parcels: Array<{ id: string; parcel_number: string }>,
  suffix: string
) => {
  const SUB_STATUSES = ['pending', 'approved', 'pending', 'approved', 'rejected'];
  const PURPOSES = ['Résidentielle', 'Commerciale', 'Mixte', 'Résidentielle', 'Commerciale'];
  const SUB_PAYMENT_STATUSES = ['paid', 'pending', 'paid', 'paid', 'pending'];
  const selected = parcels.filter((_, i) => {
    const info = getProvinceInfo(i);
    return info.localIdx === 8;
  }).slice(0, PROVINCES.length);

  const records = selected.map((p, i) => {
    const numLots = randInt(2, 5);
    const parentArea = randInt(800, 3000);
    const lotArea = Math.floor(parentArea / numLots);
    const status = pick(SUB_STATUSES, i);
    const submissionFee = randInt(30, 80);
    const remainingFee = randInt(50, 150);

    return {
      reference_number: `TEST-SUB-${String(i + 1).padStart(3, '0')}-${suffix}`,
      parcel_number: p.parcel_number,
      parcel_id: p.id,
      number_of_lots: numLots,
      parent_parcel_area_sqm: parentArea,
      parent_parcel_owner_name: `Test Propriétaire Lotissement ${i + 1}`,
      requester_first_name: 'Test',
      requester_last_name: `Lotisseur ${i + 1}`,
      requester_phone: `+24381000000${i + 1}`,
      requester_type: i % 2 === 0 ? 'proprietaire' : 'mandataire',
      status,
      purpose_of_subdivision: pick(PURPOSES, i),
      user_id: userId,
      submission_payment_status: pick(SUB_PAYMENT_STATUSES, i),
      submission_fee_usd: submissionFee,
      remaining_fee_usd: remainingFee,
      total_amount_usd: submissionFee + remainingFee,
      lots_data: Array.from({ length: numLots }, (_, j) => ({
        lot_number: j + 1,
        area_sqm: lotArea,
        intended_use: pick(PURPOSES, j),
      })) as unknown as Json,
      reviewed_at: status !== 'pending' ? new Date().toISOString() : null,
      approved_at: status === 'approved' ? new Date().toISOString() : null,
      created_at: new Date(Date.now() - randInt(0, 10 * 365) * 24 * 3600 * 1000).toISOString(),
    };
  });

  const { data, error } = await supabase
    .from('subdivision_requests')
    .insert(records)
    .select('id');

  if (error) throw new Error(`Lotissements: ${error.message}`);
  return assertInserted(data, 'Lotissements');
};
