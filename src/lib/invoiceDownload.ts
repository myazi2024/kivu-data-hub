/**
 * Helper unifié de téléchargement PDF de facture/reçu.
 * - Lit le format par défaut depuis la config admin (`invoice_template_config`).
 * - Si aucun catalogue de services n'est fourni, le récupère automatiquement
 *   pour éviter d'afficher « Service inconnu » dans le PDF (B7).
 *
 * Utilisé par : CadastralResultCard, CadastralPaymentDialog,
 *               CadastralClientDashboard, InvoicePreviewPanel.
 */
import { fetchInvoiceTemplateConfig } from '@/hooks/useInvoiceTemplateConfig';
import { supabase } from '@/integrations/supabase/client';
import type { CadastralInvoice, CadastralService, InvoiceFormat } from '@/lib/pdf';

interface DownloadOptions {
  /** Force un format spécifique. Sinon : `default_format` admin → 'a4'. */
  format?: InvoiceFormat;
  /** Catalogue de services pré-chargé (sinon récupéré). */
  services?: CadastralService[];
  /** Nom de fichier optionnel. */
  filename?: string;
}

let cachedServices: CadastralService[] | null = null;

async function loadServicesCatalog(): Promise<CadastralService[]> {
  if (cachedServices) return cachedServices;
  const { data } = await supabase
    .from('cadastral_services_config')
    .select('id, service_id, name, price_usd, category, description, icon_name, display_order, is_active')
    .is('deleted_at', null);
  cachedServices = (data ?? []) as unknown as CadastralService[];
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
  await generateInvoicePDF(invoice, services, format, options.filename);
}
