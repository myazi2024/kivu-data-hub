import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { PROVINCES, assertInserted, pick, randInt } from './_shared';

/** Step 2: Generate invoices (~33% of parcels) */
export const generateInvoices = async (userId: string, parcelNumbers: string[]) => {
  const SERVICES_POOL: Json[][] = [
    ['carte_cadastrale', 'fiche_identification'],
    ['carte_cadastrale'],
    ['fiche_identification', 'certificat_bornage'],
    ['carte_cadastrale', 'certificat_bornage'],
  ];
  const INV_STATUSES = ['paid', 'pending', 'paid', 'paid', 'pending'];
  const PAYMENT_METHODS = ['mobile_money', 'card', 'bank_transfer', 'mobile_money', 'mobile_money'];
  const selectedParcels = parcelNumbers.filter((_, i) => i % 3 === 0);

  const records = selectedParcels.map((pn, i) => ({
    parcel_number: pn,
    invoice_number: `TEST-INV-${Date.now().toString(36)}-${i}`,
    selected_services: pick(SERVICES_POOL, i) as unknown as Json,
    total_amount_usd: randInt(5, 25),
    client_email: `test${i + 1}@example.com`,
    client_name: `Test User ${i + 1}`,
    status: pick(INV_STATUSES, i),
    user_id: userId,
    payment_method: pick(PAYMENT_METHODS, i),
    discount_amount_usd: i % 5 === 0 ? randInt(1, 5) : null,
    geographical_zone: PROVINCES[Math.floor(i / (selectedParcels.length / PROVINCES.length)) % PROVINCES.length]?.province ?? 'Kinshasa',
    created_at: new Date(Date.now() - randInt(0, 10 * 365) * 24 * 3600 * 1000).toISOString(),
  }));

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

/** Step 4: Service access for paid invoices */
export const generateServiceAccess = async (
  userId: string,
  invoices: Array<{ id: string; parcel_number: string; status: string }>
) => {
  const paidInvoices = invoices.filter((inv) => inv.status === 'paid');
  if (paidInvoices.length === 0) return;

  const SERVICE_TYPES = ['carte_cadastrale', 'fiche_identification', 'certificat_bornage'];

  const records = paidInvoices.flatMap((inv, i) => {
    const count = (i % 2) + 1;
    return SERVICE_TYPES.slice(0, count).map((svc) => ({
      parcel_number: inv.parcel_number,
      invoice_id: inv.id,
      service_type: svc,
      user_id: userId,
    }));
  });

  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { error } = await supabase
      .from('cadastral_service_access')
      .insert(batch);
    if (error) console.error(`Accès services (batch ${i}, non bloquant):`, error);
  }
};
