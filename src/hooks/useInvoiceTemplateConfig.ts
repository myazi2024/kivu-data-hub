import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logAuditAction } from '@/utils/supabaseConfigUtils';

export interface InvoiceTemplateConfig {
  tva_rate: number;
  tva_label: string;
  default_format: 'a4' | 'mini';
  show_dgi_mention: boolean;
  show_verification_qr: boolean;
  header_color: string;
  secondary_color: string;
  footer_text: string;
  payment_terms: string;
  invoice_number_prefix: string;
}

export const DEFAULT_INVOICE_TEMPLATE_CONFIG: InvoiceTemplateConfig = {
  tva_rate: 0.16,
  tva_label: 'TVA (16%)',
  default_format: 'a4',
  show_dgi_mention: true,
  show_verification_qr: true,
  header_color: '#dc2626',
  secondary_color: '#1f2937',
  footer_text: 'Merci pour votre confiance. Document généré électroniquement.',
  payment_terms: 'Paiement immédiat à la commande.',
  invoice_number_prefix: 'BIC',
};

const TABLE = 'invoice_template_config' as const;

const parseValue = <T,>(raw: unknown, fallback: T): T => {
  if (raw === null || raw === undefined) return fallback;
  return raw as T;
};

export async function fetchInvoiceTemplateConfig(): Promise<InvoiceTemplateConfig> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('config_key, config_value, is_active');
    if (error || !data) return { ...DEFAULT_INVOICE_TEMPLATE_CONFIG };

    const map: Record<string, unknown> = {};
    data.forEach((r: any) => {
      if (r.is_active) map[r.config_key] = r.config_value;
    });

    return {
      tva_rate: parseValue<number>(map.tva_rate, DEFAULT_INVOICE_TEMPLATE_CONFIG.tva_rate),
      tva_label: parseValue<string>(map.tva_label, DEFAULT_INVOICE_TEMPLATE_CONFIG.tva_label),
      default_format: parseValue<'a4' | 'mini'>(map.default_format, DEFAULT_INVOICE_TEMPLATE_CONFIG.default_format),
      show_dgi_mention: parseValue<boolean>(map.show_dgi_mention, DEFAULT_INVOICE_TEMPLATE_CONFIG.show_dgi_mention),
      show_verification_qr: parseValue<boolean>(map.show_verification_qr, DEFAULT_INVOICE_TEMPLATE_CONFIG.show_verification_qr),
      header_color: parseValue<string>(map.header_color, DEFAULT_INVOICE_TEMPLATE_CONFIG.header_color),
      secondary_color: parseValue<string>(map.secondary_color, DEFAULT_INVOICE_TEMPLATE_CONFIG.secondary_color),
      footer_text: parseValue<string>(map.footer_text, DEFAULT_INVOICE_TEMPLATE_CONFIG.footer_text),
      payment_terms: parseValue<string>(map.payment_terms, DEFAULT_INVOICE_TEMPLATE_CONFIG.payment_terms),
      invoice_number_prefix: parseValue<string>(map.invoice_number_prefix, DEFAULT_INVOICE_TEMPLATE_CONFIG.invoice_number_prefix),
    };
  } catch {
    return { ...DEFAULT_INVOICE_TEMPLATE_CONFIG };
  }
}

export function useInvoiceTemplateConfig() {
  const [config, setConfig] = useState<InvoiceTemplateConfig>(DEFAULT_INVOICE_TEMPLATE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const c = await fetchInvoiceTemplateConfig();
    setConfig(c);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateKey = useCallback(async <K extends keyof InvoiceTemplateConfig>(
    key: K,
    value: InvoiceTemplateConfig[K]
  ) => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from(TABLE)
        .select('id')
        .eq('config_key', key as string)
        .maybeSingle();

      let result;
      if (existing) {
        result = await supabase
          .from(TABLE)
          .update({ config_value: value as any, is_active: true, updated_at: new Date().toISOString() })
          .eq('config_key', key as string);
      } else {
        result = await supabase
          .from(TABLE)
          .insert({ config_key: key as string, config_value: value as any, is_active: true });
      }
      if (result.error) throw result.error;

      await logAuditAction('update_invoice_template_config', TABLE, key as string, undefined, { [key]: value });
      setConfig((prev) => ({ ...prev, [key]: value }));
      return true;
    } catch (e) {
      console.error('Failed to update invoice template config', e);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const updateMany = useCallback(async (patch: Partial<InvoiceTemplateConfig>) => {
    setSaving(true);
    try {
      for (const [k, v] of Object.entries(patch)) {
        const { data: existing } = await supabase
          .from(TABLE)
          .select('id')
          .eq('config_key', k)
          .maybeSingle();
        if (existing) {
          await supabase
            .from(TABLE)
            .update({ config_value: v as any, is_active: true, updated_at: new Date().toISOString() })
            .eq('config_key', k);
        } else {
          await supabase
            .from(TABLE)
            .insert({ config_key: k, config_value: v as any, is_active: true });
        }
      }
      await logAuditAction('bulk_update_invoice_template_config', TABLE, undefined, undefined, patch as Record<string, unknown>);
      setConfig((prev) => ({ ...prev, ...patch }));
      return true;
    } catch (e) {
      console.error('Failed bulk update', e);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { config, loading, saving, updateKey, updateMany, refetch: load };
}

export default useInvoiceTemplateConfig;
