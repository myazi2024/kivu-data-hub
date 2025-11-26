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
      
      const geographicalZone = selectedServices[0]?.parcel_location || '';
      const serviceIds = selectedServices.map(s => s.id);
      
      // Vérifier le mode de paiement
      if (!isPaymentRequired()) {
        // Mode développement (bypass) - accès gratuit
        const { data: invoice, error } = await supabase
          .from('cadastral_invoices')
          .insert({
            user_id: user.id,
            parcel_number: parcelNumber,
            invoice_number: `INV-CAD-${Date.now()}`,
            selected_services: serviceIds,
            total_amount_usd: 0, // Gratuit en mode bypass
            original_amount_usd: originalAmount,
            discount_amount_usd: originalAmount, // 100% de remise
            discount_code_used: 'MODE_DEV',
            client_email: user.email || '',
            client_name: user.user_metadata?.full_name || null,
            geographical_zone: geographicalZone,
            status: 'paid' // Directement payé
          })
          .select()
          .single();

        if (error) throw error;

        // Créer l'accès aux services directement
        const accessPromises = serviceIds.map(serviceId =>
          supabase
            .from('cadastral_service_access')
            .insert({
              user_id: user.id,
              invoice_id: invoice.id,
              parcel_number: parcelNumber!,
              service_type: serviceId
            })
        );

        await Promise.all(accessPromises);

        toast({
          title: "Accès accordé (mode développement)",
          description: "Services accessibles gratuitement"
        });

        clearServices();
        window.dispatchEvent(new CustomEvent('cadastralPaymentCompleted'));

        return invoice;
      }

      const invoiceNumber = `INV-CAD-${Date.now()}`;

      const { data: invoice, error } = await supabase
        .from('cadastral_invoices')
        .insert({
          user_id: user.id,
          parcel_number: parcelNumber,
          invoice_number: invoiceNumber,
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
        description: `Facture ${invoiceNumber} créée avec succès`
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

      // Vérifier si des moyens de paiement sont configurés
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
            test_mode: paymentMode.test_mode // Utiliser la config admin
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

          const serviceIds = selectedServices.map(s => s.id);
          const accessPromises = serviceIds.map(serviceId =>
            supabase
              .from('cadastral_service_access')
              .insert({
                user_id: user.id,
                invoice_id: invoiceId,
                parcel_number: parcelNumber!,
                service_type: serviceId
              })
          );

          await Promise.all(accessPromises);

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

      // Vérifier si Stripe est configuré
      if (!availableMethods.hasBankCard) {
        throw new Error('Aucun moyen de paiement par carte bancaire configuré');
      }

      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          items: [invoiceId],
          payment_type: 'cadastral_service',
          test_mode: paymentMode.test_mode // Utiliser la config admin
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

  const checkServiceAccess = async (parcelNumber: string, serviceType: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('cadastral_service_access')
        .select('*')
        .eq('user_id', user.id)
        .eq('parcel_number', parcelNumber)
        .eq('service_type', serviceType)
        .maybeSingle();

      if (error) throw error;

      if (data?.expires_at) {
        return new Date(data.expires_at) > new Date();
      }

      return !!data;
    } catch (error) {
      console.error('Error checking service access:', error);
      return false;
    }
  };

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
    checkServiceAccess,
    resetPaymentState
  };
};
