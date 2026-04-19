import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import {
  PROVINCES, CONSTRUCTION_TYPES, CONSTRUCTION_MATERIALS, DECLARED_USAGES,
  LEGAL_STATUSES, STANDINGS, TITLE_TYPES, TOTAL_PARCELS,
  assertInserted, pick, randInt,
} from './_shared';

/** Step 5: Title requests — ~5% of parcels */
export const generateTitleRequests = async (userId: string, suffix: string) => {
  const FIRST_NAMES = ['Jean', 'Marie', 'Patrick', 'Chantal', 'Pierre', 'Grace', 'David', 'Sophie', 'Joseph', 'Alice'];
  const LAST_NAMES = ['Kabongo', 'Amani', 'Mwamba', 'Furaha', 'Mukendi', 'Baraka', 'Ilunga', 'Sifa', 'Ngoy', 'Mapendo'];
  const REQ_STATUSES = ['pending', 'approved', 'rejected', 'pending', 'approved', 'pending', 'rejected', 'approved', 'pending', 'approved'];
  const PAY_STATUSES = ['pending', 'paid', 'paid', 'pending', 'paid', 'pending', 'paid', 'paid', 'pending', 'paid'];
  const REQUEST_TYPES = ['initial', 'renouvellement', 'conversion'];
  const REQUESTER_TYPES = ['owner', 'beneficiary', 'representative'];
  const NATIONALITIES = ['congolais', 'congolais', 'congolais', 'congolais', 'congolais', 'congolais', 'congolais', 'congolais', 'etranger', 'etranger'];

  const totalCount = Math.max(PROVINCES.length * 2, Math.round(TOTAL_PARCELS * 0.05));
  const records = Array.from({ length: totalCount }, (_, i) => {
    const prov = PROVINCES[i % PROVINCES.length];
    const isRural = i % 3 === 0;
    const status = pick(REQ_STATUSES, i);
    const createdAt = new Date(Date.now() - randInt(0, 10 * 365) * 24 * 3600 * 1000);
    const reviewedAt = status !== 'pending' ? new Date(createdAt.getTime() + randInt(5, 60) * 24 * 3600 * 1000) : null;
    return {
      reference_number: `TEST-LTR-${String(i + 1).padStart(3, '0')}-${suffix}`,
      user_id: userId,
      requester_first_name: pick(FIRST_NAMES, i),
      requester_last_name: pick(LAST_NAMES, i),
      requester_phone: `+24380000${String(10 + i).padStart(4, '0')}`,
      requester_email: `test-titre${i + 1}@example.com`,
      request_type: pick(REQUEST_TYPES, i),
      requester_type: pick(REQUESTER_TYPES, i),
      requester_gender: i % 2 === 0 ? 'Masculin' : 'Féminin',
      owner_gender: i % 3 === 0 ? 'Féminin' : 'Masculin',
      requester_legal_status: pick(LEGAL_STATUSES, i),
      owner_legal_status: pick(LEGAL_STATUSES, i + 1),
      nationality: pick(NATIONALITIES, i),
      is_owner_same_as_requester: pick(REQUESTER_TYPES, i) === 'owner',
      section_type: isRural ? 'rural' : 'urbain',
      province: prov.province,
      ville: prov.ville,
      commune: prov.commune,
      quartier: isRural ? null : prov.quartier,
      territoire: isRural ? 'Kabare' : null,
      declared_usage: pick(DECLARED_USAGES, i),
      construction_type: pick(CONSTRUCTION_TYPES, i),
      construction_nature: i % 4 === 0 ? null : pick(['Durable', 'Semi-durable', 'Précaire'], i),
      construction_materials: i % 4 === 0 ? null : pick(CONSTRUCTION_MATERIALS, i),
      standing: i % 4 === 0 ? null : pick(STANDINGS, i),
      construction_year: i % 4 === 0 ? null : randInt(1990, 2024),
      floor_number: i % 4 === 0 ? null : String(randInt(0, 3)),
      deduced_title_type: pick(TITLE_TYPES, i),
      area_sqm: randInt(200, 3000),
      estimated_processing_days: randInt(20, 90),
      status,
      rejection_reason: status === 'rejected' ? 'Documents incomplets (données de test)' : null,
      reviewed_at: reviewedAt?.toISOString() ?? null,
      payment_status: pick(PAY_STATUSES, i),
      total_amount_usd: randInt(50, 150),
      fee_items: [
        { fee_name: 'Frais de dossier', amount_usd: 50 },
        ...(i % 2 === 0 ? [{ fee_name: 'Frais de mesurage', amount_usd: 25 }] : []),
      ] as unknown as Json,
      created_at: createdAt.toISOString(),
    };
  });

  const allInserted: Array<{ id: string }> = [];
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { data, error } = await supabase
      .from('land_title_requests')
      .insert(batch)
      .select('id');
    if (error) throw new Error(`Demandes de titres (batch ${i}): ${error.message}`);
    allInserted.push(...assertInserted(data, 'Demandes de titres'));
  }
  return allInserted;
};
