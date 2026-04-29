import { supabase } from '@/integrations/supabase/client';

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Generate a unique suffix to avoid duplicate parcel_number on repeated clicks */
export const uniqueSuffix = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomUUID().replace(/-/g, '').substring(0, 5).toUpperCase();
  return `${ts}-${rand}`;
};

/** Verify test mode is active on the server before generating */
export const verifyTestModeEnabled = async (): Promise<boolean> => {
  const { data } = await supabase
    .from('cadastral_search_config')
    .select('config_value')
    .eq('config_key', 'test_mode')
    .eq('is_active', true)
    .maybeSingle();

  if (!data?.config_value) return false;
  const config = data.config_value as Record<string, unknown>;
  return config.enabled === true;
};

/** Helper: assert insert returned rows */
export function assertInserted<T>(data: T[] | null, entity: string): T[] {
  if (!data || data.length === 0) {
    throw new Error(`${entity}: aucune ligne insérée (vérifiez les RLS policies)`);
  }
  return data;
}

/** Retry wrapper for transient network failures (TypeError: Failed to fetch) */
export async function withRetry<T>(fn: () => Promise<T>, label: string, maxRetries = 2): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isTransient =
        err instanceof TypeError && /failed to fetch/i.test(err.message);
      if (!isTransient || attempt === maxRetries) throw err;
      const delay = 500 * Math.pow(2, attempt);
      console.warn(`${label}: tentative ${attempt + 1} échouée, retry dans ${delay}ms…`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error(`${label}: échec après ${maxRetries + 1} tentatives`);
}

/** Throttle delay between batches to avoid rate limiting */
export const BATCH_DELAY_MS = 60;

/** Pick a deterministic item from an array based on index */
export function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

/** Random int between min and max (inclusive) */
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Seeded deterministic int for consistent values across generators */
export function seededInt(seed: number, min: number, max: number): number {
  const h = ((seed * 2654435761) >>> 0) % (max - min + 1);
  return min + h;
}

/**
 * Compute deterministic occupancy data (hosting_capacity, occupant_count, is_occupied)
 * for a given parcel index. Ensures both parcels.ts and contributions.ts produce
 * identical values so cross-table analytics (hosting-capacity × occupation, etc.) stay consistent.
 *
 * Distribution of hosting_capacity covers all 6 Analytics buckets:
 *   ~35% 1-2 | ~30% 3-5 | ~20% 6-10 | ~10% 11-20 | ~4% 21-50 | ~1% 51-150
 *
 * occupant_count is correlated to capacity to populate the 3 occupancy-pressure segments:
 *   ~25% under-occupied (ratio 0.2-0.4) | ~50% balanced (0.6-0.95) | ~15% saturated (1.05-1.4) | ~10% null
 */
export function computeOccupancy(
  idx: number,
  hasConstruction: boolean
): { hosting_capacity: number | null; occupant_count: number | null; is_occupied: boolean | null } {
  if (!hasConstruction) {
    return { hosting_capacity: null, occupant_count: null, is_occupied: null };
  }

  // Capacity bucket (deterministic via idx % 100)
  const capBucket = idx % 100;
  let hosting_capacity: number;
  if (capBucket < 35) hosting_capacity = seededInt(idx * 17 + 1, 1, 2);
  else if (capBucket < 65) hosting_capacity = seededInt(idx * 17 + 2, 3, 5);
  else if (capBucket < 85) hosting_capacity = seededInt(idx * 17 + 3, 6, 10);
  else if (capBucket < 95) hosting_capacity = seededInt(idx * 17 + 4, 11, 20);
  else if (capBucket < 99) hosting_capacity = seededInt(idx * 17 + 5, 21, 50);
  else hosting_capacity = seededInt(idx * 17 + 6, 51, 150);

  // Occupancy pressure bucket
  const occBucket = idx % 20; // 20 slots → 5/10/3/2 = 25/50/15/10%
  let occupant_count: number | null;
  let is_occupied: boolean | null;
  if (occBucket < 5) {
    // Under-occupied: ratio 0.2-0.4
    const ratio = 0.2 + (seededInt(idx * 19 + 1, 0, 20) / 100);
    occupant_count = Math.max(1, Math.round(hosting_capacity * ratio));
    is_occupied = true;
  } else if (occBucket < 15) {
    // Balanced: ratio 0.6-0.95
    const ratio = 0.6 + (seededInt(idx * 19 + 2, 0, 35) / 100);
    occupant_count = Math.max(1, Math.round(hosting_capacity * ratio));
    is_occupied = true;
  } else if (occBucket < 18) {
    // Saturated: ratio 1.05-1.4
    const ratio = 1.05 + (seededInt(idx * 19 + 3, 0, 35) / 100);
    occupant_count = Math.max(hosting_capacity + 1, Math.round(hosting_capacity * ratio));
    is_occupied = true;
  } else {
    // Vacant / not declared
    occupant_count = null;
    is_occupied = occBucket === 18 ? false : null;
  }

  return { hosting_capacity, occupant_count, is_occupied };
}

/** Return a random date in the past, formatted YYYY-MM-DD */
export function randomDateInPast(yearsBack: number): string {
  const now = Date.now();
  const past = now - yearsBack * 365.25 * 24 * 3600 * 1000;
  const d = new Date(past + Math.random() * (now - past));
  return d.toISOString().split('T')[0];
}

export interface GeneratedIds {
  parcelNumbers: string[];
  contributionIds: string[];
  invoiceIds: string[];
  paymentIds: string[];
  titleRequestIds: string[];
  expertiseIds: string[];
  disputeIds: string[];
  parcelIds: string[];
  fraudAttemptIds: string[];
  certificateIds: string[];
}

// ─── Province constants ────────────────────────────────────────────────────────

export const PROVINCES = [
  { province: 'Kinshasa', multiplier: 26, ville: 'Kinshasa', commune: 'Gombe', quartier: 'Socimat', avenue: 'Av. du Commerce', lat: -4.3250, lng: 15.3222 },
  { province: 'Haut-Katanga', multiplier: 25, ville: 'Lubumbashi', commune: 'Lubumbashi', quartier: 'Centre-ville', avenue: 'Av. Mobutu', lat: -11.6647, lng: 27.4794 },
  { province: 'Sud-Kivu', multiplier: 24, ville: 'Bukavu', commune: 'Ibanda', quartier: 'Ndendere', avenue: 'Av. Patrice Lumumba', lat: -2.5083, lng: 28.8608 },
  { province: 'Nord-Kivu', multiplier: 23, ville: 'Goma', commune: 'Goma', quartier: 'Himbi', avenue: 'Av. du Rond-Point', lat: -1.6580, lng: 29.2205 },
  { province: 'Ituri', multiplier: 22, ville: 'Bunia', commune: 'Bunia', quartier: 'Nyakasanza', avenue: 'Av. du Lac Albert', lat: 1.5667, lng: 30.2500 },
  { province: 'Kongo-Central', multiplier: 21, ville: 'Matadi', commune: 'Matadi', quartier: 'Ville-Basse', avenue: 'Av. du Port', lat: -5.8243, lng: 13.4531 },
  { province: 'Lualaba', multiplier: 20, ville: 'Kolwezi', commune: 'Dilala', quartier: 'Centre', avenue: 'Av. Lumumba', lat: -10.7167, lng: 25.4667 },
  { province: 'Tanganyika', multiplier: 19, ville: 'Kalemie', commune: 'Kalemie', quartier: 'Régideso', avenue: 'Av. des Palmiers', lat: -5.9333, lng: 29.1833 },
  { province: 'Tshopo', multiplier: 18, ville: 'Kisangani', commune: 'Makiso', quartier: 'Mangobo', avenue: 'Av. du 30 Juin', lat: 0.5167, lng: 25.2000 },
  { province: 'Kasaï-Oriental', multiplier: 17, ville: 'Mbuji-Mayi', commune: 'Bipemba', quartier: 'Bonzola', avenue: 'Av. Laurent-Désiré Kabila', lat: -6.1500, lng: 23.6000 },
  { province: 'Kwilu', multiplier: 16, ville: 'Kikwit', commune: 'Kikwit-Sud', quartier: 'Nzinda', avenue: 'Av. du Kwilu', lat: -5.0333, lng: 18.8167 },
  { province: 'Équateur', multiplier: 15, ville: 'Mbandaka', commune: 'Mbandaka', quartier: 'Basoko', avenue: 'Av. du Fleuve', lat: 0.0478, lng: 18.2603 },
  { province: 'Kasaï-Central', multiplier: 14, ville: 'Kananga', commune: 'Kananga', quartier: 'Katoka', avenue: 'Av. de l\'Indépendance', lat: -5.8960, lng: 22.4166 },
  { province: 'Haut-Lomami', multiplier: 13, ville: 'Kamina', commune: 'Kamina', quartier: 'Camp Vangu', avenue: 'Av. de la Gare', lat: -8.7333, lng: 25.0000 },
  { province: 'Maniema', multiplier: 12, ville: 'Kindu', commune: 'Kindu', quartier: 'Basoko', avenue: 'Av. du Congo', lat: -2.9500, lng: 25.9500 },
  { province: 'Lomami', multiplier: 11, ville: 'Kabinda', commune: 'Kabinda', quartier: 'Centre', avenue: 'Av. Mobutu', lat: -6.1333, lng: 24.4833 },
  { province: 'Kasaï', multiplier: 10, ville: 'Tshikapa', commune: 'Tshikapa', quartier: 'Kanzala', avenue: 'Av. de la Paix', lat: -6.4167, lng: 20.8000 },
  { province: 'Mongala', multiplier: 9, ville: 'Lisala', commune: 'Lisala', quartier: 'Centre', avenue: 'Av. Mobutu', lat: 2.1500, lng: 21.5167 },
  { province: 'Kwango', multiplier: 8, ville: 'Kenge', commune: 'Kenge', quartier: 'Centre', avenue: 'Av. Principale', lat: -4.8000, lng: 17.0333 },
  { province: 'Mai-Ndombe', multiplier: 7, ville: 'Inongo', commune: 'Inongo', quartier: 'Centre', avenue: 'Av. du Lac', lat: -1.9500, lng: 18.2667 },
  { province: 'Sankuru', multiplier: 6, ville: 'Lusambo', commune: 'Lusambo', quartier: 'Centre', avenue: 'Av. du Sankuru', lat: -4.9667, lng: 23.4333 },
  { province: 'Nord-Ubangi', multiplier: 5, ville: 'Gbadolite', commune: 'Gbadolite', quartier: 'Centre', avenue: 'Av. du Président', lat: 4.2833, lng: 21.0167 },
  { province: 'Sud-Ubangi', multiplier: 4, ville: 'Gemena', commune: 'Gemena', quartier: 'Centre', avenue: 'Av. de la Libération', lat: 3.2500, lng: 19.7667 },
  { province: 'Haut-Uélé', multiplier: 3, ville: 'Isiro', commune: 'Isiro', quartier: 'Centre', avenue: 'Av. de la Paix', lat: 2.7667, lng: 27.6167 },
  { province: 'Bas-Uélé', multiplier: 2, ville: 'Buta', commune: 'Buta', quartier: 'Centre', avenue: 'Av. de l\'Uélé', lat: 2.7833, lng: 24.7333 },
  { province: 'Tshuapa', multiplier: 1, ville: 'Boende', commune: 'Boende', quartier: 'Centre', avenue: 'Av. de la Tshuapa', lat: -0.2833, lng: 20.8667 },
];

export const BASE_PARCELS = 10;
export const getParcelsForProvince = (pIdx: number) => BASE_PARCELS * PROVINCES[pIdx].multiplier;

export const PROVINCE_OFFSETS: number[] = [];
{
  let cumul = 0;
  for (let p = 0; p < PROVINCES.length; p++) {
    PROVINCE_OFFSETS.push(cumul);
    cumul += getParcelsForProvince(p);
  }
}
export const TOTAL_PARCELS = PROVINCE_OFFSETS[PROVINCE_OFFSETS.length - 1] + getParcelsForProvince(PROVINCES.length - 1);

/**
 * Estimated counts produced by a full `generateTestData()` run.
 * Derived from `TOTAL_PARCELS` + heuristics matching the generators
 * (≈1 contribution/parcel, ≈1/3 invoiced, ≈60 % of invoices paid).
 * Update only if the generators ratios change.
 */
export function getExpectedTestDataCounts() {
  const parcels = TOTAL_PARCELS;
  return {
    parcels,
    contributions: parcels,
    invoices: Math.round(parcels / 3),
    payments: Math.round((parcels / 3) * 0.6),
    histories: Math.round(parcels * 0.14),
    permits: Math.round(parcels * 0.10),
    mortgages: Math.round(parcels * 0.08),
    boundaries: Math.round(parcels * 0.07),
    disputes: PROVINCES.length * 2,
    conflicts: PROVINCES.length * 2,
    certificates: PROVINCES.length * 2,
    mutations: PROVINCES.length * 2,
    subdivisions: PROVINCES.length,
    provinces: PROVINCES.length,
  };
}
export function getProvinceInfo(globalIdx: number): { pIdx: number; localIdx: number; count: number } {
  for (let p = PROVINCES.length - 1; p >= 0; p--) {
    if (globalIdx >= PROVINCE_OFFSETS[p]) {
      const count = getParcelsForProvince(p);
      return { pIdx: p, localIdx: globalIdx - PROVINCE_OFFSETS[p], count };
    }
  }
  return { pIdx: 0, localIdx: globalIdx, count: getParcelsForProvince(0) };
}

// ─── Domain constants ──────────────────────────────────────────────────────────

export const DECLARED_USAGES = ['Résidentiel', 'Commercial', 'Mixte', 'Institutionnel', 'Industriel', 'Agricole'];
export const CONSTRUCTION_NATURES: (string | null)[] = ['Durable', 'Semi-durable', 'Précaire', 'Durable', null];
export const TITLE_TYPES = ['Certificat d\'enregistrement', 'Contrat de location (Contrat d\'occupation provisoire)', 'Fiche parcellaire'];
export const LEGAL_STATUSES = ['Personne physique', 'Personne morale', 'État'];
export const CONSTRUCTION_TYPES = ['Résidentielle', 'Commerciale', 'Industrielle', 'Institutionnelle', 'Terrain nu'];
export const CONSTRUCTION_MATERIALS = ['Briques cuites', 'Parpaings', 'Bois', 'Tôles', 'Briques adobe'];
export const STANDINGS = ['Haut standing', 'Moyen standing', 'Économique'];
export const PROPERTY_CATEGORIES = ['Maison', 'Appartement', 'Terrain nu', 'Immeuble'];
export const COLLECTIVITES_SR = ['Kabare', 'Ngweshe', 'Kaziba', 'Buhavu', 'Kalehe'];
export const OWNER_NAMES = [
  'Kabongo Mwamba', 'Amani Baraka', 'Mukendi Tshiala', 'Ilunga Kasongo', 'Birindwa Ciza',
  'Ngoy Mwenze', 'Bashige Furaha', 'Mbuyi Kalala', 'Kyungu Mutombo', 'Lwamba Ngandu',
  'Banza Mukalay', 'Kikuni Shabani', 'Assumani Ramazani', 'Mapendo Sifa', 'Mbayo Ndaye',
  'Tshibangu Kazadi', 'Kapinga Nkulu', 'Lukusa Bondo', 'Kabeya Cibangu', 'Mwepu Kasanda',
];

// ─── Parcel Number Generator ───────────────────────────────────────────────────

export function generateParcelNumbers(suffix: string): string[] {
  const numbers: string[] = [];
  for (let pIdx = 0; pIdx < PROVINCES.length; pIdx++) {
    const count = getParcelsForProvince(pIdx);
    for (let i = 0; i < count; i++) {
      numbers.push(`TEST-${pIdx}-${String(i).padStart(3, '0')}-${suffix}`);
    }
  }
  return numbers;
}
