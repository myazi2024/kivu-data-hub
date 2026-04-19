import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import {
  PROVINCES, COLLECTIVITES_SR, CONSTRUCTION_NATURES, CONSTRUCTION_TYPES,
  CONSTRUCTION_MATERIALS, DECLARED_USAGES, LEGAL_STATUSES, OWNER_NAMES,
  PROPERTY_CATEGORIES, STANDINGS, TITLE_TYPES,
  assertInserted, getProvinceInfo, pick, randInt, randomDateInPast, seededInt,
  withRetry, BATCH_DELAY_MS,
} from './_shared';

/** Step 0b: Generate cadastral parcels (variable per province) */
export const generateParcels = async (parcelNumbers: string[]) => {
  const GROUPEMENTS_SR = ['Mudaka', 'Irhambi', 'Bugorhe', 'Miti', 'Katana'];
  const VILLAGES_SR = ['Mugogo', 'Nyantende', 'Walungu-Centre', 'Kamanyola', 'Luhihi', 'Mulamba'];
  const TERRITOIRES_SR = ['Kabare', 'Kalehe', 'Nyiragongo', 'Walungu', 'Uvira', 'Fizi'];

  const records = parcelNumbers.map((pn, idx) => {
    const { pIdx, localIdx, count } = getProvinceInfo(idx);
    const prov = PROVINCES[pIdx];
    const isSR = localIdx >= Math.floor(count * 0.75);
    const parcelType = isSR ? 'SR' : 'SU';
    const constructionNature = pick(CONSTRUCTION_NATURES, idx);
    const ownerSinceDate = randomDateInPast(10);

    const areaSqm = seededInt(idx * 7 + 1, 200, 5000);
    const sideN = seededInt(idx * 7 + 2, 10, 50), sideS = seededInt(idx * 7 + 3, 10, 50), sideE = seededInt(idx * 7 + 4, 10, 50), sideO = seededInt(idx * 7 + 5, 10, 50);
    const houseNumber = idx % 2 === 0 ? String(seededInt(idx * 7 + 6, 1, 200)) : null;

    return {
      parcel_number: pn,
      parcel_type: parcelType,
      property_title_type: pick(TITLE_TYPES, idx),
      location: `${prov.quartier}, ${prov.commune}`,
      area_sqm: areaSqm,
      current_owner_name: `Test ${pick(OWNER_NAMES, idx)}`,
      current_owner_since: ownerSinceDate,
      current_owner_legal_status: pick(LEGAL_STATUSES, idx),
      province: prov.province,
      ville: prov.ville,
      commune: prov.commune,
      quartier: prov.quartier,
      avenue: prov.avenue,
      declared_usage: pick(DECLARED_USAGES, idx),
      construction_type: constructionNature ? pick(CONSTRUCTION_TYPES.filter(t => t !== 'Terrain nu'), idx) : 'Terrain nu',
      construction_nature: constructionNature,
      construction_year: constructionNature ? seededInt(idx * 11 + 1, 1990, 2024) : null,
      construction_materials: constructionNature ? pick(CONSTRUCTION_MATERIALS, idx) : null,
      standing: constructionNature ? pick(STANDINGS, idx) : null,
      lease_type: localIdx % 7 === 0 ? 'initial' : localIdx % 11 === 0 ? 'renewal' : null,
      lease_years: isSR ? randInt(10, 99) : (localIdx % 7 === 0 ? randInt(5, 25) : null),
      is_subdivided: idx % 20 === 0,
      property_category: pick(PROPERTY_CATEGORIES, idx),
      groupement: isSR ? pick(GROUPEMENTS_SR, idx) : null,
      village: isSR ? pick(VILLAGES_SR, idx) : null,
      territoire: isSR ? pick(TERRITOIRES_SR, idx) : null,
      collectivite: isSR ? pick(COLLECTIVITES_SR, idx) : null,
      title_reference_number: `REF-${prov.province.substring(0, 3).toUpperCase()}-${String(idx).padStart(4, '0')}`,
      title_issue_date: randomDateInPast(10),
      house_number: houseNumber,
      whatsapp_number: `+243${seededInt(idx * 13 + 1, 810000000, 899999999)}`,
      has_dispute: idx % 10 === 0,
      is_title_in_current_owner_name: idx % 3 !== 0,
      is_occupied: constructionNature ? (idx % 10 < 7 ? true : idx % 10 < 9 ? false : null) : null,
      occupant_count: constructionNature && idx % 10 < 7 ? randInt(1, 8) : null,
      hosting_capacity: constructionNature ? randInt(2, 15) : null,
      floor_number: constructionNature ? String(randInt(0, 5)) : null,
      additional_constructions: idx % 5 === 0 && constructionNature
        ? [{ type: pick(['Garage', 'Dépendance', 'Kiosque', 'Clôture'], idx), usage: pick(['Stockage', 'Commerce', 'Habitation'], idx), surface_sqm: randInt(10, 80) }] as unknown as Json
        : null,
      sound_environment: pick(['tres_calme', 'calme', 'modere', 'bruyant', 'tres_bruyant'], idx),
      nearby_noise_sources: idx % 5 < 2 ? pick(['Route principale', 'Marché', 'Église', 'École', 'Usine', 'Aéroport'], idx) : null,
      parcel_sides: [
        { name: 'Nord', length: String(sideN) },
        { name: 'Sud', length: String(sideS) },
        { name: 'Est', length: String(sideE) },
        { name: 'Ouest', length: String(sideO) },
      ] as unknown as Json,
      gps_coordinates: [
        { lat: prov.lat + (Math.random() - 0.5) * 0.01, lng: prov.lng + (Math.random() - 0.5) * 0.01 },
        { lat: prov.lat + (Math.random() - 0.5) * 0.01, lng: prov.lng + (Math.random() - 0.5) * 0.01 },
        { lat: prov.lat + (Math.random() - 0.5) * 0.01, lng: prov.lng + (Math.random() - 0.5) * 0.01 },
        { lat: prov.lat + (Math.random() - 0.5) * 0.01, lng: prov.lng + (Math.random() - 0.5) * 0.01 },
      ] as unknown as Json,
    };
  });

  const PARCEL_BATCH = 50;
  const allInserted: Array<{ id: string; parcel_number: string }> = [];
  for (let i = 0; i < records.length; i += PARCEL_BATCH) {
    const batch = records.slice(i, i + PARCEL_BATCH);
    const result = await withRetry<Array<{ id: string; parcel_number: string }>>(async () => {
      const { data, error } = await supabase
        .from('cadastral_parcels')
        .insert(batch)
        .select('id, parcel_number');
      if (error) throw new Error(`Parcelles (batch ${i}): ${error.message}`);
      return assertInserted(data, 'Parcelles') as Array<{ id: string; parcel_number: string }>;
    }, `Parcelles batch ${i}`);
    allInserted.push(...result);
    if (i + PARCEL_BATCH < records.length) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
  }
  return allInserted;
};
