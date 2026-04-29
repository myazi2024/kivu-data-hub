import { admin as supabase } from '../testModeAdminClient.ts';
import {
  PROVINCES, COLLECTIVITES_SR, CONSTRUCTION_NATURES, CONSTRUCTION_TYPES,
  CONSTRUCTION_MATERIALS, DECLARED_USAGES, LEGAL_STATUSES, OWNER_NAMES,
  PROPERTY_CATEGORIES, STANDINGS, TITLE_TYPES,
  assertInserted, computeOccupancy, getProvinceInfo, pick, randInt, randomDateInPast, seededInt,
  withRetry, BATCH_DELAY_MS,
} from './_shared.ts';

/** Step 1: Generate contributions (1 per parcel) */
export const generateContributions = async (userId: string, parcelNumbers: string[]) => {
  const STATUSES_CYCLE = ['approved', 'pending', 'rejected', 'pending', 'approved'];
  const TYPES_CYCLE: Array<'creation' | 'update'> = ['creation', 'creation', 'update', 'creation', 'creation'];

  const records = parcelNumbers.map((pn, idx) => {
    const { pIdx, localIdx, count } = getProvinceInfo(idx);
    const prov = PROVINCES[pIdx];
    const constructionNature = pick(CONSTRUCTION_NATURES, idx);
    const occupancy = computeOccupancy(idx, !!constructionNature);
    const isSuspicious = idx % 13 === 0;

    const isSR = localIdx >= Math.floor(count * 0.75);
    const ownerName = pick(OWNER_NAMES, idx);
    const ownerParts = ownerName.split(' ');
    const constructionYear = constructionNature ? seededInt(idx * 11 + 1, 1990, 2024) : null;
    const areaSqm = seededInt(idx * 7 + 1, 200, 5000);
    const sideN = seededInt(idx * 7 + 2, 10, 50), sideS = seededInt(idx * 7 + 3, 10, 50), sideE = seededInt(idx * 7 + 4, 10, 50), sideO = seededInt(idx * 7 + 5, 10, 50);
    const houseNumber = idx % 2 === 0 ? String(seededInt(idx * 7 + 6, 1, 200)) : null;

    return {
      parcel_number: pn,
      property_title_type: pick(TITLE_TYPES, idx),
      current_owner_name: `Test ${ownerName}`,
      area_sqm: areaSqm,
      province: prov.province,
      ville: prov.ville,
      commune: prov.commune,
      quartier: prov.quartier,
      avenue: prov.avenue,
      territoire: idx % 8 === 1 ? 'Nyiragongo' : null,
      village: idx % 12 === 0 ? 'Test Village' : null,
      collectivite: isSR ? pick(COLLECTIVITES_SR, idx) : null,
      status: 'pending',
      contribution_type: pick(TYPES_CYCLE, idx),
      user_id: userId,
      is_suspicious: isSuspicious,
      fraud_score: isSuspicious ? randInt(50, 95) : 0,
      fraud_reason: isSuspicious ? 'Test: score de fraude élevé simulé' : null,
      declared_usage: pick(DECLARED_USAGES, idx),
      construction_type: constructionNature ? pick(CONSTRUCTION_TYPES.filter(t => t !== 'Terrain nu'), idx) : 'Terrain nu',
      construction_nature: constructionNature,
      construction_year: constructionYear,
      construction_materials: constructionNature ? pick(CONSTRUCTION_MATERIALS, idx) : null,
      standing: constructionNature ? pick(STANDINGS, idx) : null,
      lease_type: localIdx % 7 === 0 ? 'initial' : localIdx % 11 === 0 ? 'renewal' : null,
      lease_years: isSR ? randInt(10, 99) : (localIdx % 7 === 0 ? randInt(5, 25) : null),
      groupement: isSR ? pick(['Mudaka', 'Irhambi', 'Bugorhe', 'Miti'], idx) : null,
      current_owner_legal_status: pick(LEGAL_STATUSES, idx),
      property_category: pick(PROPERTY_CATEGORIES, idx),
      title_reference_number: `REF-${prov.province.substring(0, 3).toUpperCase()}-${String(idx).padStart(4, '0')}`,
      title_issue_date: randomDateInPast(10),
      house_number: houseNumber,
      floor_number: constructionNature ? String(randInt(0, 3)) : null,
      apartment_number: idx % 15 === 0 ? `A${randInt(1, 20)}` : null,
      whatsapp_number: `+243${seededInt(idx * 13 + 1, 810000000, 899999999)}`,
      current_owners_details: (() => {
        const ownerLegalStatus = pick(LEGAL_STATUSES, idx);
        const ownerNationality = idx % 5 === 0 ? 'Étranger' : 'Congolais (RD)';
        const ownerEntityType = ownerLegalStatus === 'Personne morale'
          ? pick(['SARL', 'SA', 'SNC', 'ONG', 'Coopérative'], idx) : '';
        const ownerRightType = ownerLegalStatus === 'État'
          ? pick(['Concession', 'Affectation'], idx) : '';
        return [{
          lastName: ownerParts[0] || 'Test',
          firstName: ownerParts[1] || 'Utilisateur',
          middleName: idx % 3 === 0 ? 'Mutombo' : '',
          gender: idx % 2 === 0 ? 'Masculin' : 'Féminin',
          legalStatus: ownerLegalStatus,
          since: idx % 7 === 0 ? randomDateInPast(0.05) : randomDateInPast(10),
          nationality: ownerNationality,
          entityType: ownerEntityType, entitySubType: '', entitySubTypeOther: '',
          stateExploitedBy: '', rightType: ownerRightType,
        }];
      })(),
      building_permits: constructionNature ? [{
        permitType: idx % 3 === 0 ? 'regularization' : 'construction',
        permitNumber: `PC-${randInt(2018, 2025)}-${String(randInt(1, 999)).padStart(3, '0')}`,
        issueDate: randomDateInPast(5),
        validityMonths: '36',
        issuingService: "Division Provinciale de l'Urbanisme",
      }] : null,
      parcel_sides: [
        { name: 'Nord', length: String(sideN) },
        { name: 'Sud', length: String(sideS) },
        { name: 'Est', length: String(sideE) },
        { name: 'Ouest', length: String(sideO) },
      ],
      road_sides: [{ sideIndex: 0, roadName: prov.avenue }],
      servitude_data: (idx % 4 === 0
        ? { hasServitude: true, width: randInt(1, 3) }
        : { hasServitude: false }),
      building_shapes: constructionNature
        ? [{ type: 'rectangle', x: 50, y: 50, width: randInt(30, 80), height: randInt(20, 60), heightM: randInt(3, 15), areaSqm: randInt(40, 300) }]
        : [],
      ownership_history: idx % 3 === 0 ? [{
        name: `Ancien ${pick(OWNER_NAMES, idx + 5)}`,
        legalStatus: 'Personne physique',
        startDate: randomDateInPast(10),
        endDate: randomDateInPast(5),
        mutationType: pick(['Vente', 'Donation', 'Succession'], idx),
      }] : [],
      tax_history: [{
        taxType: 'Impôt foncier annuel',
        taxYear: String(new Date().getFullYear() - 1),
        taxAmount: String(randInt(20, 200)),
        paymentStatus: 'Payé',
        paymentDate: randomDateInPast(1),
      }],
      has_dispute: idx % 10 === 0,
      is_occupied: occupancy.is_occupied,
      occupant_count: occupancy.occupant_count,
      hosting_capacity: occupancy.hosting_capacity,
      additional_constructions: idx % 5 === 0 && constructionNature
        ? [{ type: pick(['Garage', 'Dépendance', 'Kiosque', 'Clôture'], idx), usage: pick(['Stockage', 'Commerce', 'Habitation'], idx), surface_sqm: randInt(10, 80) }]
        : null,
      dispute_data: idx % 10 === 0
        ? { type: 'delimitation', description: 'Test litige de délimitation' }
        : null,
      mortgage_history: idx % 8 === 0 ? [{
        mortgageAmount: String(randInt(5000, 50000)),
        duration: '60',
        creditorName: 'Rawbank',
        creditorType: 'Banque',
        contractDate: randomDateInPast(5),
        mortgageStatus: 'Active',
      }] : [],
      is_title_in_current_owner_name: idx % 3 !== 0,
      sound_environment: pick(['tres_calme', 'calme', 'modere', 'bruyant', 'tres_bruyant'], idx),
      nearby_noise_sources: idx % 3 === 0 ? 'Route principale, Marché' : idx % 3 === 1 ? 'Église' : null,
      created_at: new Date(Date.now() - randInt(0, 10 * 365) * 24 * 3600 * 1000).toISOString(),
    };
  });

  const CONTRIB_BATCH = 50;
  const allInserted: Array<{ id: string; parcel_number: string }> = [];
  for (let i = 0; i < records.length; i += CONTRIB_BATCH) {
    const batch = records.slice(i, i + CONTRIB_BATCH);
    const result = await withRetry<Array<{ id: string; parcel_number: string }>>(async () => {
      const { data, error } = await supabase
        .from('cadastral_contributions')
        .insert(batch)
        .select('id, parcel_number');
      if (error) throw new Error(`Contributions (batch ${i}): ${error.message}`);
      return assertInserted(data, 'Contributions') as Array<{ id: string; parcel_number: string }>;
    }, `Contributions batch ${i}`);
    allInserted.push(...result);
    if (i + CONTRIB_BATCH < records.length) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
  }

  const statusGroups: Record<string, string[]> = {};
  for (let i = 0; i < allInserted.length; i++) {
    const finalStatus = pick(STATUSES_CYCLE, i);
    if (finalStatus !== 'pending') {
      if (!statusGroups[finalStatus]) statusGroups[finalStatus] = [];
      statusGroups[finalStatus].push(allInserted[i].id);
    }
  }
  for (const [status, ids] of Object.entries(statusGroups)) {
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const updatePayload: { status: string; rejection_reason?: string } = { status };
      if (status === 'rejected') {
        updatePayload.rejection_reason = 'TEST: rejet automatique simulé';
      }
      const { error: updateError } = await supabase
        .from('cadastral_contributions')
        .update(updatePayload)
        .in('id', chunk);
      if (updateError) console.error(`Contribution status update (${status}, batch ${i}):`, updateError.message);
    }
  }

  return allInserted;
};

/** Step 8: Contributor codes — ~33% of contributions */
export const generateContributorCodes = async (
  userId: string,
  contributions: Array<{ id: string; parcel_number: string }>
) => {
  const codeSuffix = Date.now().toString(36).toUpperCase();
  const selected = contributions.filter((_, i) => i % 3 === 0);

  const records = selected.map((c, i) => ({
    code: `TEST-CCC-${codeSuffix}-${String(i + 1).padStart(3, '0')}`,
    contribution_id: c.id,
    parcel_number: c.parcel_number,
    user_id: userId,
    value_usd: randInt(5, 20),
    is_used: i % 4 === 0,
    used_at: i % 4 === 0 ? new Date().toISOString() : null,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }));

  const allInserted: Array<{ id: string }> = [];
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { data, error } = await supabase
      .from('cadastral_contributor_codes')
      .insert(batch)
      .select('id');
    if (error) throw new Error(`Codes CCC (batch ${i}): ${error.message}`);
    allInserted.push(...assertInserted(data, 'Codes CCC'));
  }
  return allInserted;
};

/** Step 9: Fraud attempts — 2/province */
export const generateFraudAttempts = async (
  userId: string,
  contributions: Array<{ id: string; parcel_number: string }>
) => {
  const FRAUD_TYPES = ['duplication', 'document_falsifie', 'identite_usurpee', 'coordonnees_falsifiees', 'duplication'];
  const SEVERITIES = ['high', 'medium', 'critical', 'low', 'high'];

  const selected = contributions.filter((_, i) => i % 10 === 0).slice(0, PROVINCES.length * 2);

  const records = selected.map((c, i) => ({
    user_id: userId,
    contribution_id: c.id,
    fraud_type: pick(FRAUD_TYPES, i),
    severity: pick(SEVERITIES, i),
    description: `Test: tentative de fraude ${pick(FRAUD_TYPES, i)} détectée`,
    created_at: new Date(Date.now() - randInt(0, 10 * 365) * 24 * 3600 * 1000).toISOString(),
  }));

  const allInserted: Array<{ id: string }> = [];
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { data, error } = await supabase
      .from('fraud_attempts')
      .insert(batch)
      .select('id');
    if (error) console.error(`Fraud attempts (batch ${i}, non-bloquant):`, error);
    if (data) allInserted.push(...data);
  }
  return allInserted;
};
