import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Generate a unique suffix to avoid duplicate parcel_number on repeated clicks */
export const uniqueSuffix = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
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
function assertInserted<T>(data: T[] | null, entity: string): T[] {
  if (!data || data.length === 0) {
    throw new Error(`${entity}: aucune ligne insérée (vérifiez les RLS policies)`);
  }
  return data;
}

/** Pick a deterministic item from an array based on index */
function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

/** Random int between min and max (inclusive) */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Return a random date between two years ago offset and now, formatted YYYY-MM-DD */
function randomDateInPast(yearsBack: number): string {
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

// ─── Constants ─────────────────────────────────────────────────────────────────

const PROVINCES = [
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

const BASE_PARCELS = 20; // 15 SU + 5 SR per multiplier unit
const getParcelsForProvince = (pIdx: number) => BASE_PARCELS * PROVINCES[pIdx].multiplier;

// Pre-compute cumulative offsets for fast global-index → province lookup
const PROVINCE_OFFSETS: number[] = [];
{
  let cumul = 0;
  for (let p = 0; p < PROVINCES.length; p++) {
    PROVINCE_OFFSETS.push(cumul);
    cumul += getParcelsForProvince(p);
  }
}
const TOTAL_PARCELS = PROVINCE_OFFSETS[PROVINCE_OFFSETS.length - 1] + getParcelsForProvince(PROVINCES.length - 1);

function getProvinceInfo(globalIdx: number): { pIdx: number; localIdx: number; count: number } {
  for (let p = PROVINCES.length - 1; p >= 0; p--) {
    if (globalIdx >= PROVINCE_OFFSETS[p]) {
      const count = getParcelsForProvince(p);
      return { pIdx: p, localIdx: globalIdx - PROVINCE_OFFSETS[p], count };
    }
  }
  return { pIdx: 0, localIdx: globalIdx, count: getParcelsForProvince(0) };
}

const DECLARED_USAGES = ['Résidentiel', 'Commercial', 'Mixte', 'Institutionnel', 'Industriel', 'Agricole'];
const CONSTRUCTION_NATURES: (string | null)[] = ['Durable', 'Semi-durable', 'Précaire', 'Durable', null]; // ~20% null
const TITLE_TYPES = ['Certificat d\'enregistrement', 'Contrat de location (Contrat d\'occupation provisoire)', 'Fiche parcellaire'];
const LEGAL_STATUSES = ['Personne physique', 'Personne morale'];
const CONSTRUCTION_TYPES = ['Résidentielle', 'Commerciale', 'Industrielle', 'Institutionnelle', 'Terrain nu'];
const CONSTRUCTION_MATERIALS = ['Briques cuites', 'Parpaings', 'Bois', 'Tôles', 'Briques adobe'];
const STANDINGS = ['Haut standing', 'Moyen standing', 'Économique'];
const PROPERTY_CATEGORIES = ['Maison', 'Appartement', 'Terrain nu', 'Immeuble'];
const COLLECTIVITES_SR = ['Kabare', 'Ngweshe', 'Kaziba', 'Buhavu', 'Kalehe'];
const OWNER_NAMES = [
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
  return numbers; // Total: 7 020
}

// ─── Step 0b: Generate 7 020 cadastral parcels (26 provinces × variable) ──────

export const generateParcels = async (parcelNumbers: string[]) => {
  const records = parcelNumbers.map((pn, idx) => {
    const { pIdx, localIdx, count } = getProvinceInfo(idx);
    const prov = PROVINCES[pIdx];
    const isSR = localIdx >= Math.floor(count * 0.75);
    const parcelType = isSR ? 'SR' : 'SU';
    const constructionNature = pick(CONSTRUCTION_NATURES, idx);
    const ownerSinceDate = randomDateInPast(10);

    const sideN = randInt(10, 50), sideS = randInt(10, 50), sideE = randInt(10, 50), sideO = randInt(10, 50);

    return {
      parcel_number: pn,
      parcel_type: parcelType,
      property_title_type: pick(TITLE_TYPES, idx),
      location: `${prov.quartier}, ${prov.commune}`,
      area_sqm: randInt(200, 5000),
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
      construction_year: constructionNature ? randInt(1990, 2024) : null,
      construction_materials: constructionNature ? pick(CONSTRUCTION_MATERIALS, idx) : null,
      standing: constructionNature ? pick(STANDINGS, idx) : null,
      lease_type: localIdx % 7 === 0 ? 'initial' : localIdx % 11 === 0 ? 'renewal' : null,
      title_reference_number: `REF-${prov.province.substring(0, 3).toUpperCase()}-${String(idx).padStart(4, '0')}`,
      title_issue_date: randomDateInPast(10),
      house_number: idx % 2 === 0 ? String(randInt(1, 200)) : null,
      whatsapp_number: `+243${randInt(810000000, 899999999)}`,
      has_dispute: idx % 10 === 0,
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

  // Insert in batches of 50 to stay under payload limits
  const allInserted: Array<{ id: string; parcel_number: string }> = [];
  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { data, error } = await supabase
      .from('cadastral_parcels')
      .insert(batch)
      .select('id, parcel_number');
    if (error) throw new Error(`Parcelles (batch ${i}): ${error.message}`);
    allInserted.push(...assertInserted(data, 'Parcelles'));
  }
  return allInserted;
};

// ─── Step 1: Generate 520 contributions (1 per parcel) ─────────────────────────

export const generateContributions = async (userId: string, parcelNumbers: string[]) => {
  const STATUSES_CYCLE = ['approved', 'pending', 'rejected', 'pending', 'approved'];
  const TYPES_CYCLE: Array<'creation' | 'update'> = ['creation', 'creation', 'update', 'creation', 'creation'];

  const records = parcelNumbers.map((pn, idx) => {
    const { pIdx, localIdx, count } = getProvinceInfo(idx);
    const prov = PROVINCES[pIdx];
    const constructionNature = pick(CONSTRUCTION_NATURES, idx);
    const isSuspicious = idx % 13 === 0; // ~8% suspicious

    const isSR = localIdx >= Math.floor(count * 0.75);
    const ownerName = pick(OWNER_NAMES, idx);
    const ownerParts = ownerName.split(' ');
    const constructionYear = constructionNature ? randInt(1990, 2024) : null;
    const sideN = randInt(10, 50), sideS = randInt(10, 50), sideE = randInt(10, 50), sideO = randInt(10, 50);

    return {
      parcel_number: pn,
      property_title_type: pick(TITLE_TYPES, idx),
      current_owner_name: `Test ${ownerName}`,
      area_sqm: randInt(200, 5000),
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
      current_owner_legal_status: pick(LEGAL_STATUSES, idx),
      property_category: pick(PROPERTY_CATEGORIES, idx),
      title_reference_number: `REF-${prov.province.substring(0, 3).toUpperCase()}-${String(idx).padStart(4, '0')}`,
      title_issue_date: randomDateInPast(10),
      house_number: idx % 2 === 0 ? String(randInt(1, 200)) : null,
      floor_number: constructionNature ? String(randInt(0, 3)) : null,
      apartment_number: idx % 15 === 0 ? `A${randInt(1, 20)}` : null,
      whatsapp_number: `+243${randInt(810000000, 899999999)}`,
      current_owners_details: [{
        lastName: ownerParts[0] || 'Test',
        firstName: ownerParts[1] || 'Utilisateur',
        middleName: idx % 3 === 0 ? 'Mutombo' : '',
        gender: idx % 2 === 0 ? 'Masculin' : 'Féminin',
        legalStatus: pick(LEGAL_STATUSES, idx),
        since: randomDateInPast(10),
        entityType: '', entitySubType: '', entitySubTypeOther: '',
        stateExploitedBy: '', rightType: '',
      }] as unknown as Json,
      building_permits: constructionNature ? [{
        permitType: idx % 3 === 0 ? 'regularization' : 'construction',
        permitNumber: `PC-${randInt(2018, 2025)}-${String(randInt(1, 999)).padStart(3, '0')}`,
        issueDate: randomDateInPast(5),
        validityMonths: '36',
        issuingService: "Division Provinciale de l'Urbanisme",
      }] as unknown as Json : null,
      parcel_sides: [
        { name: 'Nord', length: String(sideN) },
        { name: 'Sud', length: String(sideS) },
        { name: 'Est', length: String(sideE) },
        { name: 'Ouest', length: String(sideO) },
      ] as unknown as Json,
      road_sides: [{ sideIndex: 0, roadName: prov.avenue }] as unknown as Json,
      servitude_data: (idx % 4 === 0
        ? { hasServitude: true, width: randInt(1, 3) }
        : { hasServitude: false }) as unknown as Json,
      building_shapes: constructionNature
        ? [{ type: 'rectangle', x: 50, y: 50, width: randInt(30, 80), height: randInt(20, 60) }] as unknown as Json
        : [] as unknown as Json,
      ownership_history: idx % 3 === 0 ? [{
        name: `Ancien ${pick(OWNER_NAMES, idx + 5)}`,
        legalStatus: 'Personne physique',
        startDate: randomDateInPast(10),
        endDate: randomDateInPast(5),
        mutationType: pick(['Vente', 'Donation', 'Succession'], idx),
      }] as unknown as Json : [] as unknown as Json,
      tax_history: [{
        taxType: 'Impôt foncier annuel',
        taxYear: String(new Date().getFullYear() - 1),
        taxAmount: String(randInt(20, 200)),
        paymentStatus: 'Payé',
        paymentDate: randomDateInPast(1),
      }] as unknown as Json,
      has_dispute: idx % 10 === 0,
      dispute_data: idx % 10 === 0
        ? { type: 'delimitation', description: 'Test litige de délimitation' } as unknown as Json
        : null,
      mortgage_history: idx % 8 === 0 ? [{
        mortgageAmount: String(randInt(5000, 50000)),
        duration: '60',
        creditorName: 'Rawbank',
        creditorType: 'Banque',
        contractDate: randomDateInPast(5),
        mortgageStatus: 'Active',
      }] as unknown as Json : [] as unknown as Json,
      created_at: new Date(Date.now() - randInt(0, 10 * 365) * 24 * 3600 * 1000).toISOString(),
    };
  });

  // Insert in batches
  const allInserted: Array<{ id: string; parcel_number: string }> = [];
  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { data, error } = await supabase
      .from('cadastral_contributions')
      .insert(batch)
      .select('id, parcel_number');
    if (error) throw new Error(`Contributions (batch ${i}): ${error.message}`);
    allInserted.push(...assertInserted(data, 'Contributions'));
  }

  // Now update non-pending statuses — grouped by status to avoid N+1 queries
  const statusGroups: Record<string, string[]> = {};
  for (let i = 0; i < allInserted.length; i++) {
    const finalStatus = pick(STATUSES_CYCLE, i);
    if (finalStatus !== 'pending') {
      if (!statusGroups[finalStatus]) statusGroups[finalStatus] = [];
      statusGroups[finalStatus].push(allInserted[i].id);
    }
  }
  for (const [status, ids] of Object.entries(statusGroups)) {
    // Batch the .in() calls in chunks of 200 to stay under Supabase limits
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      await supabase
        .from('cadastral_contributions')
        .update({ status })
        .in('id', chunk);
    }
  }

  return allInserted;
};

// ─── Step 2: Generate invoices (~30% of parcels) ──────────────────────────────

export const generateInvoices = async (userId: string, parcelNumbers: string[]) => {
  const SERVICES_POOL: Json[][] = [
    ['carte_cadastrale', 'fiche_identification'],
    ['carte_cadastrale'],
    ['fiche_identification', 'certificat_bornage'],
    ['carte_cadastrale', 'certificat_bornage'],
  ];
  const INV_STATUSES = ['paid', 'pending', 'paid', 'paid', 'pending'];
  const selectedParcels = parcelNumbers.filter((_, i) => i % 3 === 0); // ~33%

  const records = selectedParcels.map((pn, i) => ({
    parcel_number: pn,
    invoice_number: `TEST-INV-${Date.now().toString(36)}-${i}`,
    selected_services: pick(SERVICES_POOL, i) as unknown as Json,
    total_amount_usd: randInt(5, 25),
    client_email: `test${i + 1}@example.com`,
    client_name: `Test User ${i + 1}`,
    status: pick(INV_STATUSES, i),
    user_id: userId,
    geographical_zone: PROVINCES[Math.floor(i / (selectedParcels.length / PROVINCES.length)) % PROVINCES.length]?.province ?? 'Kinshasa',
    created_at: new Date(Date.now() - randInt(0, 10 * 365) * 24 * 3600 * 1000).toISOString(),
  }));

  // Insert in batches
  const allInserted: Array<{ id: string; parcel_number: string; status: string }> = [];
  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { data, error } = await supabase
      .from('cadastral_invoices')
      .insert(batch)
      .select('id, parcel_number, status');
    if (error) throw new Error(`Factures (batch ${i}): ${error.message}`);
    allInserted.push(...assertInserted(data, 'Factures'));
  }
  return allInserted;
};

// ─── Step 3: Generate payments for paid invoices ──────────────────────────────

export const generatePayments = async (
  userId: string,
  invoices: Array<{ id: string; parcel_number: string; status: string }>
) => {
  const paidInvoices = invoices.filter((inv) => inv.status === 'paid');
  if (paidInvoices.length === 0) return [];

  const METHODS = ['mobile_money', 'card', 'bank_transfer'];
  const PROVIDERS = ['airtel_money', 'stripe', 'orange_money', 'vodacom_mpesa'];

  const records = paidInvoices.map((inv, i) => ({
    invoice_id: inv.id,
    amount_usd: randInt(5, 25),
    payment_method: pick(METHODS, i),
    provider: pick(PROVIDERS, i),
    status: 'completed',
    phone_number: i % 2 === 0 ? `+24380000${String(i).padStart(4, '0')}` : null,
    transaction_reference: `TEST-TXN-${Date.now()}-${i}`,
    user_id: userId,
    metadata: { test_mode: 'true', generated_at: new Date().toISOString() } as unknown as Json,
    created_at: new Date(Date.now() - randInt(0, 10 * 365) * 24 * 3600 * 1000).toISOString(),
  }));

  // Insert in batches
  const allInserted: Array<{ id: string }> = [];
  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { data, error } = await supabase
      .from('payment_transactions')
      .insert(batch)
      .select('id');
    if (error) throw new Error(`Paiements (batch ${i}): ${error.message}`);
    allInserted.push(...assertInserted(data, 'Paiements'));
  }
  return allInserted;
};

// ─── Step 4: Generate service access for paid invoices ────────────────────────

export const generateServiceAccess = async (
  userId: string,
  invoices: Array<{ id: string; parcel_number: string; status: string }>
) => {
  const paidInvoices = invoices.filter((inv) => inv.status === 'paid');
  if (paidInvoices.length === 0) return;

  const SERVICE_TYPES = ['carte_cadastrale', 'fiche_identification', 'certificat_bornage'];

  const records = paidInvoices.flatMap((inv, i) => {
    const count = (i % 2) + 1; // 1 or 2 services
    return SERVICE_TYPES.slice(0, count).map((svc) => ({
      parcel_number: inv.parcel_number,
      invoice_id: inv.id,
      service_type: svc,
      user_id: userId,
    }));
  });

  // Insert in batches
  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { error } = await supabase
      .from('cadastral_service_access')
      .insert(batch);
    if (error) console.error(`Accès services (batch ${i}, non bloquant):`, error);
  }
};

// ─── Step 5: Title requests — 52 total (2/province) ─────────────────────────

export const generateTitleRequests = async (userId: string, suffix: string) => {
  const FIRST_NAMES = ['Jean', 'Marie', 'Patrick', 'Chantal', 'Pierre', 'Grace', 'David', 'Sophie', 'Joseph', 'Alice'];
  const LAST_NAMES = ['Kabongo', 'Amani', 'Mwamba', 'Furaha', 'Mukendi', 'Baraka', 'Ilunga', 'Sifa', 'Ngoy', 'Mapendo'];
  const REQ_STATUSES = ['pending', 'approved', 'rejected', 'pending', 'approved', 'pending', 'rejected', 'approved', 'pending', 'approved'];
  const PAY_STATUSES = ['pending', 'paid', 'paid', 'pending', 'paid', 'pending', 'paid', 'paid', 'pending', 'paid'];

  const totalCount = PROVINCES.length * 2; // 2 per province
  const records = Array.from({ length: totalCount }, (_, i) => {
    const prov = PROVINCES[Math.floor(i / 2)];
    const isRural = i % 3 === 0;
    return {
      reference_number: `TEST-LTR-${String(i + 1).padStart(3, '0')}-${suffix}`,
      user_id: userId,
      requester_first_name: pick(FIRST_NAMES, i),
      requester_last_name: pick(LAST_NAMES, i),
      requester_phone: `+24380000${String(10 + i).padStart(4, '0')}`,
      requester_email: `test-titre${i + 1}@example.com`,
      requester_type: i % 3 === 0 ? 'mandataire' : 'proprietaire',
      requester_gender: i % 2 === 0 ? 'M' : 'F',
      requester_legal_status: pick(LEGAL_STATUSES, i),
      nationality: i % 5 === 0 ? 'Belgique' : 'RDC',
      section_type: isRural ? 'rural' : 'urbain',
      province: prov.province,
      ville: prov.ville,
      commune: prov.commune,
      quartier: isRural ? null : prov.quartier,
      territoire: isRural ? 'Kabare' : null,
      declared_usage: pick(DECLARED_USAGES, i),
      area_sqm: randInt(200, 3000),
      construction_nature: i % 4 === 0 ? null : pick(['Durable', 'Semi-durable', 'Précaire'], i),
      occupation_duration: pick(['moins_1_an', '1_3_ans', '3_5_ans', '5_ans_plus'], i),
      estimated_processing_days: randInt(20, 90),
      status: pick(REQ_STATUSES, i),
      rejection_reason: pick(REQ_STATUSES, i) === 'rejected' ? 'Documents incomplets (données de test)' : null,
      payment_status: pick(PAY_STATUSES, i),
      total_amount_usd: randInt(50, 150),
      fee_items: [
        { fee_name: 'Frais de dossier', amount_usd: 50 },
        ...(i % 2 === 0 ? [{ fee_name: 'Frais de mesurage', amount_usd: 25 }] : []),
      ] as unknown as Json,
      created_at: new Date(Date.now() - randInt(0, 10 * 365) * 24 * 3600 * 1000).toISOString(),
    };
  });

  // Insert in batches
  const allInserted: Array<{ id: string }> = [];
  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { data, error } = await supabase
      .from('land_title_requests')
      .insert(batch)
      .select('id');
    if (error) throw new Error(`Demandes de titres (batch ${i}): ${error.message}`);
    allInserted.push(...assertInserted(data, 'Demandes de titres'));
  }
  return allInserted;
};

// ─── Step 6: Expertise requests — 52 total (2/province) ─────────────────────

export const generateExpertiseRequests = async (userId: string, parcelNumbers: string[], suffix: string) => {
  const EXP_STATUSES = ['pending', 'completed', 'in_progress', 'pending', 'completed', 'pending', 'in_progress', 'completed', 'pending', 'completed'];
  const ROAD_TYPES = ['asphalte', 'terre', 'piste', 'asphalte', 'terre'];

  // Pick 2 parcels per province (52 total)
  const selectedParcels = parcelNumbers.filter((_, i) => i % 10 === 0).slice(0, PROVINCES.length * 2);

  const records = selectedParcels.map((pn, i) => ({
    reference_number: `TEST-EXP-${String(i + 1).padStart(3, '0')}-${suffix}`,
    parcel_number: pn,
    user_id: userId,
    requester_name: `Test Expert ${i + 1}`,
    requester_email: `test-exp${i + 1}@example.com`,
    requester_phone: `+24380000${String(20 + i).padStart(4, '0')}`,
    status: pick(EXP_STATUSES, i),
    property_description: `Parcelle test ${i + 1} pour expertise immobilière`,
    construction_year: i % 3 === 0 ? null : randInt(1995, 2023),
    number_of_floors: i % 3 === 0 ? 0 : randInt(1, 4),
    total_built_area_sqm: i % 3 === 0 ? 0 : randInt(80, 500),
    has_garden: i % 2 === 0,
    garden_area_sqm: i % 2 === 0 ? randInt(50, 300) : 0,
    has_electricity: i % 3 !== 2,
    has_water_supply: i % 4 !== 3,
    has_internet: i % 3 === 0,
    has_parking: i % 2 === 0,
    parking_spaces: i % 2 === 0 ? randInt(1, 4) : 0,
    has_security_system: i % 5 === 0,
    construction_quality: pick(['standard', 'luxe', 'economique'], i),
    road_access_type: pick(ROAD_TYPES, i),
    distance_to_main_road_m: randInt(10, 1000),
    distance_to_market_km: Math.round(Math.random() * 5 * 10) / 10,
    distance_to_school_km: Math.round(Math.random() * 3 * 10) / 10,
    distance_to_hospital_km: Math.round(Math.random() * 8 * 10) / 10,
    flood_risk_zone: i % 6 === 0,
    erosion_risk_zone: i % 7 === 0,
    market_value_usd: pick(EXP_STATUSES, i) === 'completed' ? randInt(15000, 200000) : null,
    created_at: new Date(Date.now() - randInt(0, 10 * 365) * 24 * 3600 * 1000).toISOString(),
  }));

  // Insert in batches
  const allInserted: Array<{ id: string; reference_number: string }> = [];
  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { data, error } = await supabase
      .from('real_estate_expertise_requests')
      .insert(batch)
      .select('id, reference_number');
    if (error) throw new Error(`Expertises (batch ${i}): ${error.message}`);
    allInserted.push(...assertInserted(data, 'Expertises'));
  }
  return allInserted;
};

// ─── Step 6b: Expertise payments ──────────────────────────────────────────────

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

  const { data, error } = await supabase
    .from('expertise_payments')
    .insert(records)
    .select('id');

  if (error) throw new Error(`Expertise payments: ${error.message}`);
  return data ?? [];
};

// ─── Step 7: Disputes — 52 total (2/province) ───────────────────────────────

export const generateDisputes = async (parcelNumbers: string[], suffix: string, userId?: string) => {
  const DISPUTE_NATURES = ['delimitation', 'double_vente', 'occupation_illegale', 'succession', 'delimitation'];
  const DISPUTE_STATUSES = ['en_cours', 'resolu', 'demande_levee', 'en_cours', 'resolu', 'en_cours', 'demande_levee', 'resolu', 'en_cours', 'resolu'];
  const QUALITIES = ['proprietaire', 'occupant', 'heritier', 'mandataire', 'proprietaire'];

  // Pick 2 parcels per province (52 total)
  const selectedParcels = parcelNumbers.filter((_, i) => i % 10 === 5).slice(0, PROVINCES.length * 2);

  const records = selectedParcels.map((pn, i) => {
    const status = pick(DISPUTE_STATUSES, i);
    return {
      reference_number: `TEST-DISP-${String(i + 1).padStart(3, '0')}-${suffix}`,
      parcel_number: pn,
      dispute_type: 'report',
      dispute_nature: pick(DISPUTE_NATURES, i),
      declarant_name: `Test Déclarant ${i + 1}`,
      declarant_quality: pick(QUALITIES, i),
      declarant_phone: `+24380000${String(30 + i).padStart(4, '0')}`,
      declarant_email: `test-decl${i + 1}@example.com`,
      current_status: status,
      reported_by: userId ?? null,
      dispute_start_date: randomDateInPast(8),
      dispute_description: `Litige de test #${i + 1}: ${pick(DISPUTE_NATURES, i)}`,
      resolution_level: status === 'resolu' ? 'conciliation_amiable' : null,
      resolution_details: status === 'resolu' ? 'Résolu à l\'amiable (données de test)' : null,
      lifting_status: status === 'demande_levee' ? 'en_cours' : null,
      lifting_reason: status === 'demande_levee' ? 'conciliation_reussie' : null,
      lifting_request_reference: status === 'demande_levee' ? `TEST-LEV-${String(i + 1).padStart(3, '0')}-${suffix}` : null,
      parties_involved: [
        { name: `Test Partie ${i * 2 + 1}`, role: 'demandeur' },
        { name: `Test Partie ${i * 2 + 2}`, role: 'défendeur' },
      ] as unknown as Json,
      created_at: new Date(Date.now() - randInt(0, 10 * 365) * 24 * 3600 * 1000).toISOString(),
    };
  });

  // Insert in batches
  const allInserted: Array<{ id: string }> = [];
  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { data, error } = await supabase
      .from('cadastral_land_disputes')
      .insert(batch)
      .select('id');
    if (error) throw new Error(`Litiges (batch ${i}): ${error.message}`);
    allInserted.push(...assertInserted(data, 'Litiges'));
  }
  return allInserted;
};

// ─── Step 8: Contributor codes — ~30 (30% of contributions) ──────────────────

export const generateContributorCodes = async (
  userId: string,
  contributions: Array<{ id: string; parcel_number: string }>
) => {
  const codeSuffix = Date.now().toString(36).toUpperCase();
  const selected = contributions.filter((_, i) => i % 3 === 0); // ~33%

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

  // Insert in batches
  const allInserted: Array<{ id: string }> = [];
  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { data, error } = await supabase
      .from('cadastral_contributor_codes')
      .insert(batch)
      .select('id');
    if (error) throw new Error(`Codes CCC (batch ${i}): ${error.message}`);
    allInserted.push(...assertInserted(data, 'Codes CCC'));
  }
  return allInserted;
};

// ─── Step 9: Fraud attempts — 52 (2/province) ───────────────────────────────

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

  const { data, error } = await supabase
    .from('fraud_attempts')
    .insert(records)
    .select('id');

  if (error) console.error('Fraud attempts (non-bloquant):', error);
  return data ?? [];
};

// ─── Step 10: Boundary conflicts ──────────────────────────────────────────────

export const generateBoundaryConflicts = async (parcelNumbers: string[], userId?: string) => {
  const CONFLICT_TYPES = ['chevauchement', 'borne_deplacee', 'empiétement', 'chevauchement'];
  const STATUSES = ['en_cours', 'resolu', 'en_cours', 'resolu'];

  // Create conflicts between neighboring parcels within each province
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
    const base = pIdx * PARCELS_PER_PROVINCE;
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

// ─── Step 11: Ownership history — 20 parcels × 2 owners ─────────────────────

export const generateOwnershipHistory = async (
  parcels: Array<{ id: string; parcel_number: string }>
) => {
  const selected = parcels.filter((_, i) => i % 5 === 0); // 20 parcels
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

  const { data, error } = await supabase
    .from('cadastral_ownership_history')
    .insert(records)
    .select('id');

  if (error) console.error('Historique propriété (non-bloquant):', error);
  return data ?? [];
};

// ─── Step 12: Tax history — 20 parcels × 3 years ────────────────────────────

export const generateTaxHistory = async (
  parcels: Array<{ id: string; parcel_number: string }>
) => {
  const currentYear = new Date().getFullYear();
  const selected = parcels.filter((_, i) => i % 5 === 0); // 20 parcels

  const records = selected.flatMap((p, i) =>
    [0, 1, 2].map((yearOffset) => ({
      parcel_id: p.id,
      tax_year: currentYear - 2 + yearOffset,
      amount_usd: randInt(20, 300),
      payment_status: (yearOffset === 2 && i % 3 !== 0) ? 'unpaid' : 'paid',
      payment_date: (yearOffset === 2 && i % 3 !== 0) ? null : `${currentYear - 2 + yearOffset}-${String(randInt(1, 6)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
    }))
  );

  const { data, error } = await supabase
    .from('cadastral_tax_history')
    .insert(records)
    .select('id');

  if (error) console.error('Historique taxes (non-bloquant):', error);
  return data ?? [];
};

// ─── Step 13: Boundary history — 10 parcels ─────────────────────────────────

export const generateBoundaryHistory = async (
  parcels: Array<{ id: string; parcel_number: string }>
) => {
  const selected = parcels.filter((_, i) => i % 10 === 0).slice(0, 10);
  const PURPOSES = ['Réajustement ou rectification', 'Morcellement ou fusion', 'Mise en valeur ou mutation'];

  const records = selected.map((p, i) => ({
    parcel_id: p.id,
    pv_reference_number: `TEST-PV-${Date.now().toString(36)}-${i}`,
    surveyor_name: `Géomètre Test ${i + 1}`,
    survey_date: randomDateInPast(8),
    boundary_purpose: pick(PURPOSES, i),
  }));

  const { data, error } = await supabase
    .from('cadastral_boundary_history')
    .insert(records)
    .select('id');

  if (error) console.error('Historique bornages (non-bloquant):', error);
  return data ?? [];
};

// ─── Step 14: Mortgages — 10 parcels ────────────────────────────────────────

export const generateMortgages = async (
  parcels: Array<{ id: string; parcel_number: string }>
) => {
  const selected = parcels.filter((_, i) => i % 10 === 3).slice(0, 10);
  const CREDITORS = ['Banque Commerciale du Congo', 'Trust Merchant Bank', 'Rawbank', 'Equity BCDC', 'KCB Bank'];
  const CREDITOR_TYPES = ['Banque', 'Microfinance', 'Banque', 'Banque', 'Microfinance'];
  const STATUSES = ['Active', 'Renégociée', 'Soldée', 'Active', 'Active'];

  const records = selected.map((p, i) => ({
    parcel_id: p.id,
    creditor_name: pick(CREDITORS, i),
    creditor_type: pick(CREDITOR_TYPES, i),
    mortgage_amount_usd: randInt(10000, 100000),
    duration_months: pick([36, 60, 120, 84, 48], i),
    contract_date: randomDateInPast(8),
    mortgage_status: pick(STATUSES, i),
    reference_number: `TEST-HYP-${Date.now().toString(36)}-${i}`,
  }));

  const { data, error } = await supabase
    .from('cadastral_mortgages')
    .insert(records)
    .select('id');

  if (error) console.error('Hypothèques (non-bloquant):', error);
  return data ?? [];
};

// ─── Step 15: Building permits — 10 parcels ─────────────────────────────────

export const generateBuildingPermits = async (
  parcels: Array<{ id: string; parcel_number: string }>
) => {
  const selected = parcels.filter((_, i) => i % 10 === 7).slice(0, 10);
  const SERVICES = [
    'Division Provinciale de l\'Urbanisme et Habitat - Kinshasa',
    'Service Communal d\'Urbanisme - Goma',
    'Division Provinciale Urbanisme - Bukavu',
    'Service Urbanisme - Lubumbashi',
    'Division Urbanisme - Matadi',
  ];
  const ADM_STATUSES = ['Approuvé', 'Rejeté', 'Approuvé', 'Approuvé', 'Rejeté'];

  const records = selected.map((p, i) => ({
    parcel_id: p.id,
    permit_number: `TEST-PC-${Date.now().toString(36)}-${i}`,
    issue_date: randomDateInPast(5),
    issuing_service: pick(SERVICES, i),
    validity_period_months: pick([12, 24, 36], i),
    administrative_status: pick(ADM_STATUSES, i),
    is_current: i % 3 !== 1,
  }));

  const { data, error } = await supabase
    .from('cadastral_building_permits')
    .insert(records)
    .select('id');

  if (error) console.error('Autorisation de bâtir (non-bloquant):', error);
  return data ?? [];
};

// ─── Step 16: Certificates — 52 total (2/province) ─────────────────────────

export const generateCertificates = async (
  parcelNumbers: string[],
  suffix: string,
  userId?: string
) => {
  const CERT_TYPES = ['titre_foncier', 'mutation_fonciere', 'certificat_enregistrement', 'titre_foncier', 'mutation_fonciere'];
  const selectedParcels = parcelNumbers.filter((_, i) => i % 10 === 2).slice(0, PROVINCES.length * 2);

  const records = selectedParcels.map((pn, i) => ({
    reference_number: `TEST-CERT-${String(i + 1).padStart(3, '0')}-${suffix}`,
    certificate_type: pick(CERT_TYPES, i),
    parcel_number: pn,
    recipient_name: `Test Propriétaire ${i + 1}`,
    status: 'generated',
    generated_by: userId ?? null,
    metadata: { test_mode: true } as unknown as Json,
    generated_at: new Date(Date.now() - randInt(0, 10 * 365) * 24 * 3600 * 1000).toISOString(),
  }));

  const { data, error } = await supabase
    .from('generated_certificates')
    .insert(records)
    .select('id');

  if (error) console.error('Certificats (non-bloquant):', error);
  return data ?? [];
};

// ─── Step 17a: Mutation requests — 52 total (2/province) ────────────────────

export const generateMutationRequests = async (
  userId: string,
  parcels: Array<{ id: string; parcel_number: string }>,
  suffix: string
) => {
  const MUT_TYPES = ['vente', 'donation', 'succession', 'vente', 'donation'];
  const MUT_STATUSES = ['pending', 'approved', 'rejected', 'pending', 'approved', 'pending', 'rejected', 'approved', 'pending', 'approved'];
  const selected = parcels.filter((_, i) => i % 10 === 4).slice(0, PROVINCES.length * 2);

  const records = selected.map((p, i) => {
    const status = pick(MUT_STATUSES, i);
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
      user_id: userId,
      proposed_changes: { new_owner_name: `Test Nouveau Propriétaire ${i + 1}`, new_owner_legal_status: pick(LEGAL_STATUSES, i) } as unknown as Json,
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

  if (error) console.error('Mutations (non-bloquant):', error);
  return data ?? [];
};

// ─── Step 17b: Subdivision requests — 26 total (1/province) ─────────────────

export const generateSubdivisionRequests = async (
  userId: string,
  parcels: Array<{ id: string; parcel_number: string }>,
  suffix: string
) => {
  const SUB_STATUSES = ['pending', 'approved', 'pending', 'approved', 'rejected'];
  const PURPOSES = ['Résidentielle', 'Commerciale', 'Mixte', 'Résidentielle', 'Commerciale'];
  const selected = parcels.filter((_, i) => i % PARCELS_PER_PROVINCE === 8).slice(0, PROVINCES.length);

  const records = selected.map((p, i) => {
    const numLots = randInt(2, 5);
    const parentArea = randInt(800, 3000);
    const lotArea = Math.floor(parentArea / numLots);
    const status = pick(SUB_STATUSES, i);

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

  if (error) console.error('Lotissements (non-bloquant):', error);
  return data ?? [];
};

// ─── Rollback ─────────────────────────────────────────────────────────────────

/** Rollback all generated test data by parcel numbers and suffix — FK-safe order */
export const rollbackTestData = async (parcelNumbers: string[], suffix: string) => {
  // 1. Children of contributions
  await supabase.from('fraud_attempts').delete().in('contribution_id',
    (await supabase.from('cadastral_contributions').select('id').in('parcel_number', parcelNumbers)).data?.map(r => r.id) ?? []
  );
  await supabase.from('cadastral_contributor_codes').delete().in('parcel_number', parcelNumbers);

  // 2. Children of invoices
  await supabase.from('cadastral_service_access').delete().in('parcel_number', parcelNumbers);
  
  // 3. Payment transactions (before invoices — no FK but logical dependency)
  await supabase.from('payment_transactions').delete().filter('metadata->>test_mode', 'eq', 'true').ilike('transaction_reference', 'TEST-TXN-%');

  // 4. Invoices (before contributions)
  await supabase.from('cadastral_invoices').delete().in('parcel_number', parcelNumbers);

  // 5. Contributions
  await supabase.from('cadastral_contributions').delete().in('parcel_number', parcelNumbers);

  // 6. Parcel children
  const parcelIds = (await supabase.from('cadastral_parcels').select('id').in('parcel_number', parcelNumbers)).data?.map(r => r.id) ?? [];
  if (parcelIds.length > 0) {
    await supabase.from('cadastral_ownership_history').delete().in('parcel_id', parcelIds);
    await supabase.from('cadastral_tax_history').delete().in('parcel_id', parcelIds);
    await supabase.from('cadastral_boundary_history').delete().in('parcel_id', parcelIds);
    await supabase.from('cadastral_mortgages').delete().in('parcel_id', parcelIds);
    await supabase.from('cadastral_building_permits').delete().in('parcel_id', parcelIds);
  }
  await supabase.from('cadastral_parcels').delete().in('parcel_number', parcelNumbers);

  // 7. expertise_payments (FK → real_estate_expertise_requests) — must delete before requests
  const expReqIds = (await supabase.from('real_estate_expertise_requests').select('id').ilike('reference_number', `TEST-EXP-%-${suffix}`)).data?.map(r => r.id) ?? [];
  if (expReqIds.length > 0) {
    await supabase.from('expertise_payments').delete().in('expertise_request_id', expReqIds);
  }

  // 8. Independent tables by reference/parcel
  await supabase.from('real_estate_expertise_requests').delete().ilike('reference_number', `TEST-EXP-%-${suffix}`);
  await supabase.from('cadastral_land_disputes').delete().ilike('reference_number', `TEST-DISP-%-${suffix}`);
  await supabase.from('land_title_requests').delete().ilike('reference_number', `TEST-LTR-%-${suffix}`);
  await supabase.from('cadastral_boundary_conflicts').delete().in('reporting_parcel_number', parcelNumbers);
  await supabase.from('generated_certificates').delete().ilike('reference_number', `TEST-CERT-%-${suffix}`);
  await supabase.from('mutation_requests').delete().ilike('reference_number', `TEST-MUT-%-${suffix}`);
  await supabase.from('subdivision_requests').delete().ilike('reference_number', `TEST-SUB-%-${suffix}`);
};
