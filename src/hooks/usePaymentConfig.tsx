import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PaymentMode {
  enabled: boolean;
}

export interface AvailablePaymentMethods {
  hasMobileMoney: boolean;
  hasBankCard: boolean;
  hasAnyMethod: boolean;
  enabledProviders: {
    mobileMoneyProviders: string[];
    bankCardProvider: string | null;
  };
}

/**
 * Hook unifié pour gérer la configuration des paiements.
 * Simplifié : seul `enabled` subsiste. Le mode test est piloté par useTestMode.
 */
export const usePaymentConfig = () => {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>({ enabled: false });
  const [availableMethods, setAvailableMethods] = useState<AvailablePaymentMethods>({
    hasMobileMoney: false,
    hasBankCard: false,
    hasAnyMethod: false,
    enabledProviders: { mobileMoneyProviders: [], bankCardProvider: null }
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadPaymentConfiguration = async () => {
    try {
      setLoading(true);

      const { data: modeData } = await supabase
        .from('cadastral_search_config')
        .select('config_value')
        .eq('config_key', 'payment_mode')
        .eq('is_active', true)
        .maybeSingle();

      if (modeData?.config_value) {
        const mode = modeData.config_value as any;
        setPaymentMode({ enabled: mode.enabled ?? false });
      }

      const { data: methodsData } = await supabase
        .from('payment_methods_config')
        .select('*')
        .eq('is_enabled', true);

      const mobileMoneyProviders = methodsData
        ?.filter(p => p.config_type === 'mobile_money')
        .map(p => p.provider_id) || [];

      const bankCardProvider = methodsData
        ?.find(p => p.config_type === 'bank_card')?.provider_id || null;

      const hasMobileMoney = mobileMoneyProviders.length > 0;
      const hasBankCard = bankCardProvider !== null;

      setAvailableMethods({
        hasMobileMoney,
        hasBankCard,
        hasAnyMethod: hasMobileMoney || hasBankCard,
        enabledProviders: { mobileMoneyProviders, bankCardProvider }
      });
    } catch (error) {
      console.error('Error loading payment configuration:', error);
      toast({
        title: "Erreur de configuration",
        description: "Impossible de charger les moyens de paiement",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentConfiguration();

    const channel = supabase
      .channel('payment-config-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cadastral_search_config', filter: 'config_key=eq.payment_mode' }, () => loadPaymentConfiguration())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_methods_config' }, () => loadPaymentConfiguration())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const isPaymentRequired = (): boolean => paymentMode.enabled;

  const getBestPaymentMethod = (): 'bank_card' | 'mobile_money' | null => {
    if (!isPaymentRequired()) return null;
    if (availableMethods.hasBankCard) return 'bank_card';
    if (availableMethods.hasMobileMoney) return 'mobile_money';
    return null;
  };

  return {
    paymentMode,
    availableMethods,
    loading,
    isPaymentRequired,
    getBestPaymentMethod,
    refreshConfiguration: loadPaymentConfiguration
  };
};
