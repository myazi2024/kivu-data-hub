import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CartItem } from '@/hooks/useCart';

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

  const createPayment = async (item: CartItem, paymentData: PaymentData) => {
    // SECURITY: Vérifier l'authentification pour tous les paiements
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

      // Appeler la fonction edge de paiement Mobile Money
      const { data: paymentResult, error: paymentError } = await supabase.functions.invoke(
        'process-mobile-money-payment',
        {
          body: {
            item_id: item.id,
            payment_provider: paymentData.provider,
            phone_number: paymentData.phoneNumber,
            amount_usd: item.price,
            payment_type: 'publication',
            // On force le mode réel : le comportement de test est géré côté fournisseur
            test_mode: false
          }
        }
      );

      if (paymentError) throw paymentError;

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      // Poll transaction status
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
              transaction_id: transaction.transaction_reference
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
        } else if (transaction?.status === 'failed') {
          throw new Error('Payment failed');
        }
        
        attempts++;
      }

      throw new Error('Payment timeout - please check your transaction status');

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
      
      // SECURITY: Send only item IDs, prices will be fetched from database
      const itemIds = items.map(item => item.id);
      
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { items: itemIds },
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