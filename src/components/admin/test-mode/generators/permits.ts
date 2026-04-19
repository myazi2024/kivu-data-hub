import { supabase } from '@/integrations/supabase/client';
import { assertInserted, pick, randomDateInPast } from './_shared';

/** Step 15: Building permits — ~10% parcels */
export const generateBuildingPermits = async (
  parcels: Array<{ id: string; parcel_number: string }>
) => {
  const selected = parcels.filter((_, i) => i % 10 === 7);
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

  const allInserted: Array<{ id: string }> = [];
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { data, error } = await supabase
      .from('cadastral_building_permits')
      .insert(batch)
      .select('id');
    if (error) throw new Error(`Autorisation de bâtir (batch ${i}): ${error.message}`);
    allInserted.push(...assertInserted(data, 'Autorisation de bâtir'));
  }
  return allInserted;
};
