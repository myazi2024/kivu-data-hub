import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PaymentMode {
  enabled: boolean;
  bypass_payment: boolean;
  test_mode: boolean;
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
 * Hook unifié pour gérer la configuration des paiements
 * Centralise la logique de détection et de validation des moyens de paiement
 */
export const usePaymentConfig = () => {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>({
    enabled: false,
    bypass_payment: true,
    test_mode: false
  });
  const [availableMethods, setAvailableMethods] = useState<AvailablePaymentMethods>({
    hasMobileMoney: false,
    hasBankCard: false,
    hasAnyMethod: false,
    enabledProviders: {
      mobileMoneyProviders: [],
      bankCardProvider: null
    }
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadPaymentConfiguration = async () => {
    try {
      setLoading(true);

      // Charger le mode de paiement
      const { data: modeData } = await supabase
        .from('cadastral_search_config')
        .select('config_value')
        .eq('config_key', 'payment_mode')
        .eq('is_active', true)
        .maybeSingle();

      if (modeData?.config_value) {
        const mode = modeData.config_value as any;
        setPaymentMode({
          enabled: mode.enabled ?? false,
          bypass_payment: mode.bypass_payment ?? true,
          test_mode: mode.test_mode ?? false
        });
      }

      // Charger les méthodes de paiement disponibles
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
        enabledProviders: {
          mobileMoneyProviders,
          bankCardProvider
        }
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

    // Fix #19: Un seul canal Realtime avec 2 listeners
    const channel = supabase
      .channel('payment-config-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cadastral_search_config',
          filter: 'config_key=eq.payment_mode'
        },
        () => loadPaymentConfiguration()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_methods_config'
        },
        () => loadPaymentConfiguration()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /**
   * Détermine si le paiement est requis
   */
  const isPaymentRequired = (): boolean => {
    return paymentMode.enabled && !paymentMode.bypass_payment;
  };

  /**
   * Détermine le meilleur moyen de paiement à utiliser
   */
  const getBestPaymentMethod = (): 'bank_card' | 'mobile_money' | null => {
    if (!isPaymentRequired()) return null;
    
    // Prioriser la carte bancaire si disponible
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
