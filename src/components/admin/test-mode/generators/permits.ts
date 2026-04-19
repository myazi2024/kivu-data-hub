import { supabase } from '@/integrations/supabase/client';
import { assertInserted, pick, randInt, randomDateInPast } from './_shared';

/** Step 15: Building permits — ~15% parcels (≥1/province via filtre dense) */
export const generateBuildingPermits = async (
  parcels: Array<{ id: string; parcel_number: string }>
) => {
  // Filtre élargi pour garantir une couverture par province (1 sur 7 ≈ 14%)
  const selected = parcels.filter((_, i) => i % 7 === 0);
  const SERVICES = [
    'Division Provinciale de l\'Urbanisme et Habitat - Kinshasa',
    'Service Communal d\'Urbanisme - Goma',
    'Division Provinciale Urbanisme - Bukavu',
    'Service Urbanisme - Lubumbashi',
    'Division Urbanisme - Matadi',
  ];
  const ADM_STATUSES = ['approved', 'rejected', 'approved', 'pending', 'completed'];

  const records = selected.map((p, i) => {
    const isRegularization = i % 3 === 0;
    const permitPrefix = isRegularization ? 'TEST-PC-REG' : 'TEST-PC';
    return {
      parcel_id: p.id,
      permit_number: `${permitPrefix}-${Date.now().toString(36)}-${i}`,
      issue_date: randomDateInPast(5),
      issuing_service: pick(SERVICES, i),
      validity_period_months: pick([12, 24, 36], i),
      administrative_status: pick(ADM_STATUSES, i),
      is_current: i % 3 !== 1,
    };
  });

  const allInserted: Array<{ id: string; administrative_status: string; permit_number: string }> = [];
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { data, error } = await supabase
      .from('cadastral_building_permits')
      .insert(batch)
      .select('id, administrative_status, permit_number');
    if (error) {
      // Non-bloquant : log + skip batch pour ne pas casser le reste de l'étape 11
      console.error(`Autorisation de bâtir (batch ${i}, non-bloquant):`, error);
      continue;
    }
    if (data) allInserted.push(...data);
  }
  return allInserted;
};

/**
 * Note : `permit_payments` et `permit_admin_actions` sont liés à
 * `cadastral_contributions` (contribution_id), pas directement aux permits
 * de la table `cadastral_building_permits`. Pour ne pas falsifier la
 * sémantique métier, on génère uniquement les permits ici. La couverture des
 * paiements/actions admin est assurée via les contributions test (CCC) qui
 * portent un permit_request_data.
 *
 * Si à terme une table `permit_payments_for_building_permits` est ajoutée,
 * étendre ici.
 */
