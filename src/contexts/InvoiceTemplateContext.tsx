import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchInvoiceTemplateConfig,
  DEFAULT_INVOICE_TEMPLATE_CONFIG,
  type InvoiceTemplateConfig,
} from '@/hooks/useInvoiceTemplateConfig';
import { fetchCompanyLegalInfo, type CompanyLegalInfo } from '@/hooks/useCompanyLegalInfo';
import { logAuditAction } from '@/utils/supabaseConfigUtils';

const TABLE_CONFIG = 'invoice_template_config' as const;

interface Ctx {
  config: InvoiceTemplateConfig;
  info: CompanyLegalInfo;
  loading: boolean;
  savingConfig: boolean;
  savingInfo: boolean;
  isConfigDirty: boolean;
  isInfoDirty: boolean;
  setConfigDraft: (patch: Partial<InvoiceTemplateConfig>) => void;
  setInfoDraft: (patch: Partial<CompanyLegalInfo>) => void;
  saveConfig: () => Promise<boolean>;
  saveInfo: () => Promise<boolean>;
  revertConfig: () => void;
  revertInfo: () => void;
  reload: () => Promise<void>;
}

const InvoiceTemplateContext = createContext<Ctx | null>(null);

export const InvoiceTemplateProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<InvoiceTemplateConfig>(DEFAULT_INVOICE_TEMPLATE_CONFIG);
  const [info, setInfo] = useState<CompanyLegalInfo | null>(null);
  const [persistedConfig, setPersistedConfig] = useState<InvoiceTemplateConfig>(DEFAULT_INVOICE_TEMPLATE_CONFIG);
  const [persistedInfo, setPersistedInfo] = useState<CompanyLegalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const [c, i] = await Promise.all([fetchInvoiceTemplateConfig(), fetchCompanyLegalInfo()]);
    setConfig(c);
    setPersistedConfig(c);
    setInfo(i);
    setPersistedInfo(i);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const setConfigDraft = useCallback((patch: Partial<InvoiceTemplateConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const setInfoDraft = useCallback((patch: Partial<CompanyLegalInfo>) => {
    setInfo((prev) => ({ ...(prev as CompanyLegalInfo), ...patch }));
  }, []);

  const saveConfig = useCallback(async (): Promise<boolean> => {
    setSavingConfig(true);
    try {
      const patch = config;
      for (const [k, v] of Object.entries(patch)) {
        const { data: existing } = await supabase
          .from(TABLE_CONFIG)
          .select('id')
          .eq('config_key', k)
          .maybeSingle();
        if (existing) {
          await supabase
            .from(TABLE_CONFIG)
            .update({ config_value: v as any, is_active: true, updated_at: new Date().toISOString() })
            .eq('config_key', k);
        } else {
          await supabase
            .from(TABLE_CONFIG)
            .insert({ config_key: k, config_value: v as any, is_active: true });
        }
      }
      await logAuditAction('bulk_update_invoice_template_config', TABLE_CONFIG, undefined, undefined, patch as Record<string, unknown>);
      setPersistedConfig(config);
      return true;
    } catch (e) {
      console.error('saveConfig failed', e);
      return false;
    } finally {
      setSavingConfig(false);
    }
  }, [config]);

  const saveInfo = useCallback(async (): Promise<boolean> => {
    if (!info) return false;
    setSavingInfo(true);
    try {
      const payload: any = { ...info, is_active: true, updated_at: new Date().toISOString() };
      let res;
      if (info.id && info.id !== 'fallback') {
        res = await supabase.from('company_legal_info').update(payload).eq('id', info.id);
      } else {
        delete payload.id;
        res = await supabase.from('company_legal_info').insert(payload).select().single();
        if (res.data) setInfo(res.data as any);
      }
      if (res.error) throw res.error;
      await logAuditAction('update_company_legal_info', 'company_legal_info', info.id, undefined, payload);
      setPersistedInfo(info);
      return true;
    } catch (e) {
      console.error('saveInfo failed', e);
      return false;
    } finally {
      setSavingInfo(false);
    }
  }, [info]);

  const revertConfig = useCallback(() => setConfig(persistedConfig), [persistedConfig]);
  const revertInfo = useCallback(() => setInfo(persistedInfo), [persistedInfo]);

  const isConfigDirty = useMemo(
    () => JSON.stringify(config) !== JSON.stringify(persistedConfig),
    [config, persistedConfig]
  );
  const isInfoDirty = useMemo(
    () => JSON.stringify(info) !== JSON.stringify(persistedInfo),
    [info, persistedInfo]
  );

  const value: Ctx = {
    config,
    info: info || ({} as CompanyLegalInfo),
    loading,
    savingConfig,
    savingInfo,
    isConfigDirty,
    isInfoDirty,
    setConfigDraft,
    setInfoDraft,
    saveConfig,
    saveInfo,
    revertConfig,
    revertInfo,
    reload,
  };

  return <InvoiceTemplateContext.Provider value={value}>{children}</InvoiceTemplateContext.Provider>;
};

export function useInvoiceTemplate() {
  const ctx = useContext(InvoiceTemplateContext);
  if (!ctx) throw new Error('useInvoiceTemplate must be used inside InvoiceTemplateProvider');
  return ctx;
}
