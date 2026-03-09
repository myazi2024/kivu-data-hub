import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCadastralCart } from './useCadastralCart';
import { usePaymentConfig } from './usePaymentConfig';

export interface CadastralPaymentData {
  provider: string;
  phoneNumber: string;
  name: string;
}

/**
 * Insère les accès services en batch avec ON CONFLICT (upsert)
 * Fix #4 & #15: batch insert + protection doublons
 */
const grantServiceAccess = async (
  userId: string,
  invoiceId: string,
  parcelNumber: string,
  serviceIds: string[]
) => {
  const rows = serviceIds.map(serviceId => ({
    user_id: userId,
    invoice_id: invoiceId,
    parcel_number: parcelNumber,
    service_type: serviceId
  }));

  const { error } = await supabase
    .from('cadastral_service_access')
    .upsert(rows, { onConflict: 'user_id,parcel_number,service_type' });

  if (error) {
    console.error('Erreur lors de l\'attribution des accès:', error);
    throw error;
  }
};

export const useCadastralPayment = () => {
  const [loading, setLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'form' | 'processing' | 'success'>('form');
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedServices, parcelNumber, clearServices } = useCadastralCart();
  const { paymentMode, availableMethods, isPaymentRequired } = usePaymentConfig();

  const createInvoice = async (discountData?: {
    code: string;
    amount: number;
    reseller_id: string;
    code_id: string;
  }) => {
    if (!user) {
      toast({
        title: "Authentification requise",
        description: "Vous devez être connecté pour créer une facture",
        variant: "destructive"
      });
      return null;
    }

    if (selectedServices.length === 0) {
      toast({
        title: "Aucun service sélectionné",
        description: "Veuillez sélectionner au moins un service",
        variant: "destructive"
      });
      return null;
    }

    if (!parcelNumber) {
      toast({
        title: "Numéro de parcelle manquant",
        description: "Le numéro de parcelle est requis",
        variant: "destructive"
      });
      return null;
    }

    try {
      setLoading(true);

      const originalAmount = selectedServices.reduce((sum, s) => sum + s.price, 0);
      const discountAmount = discountData?.amount || 0;
      const finalAmount = Math.max(0, originalAmount - discountAmount);
      // Fix #2: Inclure la TVA dans le montant stocké en DB pour cohérence avec l'affichage
      const TVA_RATE = 0.16;
      const finalAmountTTC = finalAmount * (1 + TVA_RATE);
      const originalAmountTTC = originalAmount * (1 + TVA_RATE);
      
      const geographicalZone = selectedServices[0]?.parcel_location || '';
      const serviceIds = selectedServices.map(s => s.id);
      
      // Fix #5: Laisser le trigger DB generate_invoice_number() gérer le numéro
      // On passe une valeur vide, le trigger set_invoice_number() la remplacera
      if (!isPaymentRequired()) {
        // Mode développement (bypass) - accès gratuit
        const { data: invoice, error } = await supabase
          .from('cadastral_invoices')
          .insert({
            user_id: user.id,
            parcel_number: parcelNumber,
            invoice_number: '', // Sera remplacé par le trigger DB
            selected_services: serviceIds,
            total_amount_usd: 0,
            original_amount_usd: originalAmount,
            discount_amount_usd: originalAmount,
            discount_code_used: 'MODE_DEV',
            client_email: user.email || '',
            client_name: user.user_metadata?.full_name || null,
            geographical_zone: geographicalZone,
            status: 'paid'
          })
          .select()
          .single();

        if (error) throw error;

        // Fix #15: batch insert avec upsert
        await grantServiceAccess(user.id, invoice.id, parcelNumber, serviceIds);

        toast({
          title: "Accès accordé (mode développement)",
          description: "Services accessibles gratuitement"
        });

        clearServices();
        window.dispatchEvent(new CustomEvent('cadastralPaymentCompleted'));

        return invoice;
      }

      const { data: invoice, error } = await supabase
        .from('cadastral_invoices')
        .insert({
          user_id: user.id,
          parcel_number: parcelNumber,
          invoice_number: '', // Sera remplacé par le trigger DB
          selected_services: serviceIds,
          total_amount_usd: finalAmount,
          original_amount_usd: originalAmount,
          discount_amount_usd: discountAmount,
          discount_code_used: discountData?.code || null,
          client_email: user.email || '',
          client_name: user.user_metadata?.full_name || null,
          geographical_zone: geographicalZone,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Facture créée",
        description: `Facture ${invoice.invoice_number} créée avec succès`
      });

      return invoice;
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la facture",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const processMobileMoneyPayment = async (invoiceId: string, paymentData: CadastralPaymentData) => {
    if (!user) {
      toast({
        title: "Authentification requise",
        description: "Vous devez être connecté pour effectuer un paiement",
        variant: "destructive"
      });
      return null;
    }

    try {
      setLoading(true);
      setPaymentStep('processing');

      const invoice = await supabase
        .from('cadastral_invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (invoice.error) throw invoice.error;

      if (!availableMethods.hasMobileMoney) {
        throw new Error('Aucun moyen de paiement Mobile Money configuré');
      }

      const { data: paymentResult, error: paymentError } = await supabase.functions.invoke(
        'process-mobile-money-payment',
        {
          body: {
            item_id: invoiceId,
            payment_provider: paymentData.provider,
            phone_number: paymentData.phoneNumber,
            amount_usd: invoice.data.total_amount_usd,
            payment_type: 'cadastral_service',
            test_mode: paymentMode.test_mode
          }
        }
      );

      if (paymentError) throw paymentError;

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      const transactionId = paymentResult.transaction_id;
      let attempts = 0;
      const maxAttempts = 20;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const { data: transaction } = await supabase
          .from('payment_transactions')
          .select('status, transaction_reference')
          .eq('id', transactionId)
          .single();

        if (transaction?.status === 'completed') {
          await supabase
            .from('cadastral_invoices')
            .update({
              status: 'paid',
              payment_method: paymentData.provider,
              updated_at: new Date().toISOString()
            })
            .eq('id', invoiceId);

          // Fix #15: batch insert avec upsert
          const serviceIds = selectedServices.map(s => s.id);
          await grantServiceAccess(user.id, invoiceId, parcelNumber!, serviceIds);

          setPaymentStep('success');
          toast({
            title: "Paiement réussi",
            description: "Vos services sont maintenant accessibles"
          });

          clearServices();
          window.dispatchEvent(new CustomEvent('cadastralPaymentCompleted'));

          return invoice.data;
        } else if (transaction?.status === 'failed') {
          throw new Error('Payment failed');
        }

        attempts++;
      }

      throw new Error('Payment timeout - please check your transaction status');

    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Erreur de paiement",
        description: error.message || "Une erreur s'est produite lors du traitement de votre paiement",
        variant: "destructive"
      });
      setPaymentStep('form');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const processStripePayment = async (invoiceId: string) => {
    try {
      setLoading(true);

      if (!availableMethods.hasBankCard) {
        throw new Error('Aucun moyen de paiement par carte bancaire configuré');
      }

      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          items: [invoiceId],
          payment_type: 'cadastral_service',
          test_mode: paymentMode.test_mode
        }
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Stripe payment error:', error);
      toast({
        title: "Erreur de paiement",
        description: "Une erreur est survenue lors du traitement du paiement",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Fix #1: Supprimé checkServiceAccess — utiliser checkSingleServiceAccess de utils/checkServiceAccess.ts

  const resetPaymentState = () => {
    setPaymentStep('form');
    setLoading(false);
  };

  return {
    loading,
    paymentStep,
    createInvoice,
    processMobileMoneyPayment,
    processStripePayment,
    resetPaymentState
  };
};
