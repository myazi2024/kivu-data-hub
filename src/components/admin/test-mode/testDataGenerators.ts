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

/** Helper: assert insert returned rows */
function assertInserted<T>(data: T[] | null, entity: string): T[] {
  if (!data || data.length === 0) {
    throw new Error(`${entity}: aucune ligne insérée (vérifiez les RLS policies)`);
  }
  return data;
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

const PROVINCES = [
  { province: 'Kinshasa', ville: 'Kinshasa', commune: 'Gombe', quartier: 'Socimat', avenue: 'Av. du Commerce', circonscription_fonciere: 'Kinshasa-Ouest' },
  { province: 'Nord-Kivu', ville: 'Goma', commune: 'Goma', quartier: 'Himbi', avenue: 'Av. du Rond-Point', circonscription_fonciere: 'Goma' },
  { province: 'Sud-Kivu', ville: 'Bukavu', commune: 'Ibanda', quartier: 'Ndendere', avenue: 'Av. Patrice Lumumba', circonscription_fonciere: 'Bukavu' },
  { province: 'Haut-Katanga', ville: 'Lubumbashi', commune: 'Lubumbashi', quartier: 'Centre-ville', avenue: 'Av. Mobutu', circonscription_fonciere: 'Lubumbashi' },
  { province: 'Kongo-Central', ville: 'Matadi', commune: 'Matadi', quartier: 'Ville-Basse', avenue: 'Av. du Port', circonscription_fonciere: 'Matadi' },
];

/** Step 0b: Generate cadastral parcels (required by FK joins) */
export const generateParcels = async (parcelNumbers: string[]) => {
  const areas = [500, 1000, 750, 2000, 350];
  const parcelTypes = ['résidentiel', 'commercial', 'agricole', 'résidentiel', 'industriel'];
  const titleTypes = ['Certificat d\'enregistrement', 'Contrat de location (Contrat d\'occupation provisoire)', 'Fiche parcellaire', 'Certificat d\'enregistrement', 'Contrat de location (Contrat d\'occupation provisoire)'];

  const records = parcelNumbers.map((pn, i) => ({
    parcel_number: pn,
    parcel_type: parcelTypes[i],
    property_title_type: titleTypes[i],
    location: `${PROVINCES[i].quartier}, ${PROVINCES[i].commune}`,
    area_sqm: areas[i],
    current_owner_name: `Test Propriétaire ${i + 1}`,
    current_owner_since: '2020-01-01',
    current_owner_legal_status: i % 2 === 0 ? 'personne_physique' : 'personne_morale',
    province: PROVINCES[i].province,
    ville: PROVINCES[i].ville,
    commune: PROVINCES[i].commune,
    quartier: PROVINCES[i].quartier,
    avenue: PROVINCES[i].avenue,
    circonscription_fonciere: PROVINCES[i].circonscription_fonciere,
    declared_usage: ['habitation', 'commerce', 'agriculture', 'habitation', 'industrie'][i],
    construction_type: ['dur', 'semi-dur', null, 'dur', 'dur'][i],
    construction_nature: ['maison', 'immeuble', null, 'villa', 'entrepôt'][i],
    construction_year: [2010, 2018, null, 2005, 2015][i],
    lease_type: [null, 'bail_emphytéotique', null, null, 'bail_ordinaire'][i],
    gps_coordinates: [
      { lat: -4.3250, lng: 15.3222 },
      { lat: -1.6580, lng: 29.2205 },
      { lat: -2.5083, lng: 28.8608 },
      { lat: -11.6647, lng: 27.4794 },
      { lat: -5.8243, lng: 13.4531 },
    ][i] as unknown as Json,
  }));

  const { data, error } = await supabase
    .from('cadastral_parcels')
    .insert(records)
    .select('id, parcel_number');

  if (error) throw new Error(`Parcelles: ${error.message}`);
  return assertInserted(data, 'Parcelles');
};

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
    quartier: PROVINCES[i].quartier,
    avenue: PROVINCES[i].avenue,
    territoire: i === 1 ? 'Nyiragongo' : null,
    village: i === 4 ? 'Test Village' : null,
    circonscription_fonciere: PROVINCES[i].circonscription_fonciere,
    status: statuses[i],
    contribution_type: types[i],
    user_id: userId,
    is_suspicious: i === 2,
    fraud_score: i === 2 ? 75 : 0,
    fraud_reason: i === 2 ? 'Test: score de fraude élevé simulé' : null,
    declared_usage: ['habitation', 'commerce', 'agriculture', 'habitation', 'industrie'][i],
    construction_type: ['dur', 'semi-dur', null, 'dur', 'dur'][i],
    construction_nature: ['maison', 'immeuble', null, 'villa', 'entrepôt'][i],
    construction_year: [2010, 2018, null, 2005, 2015][i],
    current_owner_legal_status: i % 2 === 0 ? 'personne_physique' : 'personne_morale',
  }));

  const { data, error } = await supabase
    .from('cadastral_contributions')
    .insert(records)
    .select('id, parcel_number');

  if (error) throw new Error(`Contributions: ${error.message}`);
  return assertInserted(data, 'Contributions');
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
    geographical_zone: PROVINCES[i].province,
  }));

  const { data, error } = await supabase
    .from('cadastral_invoices')
    .insert(records)
    .select('id, parcel_number, status');

  if (error) throw new Error(`Factures: ${error.message}`);
  return assertInserted(data, 'Factures');
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
  return assertInserted(data, 'Paiements');
};

/** Step 4: Generate service access records based on actual invoice services */
export const generateServiceAccess = async (
  userId: string,
  invoices: Array<{ id: string; parcel_number: string; status: string }>
) => {
  const paidInvoices = invoices.filter((inv) => inv.status === 'paid');
  if (paidInvoices.length === 0) return;

  // Map invoice index to its actual services
  const serviceMap: Record<number, string[]> = {
    0: ['carte_cadastrale', 'fiche_identification'],
    2: ['fiche_identification', 'certificat_bornage'],
  };

  const records = paidInvoices.flatMap((inv, i) => {
    const services = serviceMap[i === 0 ? 0 : 2] || ['carte_cadastrale'];
    return services.map((svc) => ({
      parcel_number: inv.parcel_number,
      invoice_id: inv.id,
      service_type: svc,
      user_id: userId,
    }));
  });

  const { error } = await supabase
    .from('cadastral_service_access')
    .insert(records);

  if (error) console.error('Accès services (non bloquant):', error);
};

/** Step 5: Generate land title requests with full fields for analytics */
export const generateTitleRequests = async (userId: string, suffix: string) => {
  const records = [
    {
      reference_number: `TEST-LTR-001-${suffix}`,
      user_id: userId,
      requester_first_name: 'Jean',
      requester_last_name: 'Kabongo',
      requester_middle_name: 'Pierre',
      requester_phone: '+243800000010',
      requester_email: 'test-titre1@example.com',
      requester_type: 'proprietaire',
      requester_gender: 'M',
      requester_legal_status: 'personne_physique',
      nationality: 'RDC',
      section_type: 'urbain',
      province: 'Kinshasa',
      ville: 'Kinshasa',
      commune: 'Gombe',
      quartier: 'Socimat',
      circonscription_fonciere: 'Kinshasa-Ouest',
      declared_usage: 'habitation',
      area_sqm: 500,
      construction_nature: 'maison',
      occupation_duration: '5_ans_plus',
      estimated_processing_days: 30,
      status: 'pending',
      payment_status: 'pending',
      total_amount_usd: 50,
      fee_items: [{ fee_name: 'Frais de dossier', amount_usd: 50 }] as unknown as Json,
    },
    {
      reference_number: `TEST-LTR-002-${suffix}`,
      user_id: userId,
      requester_first_name: 'Marie',
      requester_last_name: 'Amani',
      requester_phone: '+243800000011',
      requester_type: 'mandataire',
      requester_gender: 'F',
      requester_legal_status: 'personne_physique',
      nationality: 'RDC',
      is_owner_same_as_requester: false,
      owner_first_name: 'Paul',
      owner_last_name: 'Mukendi',
      owner_gender: 'M',
      owner_legal_status: 'personne_physique',
      section_type: 'rural',
      province: 'Sud-Kivu',
      ville: 'Bukavu',
      territoire: 'Kabare',
      circonscription_fonciere: 'Bukavu',
      declared_usage: 'agriculture',
      area_sqm: 2000,
      occupation_duration: '3_5_ans',
      estimated_processing_days: 45,
      status: 'approved',
      payment_status: 'paid',
      total_amount_usd: 75,
      fee_items: [
        { fee_name: 'Frais de dossier', amount_usd: 50 },
        { fee_name: 'Frais de mesurage', amount_usd: 25 },
      ] as unknown as Json,
    },
    {
      reference_number: `TEST-LTR-003-${suffix}`,
      user_id: userId,
      requester_first_name: 'Patrick',
      requester_last_name: 'Mwamba',
      requester_phone: '+243800000012',
      requester_type: 'proprietaire',
      requester_gender: 'M',
      nationality: 'Belgique',
      section_type: 'urbain',
      province: 'Haut-Katanga',
      ville: 'Lubumbashi',
      commune: 'Lubumbashi',
      circonscription_fonciere: 'Lubumbashi',
      declared_usage: 'commerce',
      area_sqm: 1200,
      construction_nature: 'immeuble',
      occupation_duration: '1_3_ans',
      estimated_processing_days: 60,
      status: 'rejected',
      rejection_reason: 'Documents incomplets (données de test)',
      payment_status: 'paid',
      total_amount_usd: 100,
      fee_items: [
        { fee_name: 'Frais de dossier', amount_usd: 50 },
        { fee_name: 'Frais de mesurage', amount_usd: 25 },
        { fee_name: 'Frais d\'expertise', amount_usd: 25 },
      ] as unknown as Json,
    },
  ];

  const { data, error } = await supabase
    .from('land_title_requests')
    .insert(records)
    .select('id');

  if (error) throw new Error(`Demandes de titres: ${error.message}`);
  return assertInserted(data, 'Demandes de titres');
};

/** Step 6: Generate expertise requests with full analytics fields */
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
      total_built_area_sqm: 320,
      has_garden: true,
      garden_area_sqm: 150,
      has_electricity: true,
      has_water_supply: true,
      has_internet: true,
      has_parking: true,
      parking_spaces: 2,
      has_security_system: false,
      construction_quality: 'bon',
      road_access_type: 'goudronné',
      distance_to_main_road_m: 50,
      distance_to_market_km: 1.2,
      distance_to_school_km: 0.8,
      distance_to_hospital_km: 2.5,
      flood_risk_zone: false,
      erosion_risk_zone: false,
    },
    {
      reference_number: `TEST-EXP-002-${suffix}`,
      parcel_number: parcelNumbers[1],
      user_id: userId,
      requester_name: 'Test Expert 2',
      requester_email: 'test-exp2@example.com',
      requester_phone: '+243800000021',
      status: 'completed',
      property_description: 'Terrain vide test',
      market_value_usd: 45000,
      property_condition: 'bon',
      total_built_area_sqm: 0,
      has_garden: false,
      garden_area_sqm: 0,
      has_electricity: false,
      has_water_supply: false,
      construction_quality: 'neuf',
      road_access_type: 'terre',
      distance_to_main_road_m: 500,
      distance_to_market_km: 3.5,
      distance_to_school_km: 2.1,
      distance_to_hospital_km: 5.0,
      flood_risk_zone: true,
      erosion_risk_zone: false,
    },
    {
      reference_number: `TEST-EXP-003-${suffix}`,
      parcel_number: parcelNumbers[3],
      user_id: userId,
      requester_name: 'Test Expert 3',
      requester_email: 'test-exp3@example.com',
      requester_phone: '+243800000022',
      status: 'in_progress',
      property_description: 'Villa test avec grand jardin',
      construction_year: 2005,
      number_of_floors: 1,
      total_built_area_sqm: 180,
      has_garden: true,
      garden_area_sqm: 800,
      has_electricity: true,
      has_water_supply: true,
      has_internet: false,
      has_parking: true,
      parking_spaces: 4,
      has_sewage_system: true,
      construction_quality: 'moyen',
      road_access_type: 'pavé',
      distance_to_main_road_m: 200,
      distance_to_market_km: 2.0,
      distance_to_school_km: 1.5,
      distance_to_hospital_km: 3.0,
      flood_risk_zone: false,
      erosion_risk_zone: true,
    },
  ];

  const { data, error } = await supabase
    .from('real_estate_expertise_requests')
    .insert(records)
    .select('id');

  if (error) throw new Error(`Expertises: ${error.message}`);
  return assertInserted(data, 'Expertises');
};

/** Step 7: Generate land disputes (including one with lifting data) */
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
      declarant_email: 'test-decl1@example.com',
      current_status: 'en_cours',
      reported_by: userId ?? null,
      dispute_start_date: '2025-06-15',
      dispute_description: 'Litige de test: contestation des bornes entre deux parcelles adjacentes',
      parties_involved: [
        { name: 'Test Partie 1', role: 'demandeur' },
        { name: 'Test Partie 2', role: 'défendeur' },
      ] as unknown as Json,
    },
    {
      reference_number: `TEST-DISP-002-${suffix}`,
      parcel_number: parcelNumbers[2],
      dispute_type: 'propriete',
      dispute_nature: 'Double attribution de titre foncier',
      declarant_name: 'Test Déclarant 2',
      declarant_quality: 'occupant',
      declarant_phone: '+243800000031',
      current_status: 'resolu',
      resolution_level: 'amiable',
      resolution_details: 'Résolu à l\'amiable entre les parties (données de test)',
      reported_by: userId ?? null,
      dispute_start_date: '2025-03-01',
    },
    {
      reference_number: `TEST-DISP-003-${suffix}`,
      parcel_number: parcelNumbers[3],
      dispute_type: 'occupation',
      dispute_nature: 'Occupation illégale signalée',
      declarant_name: 'Test Déclarant 3',
      declarant_quality: 'proprietaire',
      declarant_phone: '+243800000032',
      current_status: 'demande_levee',
      reported_by: userId ?? null,
      dispute_start_date: '2025-09-10',
      dispute_description: 'Litige de test: demande de levée d\'opposition en cours',
      lifting_status: 'en_cours',
      lifting_reason: 'Accord trouvé entre les parties après médiation',
      lifting_request_reference: `TEST-LEV-001-${suffix}`,
      lifting_documents: [{ name: 'PV de médiation', url: 'test://mediation-pv.pdf' }] as unknown as Json,
    },
  ];

  const { data, error } = await supabase
    .from('cadastral_land_disputes')
    .insert(records)
    .select('id');

  if (error) throw new Error(`Litiges: ${error.message}`);
  return assertInserted(data, 'Litiges');
};

/** Step 8: Generate contributor codes linked to contributions */
export const generateContributorCodes = async (
  userId: string,
  contributions: Array<{ id: string; parcel_number: string }>
) => {
  const records = contributions.slice(0, 3).map((c, i) => ({
    code: `TEST-CCC-${String(i + 1).padStart(5, '0')}`,
    contribution_id: c.id,
    parcel_number: c.parcel_number,
    user_id: userId,
    value_usd: [5, 10, 15][i],
    is_used: i === 0,
    used_at: i === 0 ? new Date().toISOString() : null,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }));

  const { data, error } = await supabase
    .from('cadastral_contributor_codes')
    .insert(records)
    .select('id');

  if (error) throw new Error(`Codes CCC: ${error.message}`);
  return assertInserted(data, 'Codes CCC');
};

/** Step 9: Generate fraud attempts linked to suspicious contributions */
export const generateFraudAttempts = async (
  userId: string,
  contributions: Array<{ id: string; parcel_number: string }>
) => {
  const records = [
    {
      user_id: userId,
      contribution_id: contributions[2]?.id ?? contributions[0].id,
      fraud_type: 'duplication',
      severity: 'high',
      description: 'Test: tentative de soumission en double détectée',
    },
    {
      user_id: userId,
      contribution_id: contributions[0].id,
      fraud_type: 'document_falsifie',
      severity: 'medium',
      description: 'Test: document suspect détecté par le système',
    },
  ];

  const { data, error } = await supabase
    .from('fraud_attempts')
    .insert(records)
    .select('id');

  if (error) console.error('Fraud attempts (non-bloquant):', error);
  return data ?? [];
};

/** Step 10: Generate boundary conflicts */
export const generateBoundaryConflicts = async (parcelNumbers: string[], userId?: string) => {
  const records = [
    {
      reporting_parcel_number: parcelNumbers[0],
      conflicting_parcel_number: parcelNumbers[1],
      conflict_type: 'chevauchement',
      description: 'Test: chevauchement de limites entre deux parcelles adjacentes',
      status: 'en_cours',
      reported_by: userId ?? null,
    },
    {
      reporting_parcel_number: parcelNumbers[3],
      conflicting_parcel_number: parcelNumbers[4],
      conflict_type: 'borne_deplacee',
      description: 'Test: borne de délimitation déplacée',
      status: 'resolu',
      reported_by: userId ?? null,
      proposed_solution: 'Repose de bornes par le géomètre assermenté',
      resolution_notes: 'Résolu après intervention du conservateur (test)',
      resolved_at: new Date().toISOString(),
      resolved_by: userId ?? null,
    },
  ];

  const { data, error } = await supabase
    .from('cadastral_boundary_conflicts')
    .insert(records)
    .select('id');

  if (error) console.error('Conflits limites (non-bloquant):', error);
  return data ?? [];
};

/** Step 11: Generate ownership history for parcels */
export const generateOwnershipHistory = async (
  parcels: Array<{ id: string; parcel_number: string }>
) => {
  const records = parcels.slice(0, 3).flatMap((p, i) => [
    {
      parcel_id: p.id,
      owner_name: `Ancien Propriétaire ${i + 1}A`,
      ownership_start_date: '2010-01-01',
      ownership_end_date: '2018-06-15',
      legal_status: 'personne_physique',
      mutation_type: 'vente',
    },
    {
      parcel_id: p.id,
      owner_name: `Propriétaire Actuel ${i + 1}`,
      ownership_start_date: '2018-06-15',
      ownership_end_date: null,
      legal_status: i % 2 === 0 ? 'personne_physique' : 'personne_morale',
      mutation_type: 'achat',
    },
  ]);

  const { data, error } = await supabase
    .from('cadastral_ownership_history')
    .insert(records)
    .select('id');

  if (error) console.error('Historique propriété (non-bloquant):', error);
  return data ?? [];
};

/** Step 12: Generate tax history for parcels */
export const generateTaxHistory = async (
  parcels: Array<{ id: string; parcel_number: string }>
) => {
  const currentYear = new Date().getFullYear();
  const records = parcels.slice(0, 4).flatMap((p, i) => [
    {
      parcel_id: p.id,
      tax_year: currentYear - 2,
      amount_usd: [50, 120, 30, 200][i],
      payment_status: 'paid',
      payment_date: `${currentYear - 2}-03-15`,
    },
    {
      parcel_id: p.id,
      tax_year: currentYear - 1,
      amount_usd: [55, 130, 35, 220][i],
      payment_status: i === 3 ? 'unpaid' : 'paid',
      payment_date: i === 3 ? null : `${currentYear - 1}-04-20`,
    },
    {
      parcel_id: p.id,
      tax_year: currentYear,
      amount_usd: [60, 140, 40, 240][i],
      payment_status: i < 2 ? 'paid' : 'unpaid',
      payment_date: i < 2 ? `${currentYear}-02-10` : null,
    },
  ]);

  const { data, error } = await supabase
    .from('cadastral_tax_history')
    .insert(records)
    .select('id');

  if (error) console.error('Historique taxes (non-bloquant):', error);
  return data ?? [];
};

/** Step 13: Generate certificates */
export const generateCertificates = async (
  parcelNumbers: string[],
  suffix: string,
  userId?: string
) => {
  const records = [
    {
      reference_number: `TEST-CERT-001-${suffix}`,
      certificate_type: 'attestation_cadastrale',
      parcel_number: parcelNumbers[0],
      recipient_name: 'Test Propriétaire 1',
      status: 'generated',
      generated_by: userId ?? null,
      metadata: { test_mode: true } as unknown as Json,
    },
    {
      reference_number: `TEST-CERT-002-${suffix}`,
      certificate_type: 'certificat_bornage',
      parcel_number: parcelNumbers[1],
      recipient_name: 'Test Propriétaire 2',
      status: 'generated',
      generated_by: userId ?? null,
      metadata: { test_mode: true } as unknown as Json,
    },
  ];

  const { data, error } = await supabase
    .from('generated_certificates')
    .insert(records)
    .select('id');

  if (error) console.error('Certificats (non-bloquant):', error);
  return data ?? [];
};

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
  }
  await supabase.from('cadastral_parcels').delete().in('parcel_number', parcelNumbers);

  // 7. Independent tables by reference/parcel
  await supabase.from('real_estate_expertise_requests').delete().ilike('reference_number', `TEST-EXP-%-${suffix}`);
  await supabase.from('cadastral_land_disputes').delete().ilike('reference_number', `TEST-DISP-%-${suffix}`);
  await supabase.from('land_title_requests').delete().ilike('reference_number', `TEST-LTR-%-${suffix}`);
  await supabase.from('cadastral_boundary_conflicts').delete().ilike('reporting_parcel_number', 'TEST-%');
  await supabase.from('generated_certificates').delete().ilike('reference_number', `TEST-CERT-%-${suffix}`);
};
