import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  };
  display_order: number;
}

export interface PaymentMethodsState {
  mobileMoneyProviders: PaymentProvider[];
  bankCardProviders: PaymentProvider[];
  loading: boolean;
}

export const usePaymentMethods = () => {
  const [state, setState] = useState<PaymentMethodsState>({
    mobileMoneyProviders: [],
    bankCardProviders: [],
    loading: true
  });
  const { toast } = useToast();

  const loadPaymentMethods = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      const { data, error } = await supabase
        .from('payment_methods_config')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      const mobileMoneyProviders = (data?.filter(p => p.config_type === 'mobile_money') || []).map(p => ({
        ...p,
        config_type: 'mobile_money' as const,
        api_credentials: p.api_credentials as any || {}
      }));
      
      const bankCardProviders = (data?.filter(p => p.config_type === 'bank_card') || []).map(p => ({
        ...p,
        config_type: 'bank_card' as const,
        api_credentials: p.api_credentials as any || {}
      }));

      setState({
        mobileMoneyProviders,
        bankCardProviders,
        loading: false
      });
    } catch (error) {
      console.error('Error loading payment methods:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les moyens de paiement",
        variant: "destructive"
      });
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const getEnabledProviders = (type: 'mobile_money' | 'bank_card') => {
    const providers = type === 'mobile_money' 
      ? state.mobileMoneyProviders 
      : state.bankCardProviders;
    return providers.filter(p => p.is_enabled);
  };

  const updateProvider = async (
    id: string, 
    updates: Partial<PaymentProvider>
  ) => {
    try {
      const { error } = await supabase
        .from('payment_methods_config')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      await loadPaymentMethods();
      
      toast({
        title: "Succès",
        description: "Moyen de paiement mis à jour"
      });
    } catch (error) {
      console.error('Error updating provider:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le moyen de paiement",
        variant: "destructive"
      });
    }
  };

  const upsertProvider = async (provider: Omit<PaymentProvider, 'id'>) => {
    try {
      const { error } = await supabase
        .from('payment_methods_config')
        .upsert({
          config_type: provider.config_type,
          provider_id: provider.provider_id,
          provider_name: provider.provider_name,
          is_enabled: provider.is_enabled,
          api_credentials: provider.api_credentials,
          display_order: provider.display_order
        }, {
          onConflict: 'config_type,provider_id'
        });

      if (error) throw error;

      await loadPaymentMethods();
      
      toast({
        title: "Succès",
        description: "Configuration sauvegardée"
      });
    } catch (error) {
      console.error('Error saving provider:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadPaymentMethods();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('payment-methods-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_methods_config'
        },
        () => {
          loadPaymentMethods();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    ...state,
    getEnabledProviders,
    updateProvider,
    upsertProvider,
    refreshPaymentMethods: loadPaymentMethods
  };
};
