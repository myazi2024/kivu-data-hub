import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentProvider {
  id: string;
  config_type: 'mobile_money' | 'bank_card';
  provider_id: string;
  provider_name: string;
  is_enabled: boolean;
  api_credentials: {
    apiKey?: string;
    merchantCode?: string;
    secretKey?: string;
    publicKey?: string;
    webhookSecret?: string;
    provider?: string;
  };
  display_order: number;
  fee_percent?: number;
  fee_fixed_usd?: number;
}

/** Mask a sensitive key: show prefix + last 4 chars */
export const maskApiKey = (key: string | undefined): string => {
  if (!key || key.length < 8) return key ? '••••••••' : '';
  const prefix = key.slice(0, Math.min(key.indexOf('_') + 1, 4) || 3);
  const suffix = key.slice(-4);
  return `${prefix}••••${suffix}`;
};

/** Check if a value is a masked placeholder */
const isMasked = (val: string | undefined) => val?.includes('••••');

export interface PaymentMethodsState {
  mobileMoneyProviders: PaymentProvider[];
  bankCardProviders: PaymentProvider[];
  loading: boolean;
}

export const usePaymentMethods = () => {
  const [state, setState] = useState<PaymentMethodsState>({
    mobileMoneyProviders: [],
    bankCardProviders: [],
    loading: true,
  });

  // Snapshot of server state for dirty-check
  const serverSnapshot = useRef<string>('');

  const loadPaymentMethods = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }));

      const { data, error } = await supabase
        .from('payment_methods_config')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      const mapProvider = (p: any, type: 'mobile_money' | 'bank_card'): PaymentProvider => ({
        ...p,
        config_type: type,
        api_credentials: (p.api_credentials as any) || {},
      });

      const mobileMoneyProviders = (data?.filter((p) => p.config_type === 'mobile_money') || []).map((p) =>
        mapProvider(p, 'mobile_money')
      );

      const bankCardProviders = (data?.filter((p) => p.config_type === 'bank_card') || []).map((p) =>
        mapProvider(p, 'bank_card')
      );

      const newState = { mobileMoneyProviders, bankCardProviders, loading: false };
      setState(newState);

      // Save snapshot for dirty-check (exclude loading)
      serverSnapshot.current = JSON.stringify({
        mobileMoneyProviders,
        bankCardProviders,
      });
    } catch (error) {
      console.error('Error loading payment methods:', error);
      setState((prev) => ({ ...prev, loading: false }));
      throw error;
    }
  }, []);

  const getEnabledProviders = (type: 'mobile_money' | 'bank_card') => {
    const providers = type === 'mobile_money' ? state.mobileMoneyProviders : state.bankCardProviders;
    return providers.filter((p) => p.is_enabled);
  };

  const upsertProvider = async (provider: Omit<PaymentProvider, 'id'>) => {
    const { error } = await supabase
      .from('payment_methods_config')
      .upsert(
        {
          config_type: provider.config_type,
          provider_id: provider.provider_id,
          provider_name: provider.provider_name,
          is_enabled: provider.is_enabled,
          api_credentials: provider.api_credentials,
          display_order: provider.display_order,
          fee_percent: provider.fee_percent ?? 0,
          fee_fixed_usd: provider.fee_fixed_usd ?? 0,
        },
        { onConflict: 'config_type,provider_id' }
      );

    if (error) throw error;
  };

  /**
   * Save all providers at once.
   * Credentials that are still masked (not edited) are stripped so the DB keeps the original.
   */
  const saveAll = async (
    mobileMoney: PaymentProvider[],
    bankCard: PaymentProvider[],
    originalMobileMoney: PaymentProvider[],
    originalBankCard: PaymentProvider[]
  ) => {
    // Helper: merge credentials — keep original if the field wasn't changed (still masked)
    const mergeCredentials = (
      newCreds: PaymentProvider['api_credentials'],
      origCreds: PaymentProvider['api_credentials']
    ) => {
      const merged: Record<string, string | undefined> = {};
      for (const key of ['apiKey', 'merchantCode', 'secretKey', 'publicKey', 'webhookSecret', 'provider'] as const) {
        const newVal = newCreds[key];
        if (isMasked(newVal)) {
          // Keep original value from DB
          merged[key] = origCreds[key];
        } else {
          merged[key] = newVal;
        }
      }
      return merged;
    };

    for (const provider of mobileMoney) {
      const orig = originalMobileMoney.find((p) => p.provider_id === provider.provider_id);
      await upsertProvider({
        ...provider,
        api_credentials: mergeCredentials(provider.api_credentials, orig?.api_credentials || {}),
      });
    }

    for (const provider of bankCard) {
      const orig = originalBankCard.find((p) => p.provider_id === provider.provider_id);
      await upsertProvider({
        ...provider,
        api_credentials: mergeCredentials(provider.api_credentials, orig?.api_credentials || {}),
      });
    }

    await loadPaymentMethods();
  };

  /** Test provider connectivity via Edge Function */
  const testProviderConnection = async (providerId: string, configType: string): Promise<{ success: boolean; message: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('test-payment-provider', {
        body: { provider_id: providerId, config_type: configType },
      });
      if (error) throw error;
      return data as { success: boolean; message: string };
    } catch (error: any) {
      return { success: false, message: error.message || 'Erreur de connexion' };
    }
  };

  useEffect(() => {
    loadPaymentMethods();

    const channel = supabase
      .channel('payment-methods-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_methods_config' }, () => {
        loadPaymentMethods();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPaymentMethods]);

  return {
    ...state,
    serverSnapshot,
    getEnabledProviders,
    upsertProvider,
    saveAll,
    testProviderConnection,
    refreshPaymentMethods: loadPaymentMethods,
  };
};
