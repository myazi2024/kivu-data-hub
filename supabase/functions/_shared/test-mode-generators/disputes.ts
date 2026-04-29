import { admin as supabase } from '../testModeAdminClient.ts';
import { PROVINCES, PROVINCE_OFFSETS, assertInserted, pick, randInt, randomDateInPast } from './_shared.ts';

/** Step 7: Disputes — 2/province */
export const generateDisputes = async (parcels: Array<{ id: string; parcel_number: string }>, suffix: string, userId?: string) => {
  const DISPUTE_NATURES = ['delimitation', 'double_vente', 'occupation_illegale', 'succession', 'delimitation'];
  const DISPUTE_STATUSES = ['en_cours', 'resolu', 'demande_levee', 'en_cours', 'resolu', 'en_cours', 'demande_levee', 'resolu', 'en_cours', 'resolu'];
  const DISPUTE_TYPES = ['report', 'lifting', 'report', 'lifting', 'report'];
  const QUALITIES = ['proprietaire', 'occupant', 'heritier', 'mandataire', 'proprietaire'];
  const LIFTING_STATUSES = ['en_cours', 'approved', 'rejected', 'pending'];
  const LIFTING_REASONS = ['conciliation_reussie', 'decision_justice', 'accord_parties'];
  const RESOLUTION_LEVELS = ['conciliation_amiable', 'mediation_communautaire', 'tribunal_paix', 'tribunal_grande_instance'];

  const selectedParcels = parcels.filter((_, i) => i % 10 === 5).slice(0, PROVINCES.length * 2);

  const records = selectedParcels.map((p, i) => {
    const status = pick(DISPUTE_STATUSES, i);
    return {
      reference_number: `TEST-DISP-${String(i + 1).padStart(3, '0')}-${suffix}`,
      parcel_number: p.parcel_number,
      parcel_id: p.id,
      dispute_type: pick(DISPUTE_TYPES, i),
      dispute_nature: pick(DISPUTE_NATURES, i),
      declarant_name: `Test Déclarant ${i + 1}`,
      declarant_quality: pick(QUALITIES, i),
      declarant_phone: `+24380000${String(30 + i).padStart(4, '0')}`,
      declarant_email: `test-decl${i + 1}@example.com`,
      current_status: status,
      reported_by: userId ?? null,
      dispute_start_date: randomDateInPast(8),
      dispute_description: `Litige de test #${i + 1}: ${pick(DISPUTE_NATURES, i)}`,
      resolution_level: pick(RESOLUTION_LEVELS, i),
      resolution_details: status === 'resolu' ? 'Résolu à l\'amiable (données de test)' : null,
      lifting_status: status === 'demande_levee' ? pick(LIFTING_STATUSES, i) : null,
      lifting_reason: status === 'demande_levee' ? pick(LIFTING_REASONS, i) : null,
      lifting_request_reference: status === 'demande_levee' ? `TEST-LEV-${String(i + 1).padStart(3, '0')}-${suffix}` : null,
      parties_involved: [
        { name: `Test Partie ${i * 2 + 1}`, role: 'demandeur' },
        { name: `Test Partie ${i * 2 + 2}`, role: 'défendeur' },
      ],
      created_at: new Date(Date.now() - randInt(0, 10 * 365) * 24 * 3600 * 1000).toISOString(),
    };
  });

  const allInserted: Array<{ id: string }> = [];
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { data, error } = await supabase
      .from('cadastral_land_disputes')
      .insert(batch)
      .select('id');
    if (error) throw new Error(`Litiges (batch ${i}): ${error.message}`);
    allInserted.push(...assertInserted(data, 'Litiges'));
  }
  return allInserted;
};

/** Step 10: Boundary conflicts */
export const generateBoundaryConflicts = async (parcelNumbers: string[], userId?: string) => {
  const CONFLICT_TYPES = ['chevauchement', 'borne_deplacee', 'empiétement', 'chevauchement'];
  const STATUSES = ['en_cours', 'resolu', 'en_cours', 'resolu'];

  const records: Array<{
    reporting_parcel_number: string;
    conflicting_parcel_number: string;
    conflict_type: string;
    description: string;
    status: string;
    reported_by: string | null;
    proposed_solution?: string | null;
    resolution_notes?: string | null;
    resolved_at?: string | null;
    resolved_by?: string | null;
  }> = [];
  for (let pIdx = 0; pIdx < PROVINCES.length; pIdx++) {
    const base = PROVINCE_OFFSETS[pIdx];
    for (let j = 0; j < 2; j++) {
      const idx = pIdx * 2 + j;
      const status = pick(STATUSES, idx);
      records.push({
        reporting_parcel_number: parcelNumbers[base + j * 2],
        conflicting_parcel_number: parcelNumbers[base + j * 2 + 1],
        conflict_type: pick(CONFLICT_TYPES, idx),
        description: `Test: ${pick(CONFLICT_TYPES, idx)} entre parcelles adjacentes`,
        status,
        reported_by: userId ?? null,
        proposed_solution: status === 'resolu' ? 'Repose de bornes par le géomètre assermenté' : null,
        resolution_notes: status === 'resolu' ? 'Résolu après intervention (test)' : null,
        resolved_at: status === 'resolu' ? new Date().toISOString() : null,
        resolved_by: status === 'resolu' ? (userId ?? null) : null,
      });
    }
  }

  const { data, error } = await supabase
    .from('cadastral_boundary_conflicts')
    .insert(records)
    .select('id');

  if (error) console.error('Conflits limites (non-bloquant):', error);
  return data ?? [];
};
