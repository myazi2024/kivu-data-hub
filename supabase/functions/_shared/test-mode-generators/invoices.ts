import { admin as supabase } from '../testModeAdminClient.ts';
import { PROVINCES, assertInserted, pick, randInt } from './_shared.ts';

/** Fallback aligné sur le catalogue par défaut si la lecture runtime échoue */
const FALLBACK_SERVICE_IDS = ['information', 'location_history', 'history', 'obligations', 'land_disputes'];

/** Charge dynamiquement les service_id actifs du catalogue (cadastral_services_config) */
const loadActiveServiceIds = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('cadastral_services_config')
      .select('service_id')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('display_order', { ascending: true });
    if (error || !data || data.length === 0) return FALLBACK_SERVICE_IDS;
    return data.map((r) => r.service_id);
  } catch {
    return FALLBACK_SERVICE_IDS;
  }
};

/** Step 2: Generate invoices (~33% of parcels) */
export const generateInvoices = async (userId: string, parcelNumbers: string[]) => {
  // P1: Catalogue dynamique — lit cadastral_services_config au runtime
  const activeServices = await loadActiveServiceIds();
  const SERVICES_POOL: unknown[][] = [
    activeServices.slice(0, Math.min(2, activeServices.length)),
    activeServices.slice(0, 1),
    activeServices.slice(0, Math.min(3, activeServices.length)),
    activeServices.slice(0, Math.min(2, activeServices.length)),
  ];
  const INV_STATUSES = ['paid', 'pending', 'paid', 'paid', 'pending'];
  const PAYMENT_METHODS = ['mobile_money', 'card', 'bank_transfer', 'mobile_money', 'mobile_money'];
  const selectedParcels = parcelNumbers.filter((_, i) => i % 3 === 0);

  const records = selectedParcels.map((pn, i) => {
    const hasDiscount = i % 5 === 0;
    return {
      parcel_number: pn,
      invoice_number: `TEST-INV-${Date.now().toString(36)}-${i}`,
      selected_services: pick(SERVICES_POOL, i),
      total_amount_usd: randInt(5, 25),
      client_email: `test${i + 1}@example.com`,
      client_name: `Test User ${i + 1}`,
      status: pick(INV_STATUSES, i),
      user_id: userId,
      payment_method: pick(PAYMENT_METHODS, i),
      discount_amount_usd: hasDiscount ? randInt(1, 5) : null,
      discount_code_used: hasDiscount ? `TEST-PROMO-${i}` : null,
      geographical_zone: PROVINCES[Math.floor(i / (selectedParcels.length / PROVINCES.length)) % PROVINCES.length]?.province ?? 'Kinshasa',
      created_at: new Date(Date.now() - randInt(0, 10 * 365) * 24 * 3600 * 1000).toISOString(),
    };
  });

  const allInserted: Array<{ id: string; parcel_number: string; status: string }> = [];
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { data, error } = await supabase
      .from('cadastral_invoices')
      .insert(batch)
      .select('id, parcel_number, status');
    if (error) throw new Error(`Factures (batch ${i}): ${error.message}`);
    allInserted.push(...assertInserted(data, 'Factures'));
  }
  return allInserted;
};

/**
 * P3 — generateServiceAccess SUPPRIMÉ.
 * Le trigger `trg_provision_service_access_on_paid` provisionne automatiquement
 * les accès lorsque la facture passe à `paid` (lit `selected_services`).
 * Garder un générateur manuel diverge du flux production et est inutile.
 */
