import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { pollTransactionStatus } from '@/utils/pollTransactionStatus';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCadastralCart } from './useCadastralCart';
import { usePaymentConfig } from './usePaymentConfig';

export interface CadastralPaymentData {
  provider: string;
  phoneNumber: string;
  name: string;
}

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

const getInvoiceServices = async (invoiceId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('cadastral_invoices')
    .select('selected_services')
    .eq('id', invoiceId)
    .single();

  if (error) throw error;

  const services = data?.selected_services;
  if (Array.isArray(services)) return services as string[];
  if (typeof services === 'string') {
    try { return JSON.parse(services); } catch { return []; }
  }
  return [];
};

export const useCadastralPayment = () => {
  const [loading, setLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'form' | 'processing' | 'success'>('form');
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedServices, parcelNumber, clearServices } = useCadastralCart();
  const { paymentMode, availableMethods, isPaymentRequired } = usePaymentConfig();

  const pollingAbortRef = useRef<AbortController | null>(null);

  /**
   * Crée une facture. Si le paiement n'est pas requis → accès gratuit.
   */
  const createInvoice = useCallback(async (discountData?: {
    code: string;
    amount: number;
    reseller_id: string;
    code_id: string;
  }) => {
    if (!user) {
      toast({ title: "Authentification requise", description: "Vous devez être connecté pour créer une facture", variant: "destructive" });
      return null;
    }

    if (selectedServices.length === 0) {
      toast({ title: "Aucun service sélectionné", description: "Veuillez sélectionner au moins un service", variant: "destructive" });
      return null;
    }

    if (!parcelNumber) {
      toast({ title: "Numéro de parcelle manquant", description: "Le numéro de parcelle est requis", variant: "destructive" });
      return null;
    }

    try {
      setLoading(true);

      const serviceIds = selectedServices.map(s => s.id);

      // Paiement non requis → accès gratuit
      if (!isPaymentRequired()) {
        const { data: invoice, error } = await supabase
          .from('cadastral_invoices')
          .insert({
            user_id: user.id,
            parcel_number: parcelNumber,
            invoice_number: null as any,
            selected_services: serviceIds,
            total_amount_usd: 0,
            original_amount_usd: 0,
            discount_amount_usd: 0,
            discount_code_used: 'BYPASS',
            payment_method: 'BYPASS',
            client_email: user.email || '',
            client_name: user.user_metadata?.full_name || null,
            geographical_zone: selectedServices[0]?.parcel_location || '',
            status: 'paid',
            currency_code: 'USD',
            exchange_rate_used: 1
          })
          .select()
          .single();

        if (error) throw error;

        await grantServiceAccess(user.id, invoice.id, parcelNumber, serviceIds);

        toast({ title: "Accès accordé", description: "Services accessibles gratuitement" });
        clearServices();
        window.dispatchEvent(new CustomEvent('cadastralPaymentCompleted'));
        return invoice;
      }

      // Paiement requis → RPC sécurisée
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'create_cadastral_invoice_secure',
        {
          parcel_number_param: parcelNumber,
          selected_services_param: serviceIds,
          discount_code_param: discountData?.code || null,
        }
      );

      if (rpcError) throw rpcError;

      const result = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;

      if (result.error_message) {
        toast({ title: "Erreur", description: result.error_message, variant: "destructive" });
        return null;
      }

      toast({
        title: "Facture créée",
        description: `Facture ${result.invoice_number} créée avec succès`
      });

      return {
        id: result.invoice_id,
        invoice_number: result.invoice_number,
        total_amount_usd: result.total_amount_usd,
        original_amount_usd: result.original_amount_usd,
        discount_amount_usd: result.discount_amount_usd,
        selected_services: serviceIds,
        status: 'pending',
        parcel_number: parcelNumber,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({ title: "Erreur", description: "Impossible de créer la facture", variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, selectedServices, parcelNumber, isPaymentRequired, clearServices, toast]);

  const processMobileMoneyPayment = useCallback(async (invoiceId: string, paymentData: CadastralPaymentData) => {
    if (!user) {
      toast({ title: "Authentification requise", description: "Vous devez être connecté pour effectuer un paiement", variant: "destructive" });
      return null;
    }

    pollingAbortRef.current?.abort();
    const abortController = new AbortController();
    pollingAbortRef.current = abortController;

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
            currency_code: invoice.data.currency_code || 'USD',
          }
        }
      );

      if (paymentError) throw paymentError;

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      const transactionId = paymentResult.transaction_id;

      const status = await pollTransactionStatus(transactionId, 20, 2000, abortController.signal);

      if (status === 'aborted') return null;

      if (status === 'completed') {
        await supabase
          .from('cadastral_invoices')
          .update({
            status: 'paid',
            payment_method: paymentData.provider,
            updated_at: new Date().toISOString()
          })
          .eq('id', invoiceId);

        const invoiceServiceIds = await getInvoiceServices(invoiceId);

        try {
          await grantServiceAccess(user.id, invoiceId, invoice.data.parcel_number, invoiceServiceIds);
        } catch (accessError) {
          console.error('Première tentative grantServiceAccess échouée, retry...', accessError);
          await new Promise(r => setTimeout(r, 1000));
          await grantServiceAccess(user.id, invoiceId, invoice.data.parcel_number, invoiceServiceIds);
        }

        setPaymentStep('success');
        toast({ title: "Paiement réussi", description: "Vos services sont maintenant accessibles" });

        clearServices();
        window.dispatchEvent(new CustomEvent('cadastralPaymentCompleted'));

        return invoice.data;
      } else if (status === 'failed') {
        throw new Error('Payment failed');
      }

      throw new Error(`Délai d'attente dépassé. ID transaction: ${transactionId}. Contactez le support si le montant a été débité.`);

    } catch (error: any) {
      if (error.name === 'AbortError') return null;
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
  }, [user, availableMethods, clearServices, toast]);

  const processStripePayment = useCallback(async (invoiceId: string) => {
    try {
      setLoading(true);

      if (!availableMethods.hasBankCard) {
        throw new Error('Aucun moyen de paiement par carte bancaire configuré');
      }

      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          items: [invoiceId],
          payment_type: 'cadastral_service',
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
  }, [availableMethods, toast]);

  /**
   * Paiement simulé en mode test — crée une transaction completed + accorde l'accès.
   */
  const processTestPayment = useCallback(async (invoiceId: string) => {
    if (!user) {
      toast({ title: "Authentification requise", variant: "destructive" });
      return null;
    }

    try {
      setLoading(true);
      setPaymentStep('processing');

      // Créer une transaction simulée
      const { data: txn, error: txnError } = await supabase
        .from('payment_transactions')
        .insert({
          user_id: user.id,
          item_id: invoiceId,
          payment_type: 'cadastral_service',
          payment_provider: 'TEST_SIMULATION',
          phone_number: '0000000000',
          amount_usd: 0,
          currency_code: 'USD',
          status: 'completed',
          provider_transaction_id: `TEST-${Date.now()}`,
        })
        .select('id')
        .single();

      if (txnError) throw txnError;

      // Marquer la facture comme payée
      await supabase
        .from('cadastral_invoices')
        .update({
          status: 'paid',
          payment_method: 'TEST',
          payment_id: txn.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      // Accorder l'accès aux services
      const invoice = await supabase
        .from('cadastral_invoices')
        .select('parcel_number, selected_services')
        .eq('id', invoiceId)
        .single();

      if (invoice.data) {
        const serviceIds = await getInvoiceServices(invoiceId);
        await grantServiceAccess(user.id, invoiceId, invoice.data.parcel_number, serviceIds);
      }

      setPaymentStep('success');
      toast({ title: "Paiement test simulé", description: "Services débloqués (mode test)" });
      clearServices();
      window.dispatchEvent(new CustomEvent('cadastralPaymentCompleted'));

      return invoice.data;
    } catch (error: any) {
      console.error('Test payment error:', error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setPaymentStep('form');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, clearServices, toast]);

  const resetPaymentState = useCallback(() => {
    pollingAbortRef.current?.abort();
    pollingAbortRef.current = null;
    setPaymentStep('form');
    setLoading(false);
  }, []);

  return {
    loading,
    paymentStep,
    createInvoice,
    processMobileMoneyPayment,
    processStripePayment,
    processTestPayment,
    resetPaymentState
  };
};
