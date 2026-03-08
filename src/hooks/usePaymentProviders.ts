import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentProviderOption {
  value: string;
  label: string;
  prefix: string;
  color: string;
}

const PROVIDER_MAP: Record<string, { prefix: string; color: string }> = {
  airtel_money: { prefix: '+243 97', color: 'from-red-500 to-red-600' },
  orange_money: { prefix: '+243 84', color: 'from-orange-500 to-orange-600' },
  mpesa: { prefix: '+243 99', color: 'from-green-500 to-green-600' },
};

const FALLBACK_PROVIDERS: PaymentProviderOption[] = [
  { value: 'airtel_money', label: 'Airtel Money', prefix: '+243 97', color: 'from-red-500 to-red-600' },
  { value: 'orange_money', label: 'Orange Money', prefix: '+243 84', color: 'from-orange-500 to-orange-600' },
  { value: 'mpesa', label: 'M-Pesa', prefix: '+243 99', color: 'from-green-500 to-green-600' },
];

/**
 * Shared hook to load Mobile Money providers from payment_methods_config.
 * Replaces duplicated provider-loading logic across multiple dialogs.
 */
export const usePaymentProviders = () => {
  const [providers, setProviders] = useState<PaymentProviderOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('payment_methods_config')
          .select('*')
          .eq('config_type', 'mobile_money')
          .eq('is_enabled', true)
          .order('display_order', { ascending: true });

        if (error) throw error;

        const mapped = data?.map((p) => ({
          value: p.provider_id,
          label: p.provider_name,
          prefix: PROVIDER_MAP[p.provider_id]?.prefix || '+243 XX',
          color: PROVIDER_MAP[p.provider_id]?.color || 'from-blue-500 to-blue-600',
        })) || [];

        setProviders(mapped.length > 0 ? mapped : FALLBACK_PROVIDERS);
      } catch {
        setProviders(FALLBACK_PROVIDERS);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return { providers, loading };
};
