import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CartItem } from '@/hooks/useCart';
import { usePaymentConfig } from '@/hooks/usePaymentConfig';
import { pollTransactionStatus } from '@/utils/pollTransactionStatus';

export interface PaymentData {
  provider: string;
  phoneNumber: string;
  name: string;
}

export const usePayment = () => {
  const [loading, setLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'form' | 'processing' | 'success'>('form');
  const { user } = useAuth();
  const { toast } = useToast();
  const { paymentMode, availableMethods } = usePaymentConfig();

  const createPayment = async (item: CartItem, paymentData: PaymentData) => {
    if (!user) {
      toast({
        title: "Erreur d'authentification",
        description: "Vous devez être connecté pour effectuer un paiement",
        variant: "destructive"
      });
      return null;
    }

    try {
      setLoading(true);
      setPaymentStep('processing');

      if (!availableMethods.hasMobileMoney) {
        throw new Error('Aucun moyen de paiement Mobile Money configuré');
      }

      const { data: paymentResult, error: paymentError } = await supabase.functions.invoke(
        'process-mobile-money-payment',
        {
          body: {
            item_id: item.id,
            payment_provider: paymentData.provider,
            phone_number: paymentData.phoneNumber,
            amount_usd: item.price,
            payment_type: 'publication',
          }
        }
      );

      if (paymentError) throw paymentError;

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      const transactionId = paymentResult.transaction_id;
      const result = await pollTransactionStatus(transactionId);

      if (result === 'failed') throw new Error('Le paiement a échoué');
      if (result === 'timeout') throw new Error('Délai de paiement dépassé');
      if (result === 'aborted') {
        setPaymentStep('form');
        return null;
      }

      // Fetch transaction reference for the completed payment
      const { data: transaction } = await supabase
        .from('payment_transactions')
        .select('transaction_reference')
        .eq('id', transactionId)
        .single();

      // Create payment record for compatibility
      const { data: paymentRecord } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          publication_id: item.id,
          amount_usd: item.price,
          payment_method: 'mobile_money',
          payment_provider: paymentData.provider,
          phone_number: paymentData.phoneNumber,
          status: 'completed',
          transaction_id: transaction?.transaction_reference || transactionId
        })
        .select()
        .single();

      // Create download access
      await supabase
        .from('publication_downloads')
        .insert({
          user_id: user.id,
          publication_id: item.id,
          payment_id: paymentRecord.id
        });

      setPaymentStep('success');
      toast({
        title: "Paiement réussi",
        description: "Votre publication est maintenant disponible"
      });

      return paymentRecord;

    } catch (error: any) {
      console.error('Erreur de paiement:', error);
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

  const createStripePayment = async (items: CartItem[]) => {
    try {
      setLoading(true);
      
      if (!availableMethods.hasBankCard) {
        throw new Error('Aucun moyen de paiement par carte bancaire configuré');
      }
      
      const itemIds = items.map(item => item.id);
      
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { 
          items: itemIds,
        },
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Stripe payment error:', error);
      toast({
        title: "Erreur de paiement",
        description: "Une erreur est survenue lors du traitement du paiement",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const resetPaymentState = () => {
    setPaymentStep('form');
    setLoading(false);
  };

  return {
    loading,
    paymentStep,
    createPayment,
    createStripePayment,
    resetPaymentState,
  };
};