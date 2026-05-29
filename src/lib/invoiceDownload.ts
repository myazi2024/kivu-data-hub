/**
 * Helper unifié de téléchargement PDF de facture/reçu.
 * - Lit le format par défaut depuis la config admin (`invoice_template_config`).
 * - Si aucun catalogue de services n'est fourni, le récupère automatiquement
 *   pour éviter d'afficher « Service inconnu » dans le PDF (B7).
 * - Cache local invalidé en temps réel via Supabase Realtime sur
 *   `cadastral_services_config` (Lot PDF : évite l'incohérence après MAJ admin).
 */
import { fetchInvoiceTemplateConfig } from '@/hooks/useInvoiceTemplateConfig';
import { supabase } from '@/integrations/supabase/client';
import type { CadastralInvoice, InvoiceFormat } from '@/lib/pdf';
import type { CadastralService } from '@/hooks/useCadastralServices';

interface DownloadOptions {
  format?: InvoiceFormat;
  services?: CadastralService[];
  filename?: string;
  openInNewTab?: boolean;
}

let cachedServices: CadastralService[] | null = null;
let realtimeBound = false;

function bindCatalogInvalidation() {
  if (realtimeBound) return;
  realtimeBound = true;
  supabase
    .channel('invoice-download-catalog-invalidation')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cadastral_services_config' },
      () => {
        cachedServices = null;
      }
    )
    .subscribe();
}

async function loadServicesCatalog(): Promise<CadastralService[]> {
  bindCatalogInvalidation();
  if (cachedServices) return cachedServices;

  const { data } = await supabase
    .from('cadastral_services_config')
    .select('service_id, name, price_usd, category, description, icon_name, display_order, required_data_fields')
    .eq('is_active', true)
    .is('deleted_at', null);

  // Mapping correct : `id` côté PDF = `service_id` métier (pas la PK UUID).
  cachedServices = (data ?? []).map((row: any) => ({
    id: row.service_id,
    name: row.name,
    price: Number(row.price_usd),
    description: row.description ?? '',
    icon_name: row.icon_name ?? null,
    required_data_fields: row.required_data_fields ?? null,
    display_order: row.display_order ?? null,
    category: row.category ?? 'consultation',
  }));
  return cachedServices;
}

export async function downloadInvoicePDF(
  invoice: CadastralInvoice,
  options: DownloadOptions = {}
): Promise<void> {
  const [{ generateInvoicePDF }, config, services] = await Promise.all([
    import('@/lib/pdf'),
    options.format ? Promise.resolve(null) : fetchInvoiceTemplateConfig(),
    options.services ? Promise.resolve(options.services) : loadServicesCatalog(),
  ]);
  const format: InvoiceFormat = options.format ?? (config?.default_format ?? 'a4');
  await generateInvoicePDF(invoice, services, format, options.filename, { openInNewTab: options.openInNewTab });
}
