import { supabase } from '@/integrations/supabase/client';
import { PROVINCES, TOTAL_PARCELS, assertInserted, pick, randInt } from './_shared';

/** Step 6: Expertise requests — ~5% of parcels */
export const generateExpertiseRequests = async (userId: string, parcels: Array<{ id: string; parcel_number: string }>, suffix: string) => {
  const EXP_STATUSES = ['pending', 'completed', 'in_progress', 'pending', 'completed', 'pending', 'in_progress', 'completed', 'pending', 'completed'];
  const ROAD_TYPES = ['asphalte', 'terre', 'piste', 'asphalte', 'terre'];
  const PROPERTY_CONDITIONS = ['neuf', 'bon', 'moyen', 'mauvais', 'a_renover'];
  const WALL_MATERIALS = ['beton', 'briques_cuites', 'briques_adobe', 'parpaings', 'bois', 'tole', 'mixte'];
  const ROOF_MATERIALS = ['tole_bac', 'tuiles', 'dalle_beton', 'ardoise', 'chaume', 'autre'];
  const BUILDING_POSITIONS = ['premiere_position', 'deuxieme_position', 'fond_parcelle', 'dans_servitude', 'coin_parcelle'];
  const PAYMENT_STATUSES_EXP = ['pending', 'paid', 'paid', 'pending', 'paid'];

  const totalCount = Math.max(PROVINCES.length * 2, Math.round(TOTAL_PARCELS * 0.05));
  const step = Math.max(1, Math.floor(parcels.length / totalCount));
  const selectedParcels = parcels.filter((_, i) => i % step === 0).slice(0, totalCount);

  const records = selectedParcels.map((p, i) => {
    const status = pick(EXP_STATUSES, i);
    const createdAt = new Date(Date.now() - randInt(0, 10 * 365) * 24 * 3600 * 1000);
    const assignedAt = status !== 'pending' ? new Date(createdAt.getTime() + randInt(1, 15) * 24 * 3600 * 1000) : null;
    const expertiseDate = status === 'completed' ? new Date((assignedAt?.getTime() ?? createdAt.getTime()) + randInt(5, 30) * 24 * 3600 * 1000) : null;

    return {
      reference_number: `TEST-EXP-${String(i + 1).padStart(3, '0')}-${suffix}`,
      parcel_number: p.parcel_number,
      parcel_id: p.id,
      user_id: userId,
      requester_name: `Test Expert ${i + 1}`,
      requester_email: `test-exp${i + 1}@example.com`,
      requester_phone: `+24380000${String(20 + i).padStart(4, '0')}`,
      status,
      payment_status: pick(PAYMENT_STATUSES_EXP, i),
      property_description: `Parcelle test ${i + 1} pour expertise immobilière`,
      property_condition: pick(PROPERTY_CONDITIONS, i),
      wall_material: pick(WALL_MATERIALS, i),
      roof_material: pick(ROOF_MATERIALS, i),
      floor_material: pick(['carrelage', 'ciment_lisse', 'parquet', 'marbre', 'terre_battue', 'autre'], i),
      building_position: pick(BUILDING_POSITIONS, i),
      construction_year: i % 3 === 0 ? null : randInt(1995, 2023),
      number_of_floors: i % 3 === 0 ? 0 : randInt(1, 4),
      total_built_area_sqm: i % 3 === 0 ? 0 : randInt(80, 500),
      number_of_rooms: randInt(3, 12),
      number_of_bedrooms: randInt(1, 6),
      number_of_bathrooms: randInt(1, 3),
      has_garden: i % 2 === 0,
      garden_area_sqm: i % 2 === 0 ? randInt(50, 300) : 0,
      has_electricity: i % 3 !== 2,
      has_water_supply: i % 4 !== 3,
      has_internet: i % 3 === 0,
      has_parking: i % 2 === 0,
      parking_spaces: i % 2 === 0 ? randInt(1, 4) : 0,
      has_security_system: i % 5 === 0,
      has_sewage_system: i % 4 === 0,
      has_pool: i % 12 === 0,
      has_air_conditioning: i % 6 === 0,
      has_solar_panels: i % 8 === 0,
      has_generator: i % 5 === 0,
      has_water_tank: i % 4 === 0,
      has_borehole: i % 7 === 0,
      has_garage: i % 3 === 0,
      has_electric_fence: i % 9 === 0,
      has_cellar: i % 15 === 0,
      has_automatic_gate: i % 10 === 0,
      construction_quality: pick(['standard', 'luxe', 'economique'], i),
      road_access_type: pick(ROAD_TYPES, i),
      distance_to_main_road_m: randInt(10, 1000),
      distance_to_market_km: Math.round(Math.random() * 5 * 10) / 10,
      distance_to_school_km: Math.round(Math.random() * 3 * 10) / 10,
      distance_to_hospital_km: Math.round(Math.random() * 8 * 10) / 10,
      flood_risk_zone: i % 6 === 0,
      erosion_risk_zone: i % 7 === 0,
      market_value_usd: status === 'completed' ? randInt(15000, 200000) : null,
      assigned_at: assignedAt?.toISOString() ?? null,
      expertise_date: expertiseDate?.toISOString().split('T')[0] ?? null,
      created_at: createdAt.toISOString(),
    };
  });

  const allInserted: Array<{ id: string; reference_number: string }> = [];
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { data, error } = await supabase
      .from('real_estate_expertise_requests')
      .insert(batch)
      .select('id, reference_number');
    if (error) throw new Error(`Expertises (batch ${i}): ${error.message}`);
    allInserted.push(...assertInserted(data, 'Expertises'));
  }
  return allInserted;
};

/** Step 6b: Expertise payments */
export const generateExpertisePayments = async (userId: string, expertiseRequests: Array<{ id: string }>) => {
  if (!expertiseRequests || expertiseRequests.length === 0) return [];

  const records = expertiseRequests.map((req, i) => ({
    expertise_request_id: req.id,
    user_id: userId,
    total_amount_usd: randInt(100, 300),
    status: pick(['pending', 'paid', 'pending'], i),
    payment_method: pick(['mobile_money', 'bank_transfer', 'mobile_money'], i),
    fee_items: [
      { fee_name: 'Frais d\'expertise', amount_usd: randInt(80, 200) },
      { fee_name: 'Frais de déplacement', amount_usd: 50 },
    ],
    paid_at: i % 3 === 1 ? new Date().toISOString() : null,
    created_at: new Date(Date.now() - randInt(0, 10 * 365) * 24 * 3600 * 1000).toISOString(),
  }));

  const allInserted: Array<{ id: string }> = [];
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { data, error } = await supabase
      .from('expertise_payments')
      .insert(batch)
      .select('id');
    if (error) throw new Error(`Expertise payments (batch ${i}): ${error.message}`);
    allInserted.push(...assertInserted(data, 'Expertise payments'));
  }
  return allInserted;
};
