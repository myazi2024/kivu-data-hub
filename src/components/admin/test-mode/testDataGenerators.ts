import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

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

export interface GeneratedIds {
  parcelNumbers: string[];
  contributionIds: string[];
  invoiceIds: string[];
  paymentIds: string[];
  titleRequestIds: string[];
  expertiseIds: string[];
  disputeIds: string[];
}

const PROVINCES = [
  { province: 'Kinshasa', ville: 'Kinshasa', commune: 'Gombe' },
  { province: 'Nord-Kivu', ville: 'Goma', commune: 'Goma' },
  { province: 'Sud-Kivu', ville: 'Bukavu', commune: 'Ibanda' },
  { province: 'Haut-Katanga', ville: 'Lubumbashi', commune: 'Lubumbashi' },
  { province: 'Kongo-Central', ville: 'Matadi', commune: 'Matadi' },
];

/** Step 1: Generate contributions with diverse data */
export const generateContributions = async (userId: string, parcelNumbers: string[]) => {
  const statuses = ['approved', 'pending', 'rejected', 'pending', 'approved'];
  const types: Array<'creation' | 'update'> = ['creation', 'creation', 'update', 'creation', 'creation'];
  const areas = [500, 1000, 750, 2000, 350];
  const titleTypes = ['Titre foncier', 'Concession', 'Titre foncier', 'Certificat d\'enregistrement', 'Concession'];

  const records = parcelNumbers.map((pn, i) => ({
    parcel_number: pn,
    property_title_type: titleTypes[i],
    current_owner_name: `Test User ${i + 1}`,
    area_sqm: areas[i],
    province: PROVINCES[i].province,
    ville: PROVINCES[i].ville,
    commune: PROVINCES[i].commune,
    status: statuses[i],
    contribution_type: types[i],
    user_id: userId,
    is_suspicious: i === 2, // One suspicious record
    fraud_score: i === 2 ? 75 : 0,
    fraud_reason: i === 2 ? 'Test: score de fraude élevé simulé' : null,
  }));

  const { data, error } = await supabase
    .from('cadastral_contributions')
    .insert(records)
    .select('id, parcel_number');

  if (error) throw new Error(`Contributions: ${error.message}`);
  return data!;
};

/** Step 2: Generate invoices linked to contributions */
export const generateInvoices = async (userId: string, parcelNumbers: string[]) => {
  const services: Json[][] = [
    ['carte_cadastrale', 'fiche_identification'],
    ['carte_cadastrale'],
    ['fiche_identification', 'certificat_bornage'],
  ];
  const statuses = ['paid', 'pending', 'paid'];
  const amounts = [10, 5, 15];

  const records = parcelNumbers.slice(0, 3).map((pn, i) => ({
    parcel_number: pn,
    invoice_number: '', // DB trigger auto-generates
    selected_services: services[i] as unknown as Json,
    total_amount_usd: amounts[i],
    client_email: `test${i + 1}@example.com`,
    client_name: `Test User ${i + 1}`,
    status: statuses[i],
    user_id: userId,
  }));

  const { data, error } = await supabase
    .from('cadastral_invoices')
    .insert(records)
    .select('id, parcel_number, status');

  if (error) throw new Error(`Factures: ${error.message}`);
  return data!;
};

/** Step 3: Generate payment transactions for paid invoices */
export const generatePayments = async (
  userId: string,
  invoices: Array<{ id: string; parcel_number: string; status: string }>
) => {
  const paidInvoices = invoices.filter((inv) => inv.status === 'paid');
  if (paidInvoices.length === 0) return [];

  const records = paidInvoices.map((inv, i) => ({
    invoice_id: inv.id,
    amount_usd: i === 0 ? 10 : 15,
    payment_method: i === 0 ? 'mobile_money' : 'card',
    provider: i === 0 ? 'airtel_money' : 'stripe',
    status: 'completed',
    phone_number: i === 0 ? '+243800000001' : null,
    transaction_reference: `TEST-TXN-${Date.now()}-${i}`,
    user_id: userId,
    metadata: { test_mode: 'true', generated_at: new Date().toISOString() } as unknown as Json,
  }));

  const { data, error } = await supabase
    .from('payment_transactions')
    .insert(records)
    .select('id');

  if (error) throw new Error(`Paiements: ${error.message}`);
  return data!;
};

/** Step 4: Generate service access records for paid invoices */
export const generateServiceAccess = async (
  userId: string,
  invoices: Array<{ id: string; parcel_number: string; status: string }>
) => {
  const paidInvoices = invoices.filter((inv) => inv.status === 'paid');
  if (paidInvoices.length === 0) return;

  const records = paidInvoices.flatMap((inv) => [
    {
      parcel_number: inv.parcel_number,
      invoice_id: inv.id,
      service_type: 'carte_cadastrale',
      user_id: userId,
    },
    {
      parcel_number: inv.parcel_number,
      invoice_id: inv.id,
      service_type: 'fiche_identification',
      user_id: userId,
    },
  ]);

  const { error } = await supabase
    .from('cadastral_service_access')
    .insert(records);

  if (error) console.error('Accès services (non bloquant):', error);
};

/** Step 5: Generate land title requests */
export const generateTitleRequests = async (userId: string, suffix: string) => {
  const records = [
    {
      reference_number: `TEST-LTR-001-${suffix}`,
      user_id: userId,
      requester_first_name: 'Test',
      requester_last_name: 'Demandeur 1',
      requester_phone: '+243800000010',
      requester_email: 'test-titre1@example.com',
      requester_type: 'proprietaire',
      section_type: 'urbain',
      province: 'Kinshasa',
      ville: 'Kinshasa',
      commune: 'Gombe',
      status: 'pending',
      payment_status: 'pending',
      total_amount_usd: 50,
      fee_items: [{ fee_name: 'Frais de dossier', amount_usd: 50 }] as unknown as Json,
    },
    {
      reference_number: `TEST-LTR-002-${suffix}`,
      user_id: userId,
      requester_first_name: 'Test',
      requester_last_name: 'Demandeur 2',
      requester_phone: '+243800000011',
      requester_type: 'mandataire',
      section_type: 'rural',
      province: 'Sud-Kivu',
      ville: 'Bukavu',
      territoire: 'Kabare',
      status: 'approved',
      payment_status: 'paid',
      total_amount_usd: 75,
      fee_items: [
        { fee_name: 'Frais de dossier', amount_usd: 50 },
        { fee_name: 'Frais de mesurage', amount_usd: 25 },
      ] as unknown as Json,
    },
  ];

  const { data, error } = await supabase
    .from('land_title_requests')
    .insert(records)
    .select('id');

  if (error) throw new Error(`Demandes de titres: ${error.message}`);
  return data!;
};

/** Step 6: Generate expertise requests */
export const generateExpertiseRequests = async (userId: string, parcelNumbers: string[], suffix: string) => {
  const records = [
    {
      reference_number: `TEST-EXP-001-${suffix}`,
      parcel_number: parcelNumbers[0],
      user_id: userId,
      requester_name: 'Test Expert 1',
      requester_email: 'test-exp1@example.com',
      requester_phone: '+243800000020',
      status: 'pending',
      property_description: 'Parcelle test pour expertise immobilière',
      construction_year: 2015,
      number_of_floors: 2,
      has_electricity: true,
      has_water_supply: true,
    },
    {
      reference_number: `TEST-EXP-002-${suffix}`,
      parcel_number: parcelNumbers[1],
      user_id: userId,
      requester_name: 'Test Expert 2',
      requester_email: 'test-exp2@example.com',
      status: 'completed',
      property_description: 'Terrain vide test',
      market_value_usd: 45000,
      property_condition: 'bon',
    },
  ];

  const { data, error } = await supabase
    .from('real_estate_expertise_requests')
    .insert(records)
    .select('id');

  if (error) throw new Error(`Expertises: ${error.message}`);
  return data!;
};

/** Step 7: Generate land disputes */
export const generateDisputes = async (parcelNumbers: string[], suffix: string, userId?: string) => {
  const records = [
    {
      reference_number: `TEST-DISP-001-${suffix}`,
      parcel_number: parcelNumbers[0],
      dispute_type: 'limite',
      dispute_nature: 'Contestation de limite parcellaire',
      declarant_name: 'Test Déclarant 1',
      declarant_quality: 'proprietaire',
      declarant_phone: '+243800000030',
      current_status: 'en_cours',
      reported_by: userId ?? null,
    },
    {
      reference_number: `TEST-DISP-002-${suffix}`,
      parcel_number: parcelNumbers[2],
      dispute_type: 'propriete',
      dispute_nature: 'Double attribution de titre foncier',
      declarant_name: 'Test Déclarant 2',
      declarant_quality: 'occupant',
      current_status: 'resolu',
      resolution_level: 'amiable',
      resolution_details: 'Résolu à l\'amiable entre les parties (données de test)',
      reported_by: userId ?? null,
    },
  ];

  const { data, error } = await supabase
    .from('cadastral_land_disputes')
    .insert(records)
    .select('id');

  if (error) throw new Error(`Litiges: ${error.message}`);
  return data!;
};

/** Rollback all generated test data by parcel numbers and suffix */
export const rollbackTestData = async (parcelNumbers: string[], suffix: string) => {
  // FK-safe deletion order: children → parents
  await supabase.from('cadastral_contributor_codes').delete().ilike('parcel_number', 'TEST-%').in('parcel_number', parcelNumbers);
  await supabase.from('cadastral_service_access').delete().ilike('parcel_number', 'TEST-%').in('parcel_number', parcelNumbers);
  await supabase.from('cadastral_invoices').delete().in('parcel_number', parcelNumbers);
  await supabase.from('cadastral_contributions').delete().in('parcel_number', parcelNumbers);
  await supabase.from('payment_transactions').delete().filter('metadata->>test_mode', 'eq', 'true').ilike('transaction_reference', `TEST-TXN-%`);
  await supabase.from('real_estate_expertise_requests').delete().ilike('reference_number', `TEST-EXP-%-${suffix}`);
  await supabase.from('cadastral_land_disputes').delete().ilike('reference_number', `TEST-DISP-%-${suffix}`);
  await supabase.from('land_title_requests').delete().ilike('reference_number', `TEST-LTR-%-${suffix}`);
};
