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

      // Créer l'enregistrement de paiement
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('payments')
        .insert([{
          user_id: user.id,
          publication_id: item.id,
          amount_usd: item.price,
          payment_method: 'mobile_money',
          payment_provider: paymentData.provider,
          phone_number: paymentData.phoneNumber,
          status: 'pending'
        }])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Simuler le processus de paiement mobile money
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Mise à jour du statut du paiement
      const { error: updateError } = await supabase
        .from('payments')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentRecord.id);

      if (updateError) throw updateError;

      // Créer l'enregistrement de téléchargement
      const { error: downloadError } = await supabase
        .from('publication_downloads')
        .insert([{
          user_id: user.id,
          publication_id: item.id,
          payment_id: paymentRecord.id
        }]);

      if (downloadError) throw downloadError;

      setPaymentStep('success');
      toast({
        title: "Paiement réussi",
        description: "Votre publication est maintenant disponible pour téléchargement"
      });

      return paymentRecord;
    } catch (error) {
      console.error('Erreur de paiement:', error);
      toast({
        title: "Erreur de paiement",
        description: "Une erreur s'est produite lors du traitement de votre paiement",
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
      
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { items },
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