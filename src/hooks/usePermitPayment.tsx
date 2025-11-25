import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface PermitFee {
  id: string;
  permit_type: 'construction' | 'regularization';
  fee_name: string;
  amount_usd: number;
  description: string | null;
  is_mandatory: boolean;
  is_active: boolean;
  display_order: number;
}

export interface PermitPayment {
  id: string;
  contribution_id: string;
  user_id: string;
  permit_type: 'construction' | 'regularization';
  fee_items: any[];
  total_amount_usd: number;
  payment_method?: string;
  payment_provider?: string;
  phone_number?: string;
  transaction_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paid_at?: string;
  receipt_url?: string;
  created_at: string;
}

export const usePermitPayment = () => {
  const [loading, setLoading] = useState(false);
  const [fees, setFees] = useState<PermitFee[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchFees = async (permitType: 'construction' | 'regularization') => {
    try {
      const { data, error } = await supabase
        .from('permit_fees_config')
        .select('*')
        .eq('permit_type', permitType)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      const typedData = (data || []) as PermitFee[];
      setFees(typedData);
      return typedData;
    } catch (error: any) {
      console.error('Error fetching fees:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les frais de permis",
        variant: "destructive"
      });
      return [];
    }
  };

  const getPaymentForContribution = async (contributionId: string) => {
    try {
      const { data, error } = await supabase
        .from('permit_payments')
        .select('*')
        .eq('contribution_id', contributionId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error: any) {
      console.error('Error fetching payment:', error);
      return null;
    }
  };

  const checkPaymentStatus = async (contributionId: string): Promise<'paid' | 'pending' | 'not_found' | 'failed'> => {
    try {
      const { data, error } = await supabase
        .from('permit_payments')
        .select('status')
        .eq('contribution_id', contributionId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (!data) return 'not_found';
      if (data.status === 'completed') return 'paid';
      if (data.status === 'failed') return 'failed';
      return 'pending';
    } catch (error: any) {
      console.error('Error checking payment status:', error);
      return 'not_found';
    }
  };

  const createPayment = async (
    contributionId: string,
    permitType: 'construction' | 'regularization',
    selectedFees: PermitFee[],
    paymentData: {
      payment_method: string;
      payment_provider?: string;
      phone_number?: string;
    }
  ) => {
    if (!user) {
      toast({
        title: "Authentification requise",
        description: "Vous devez être connecté pour effectuer un paiement",
        variant: "destructive"
      });
      return null;
    }

    setLoading(true);
    try {
      const totalAmount = selectedFees.reduce((sum, fee) => sum + fee.amount_usd, 0);
      const feeItems = selectedFees.map(fee => ({
        fee_id: fee.id,
        fee_name: fee.fee_name,
        amount_usd: fee.amount_usd
      }));

      // Créer le paiement
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('permit_payments')
        .insert({
          contribution_id: contributionId,
          user_id: user.id,
          permit_type: permitType,
          fee_items: feeItems,
          total_amount_usd: totalAmount,
          payment_method: paymentData.payment_method,
          payment_provider: paymentData.payment_provider,
          phone_number: paymentData.phone_number,
          status: 'pending'
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Traiter le paiement selon le moyen de paiement
      if (paymentData.payment_method === 'mobile_money' && paymentData.payment_provider && paymentData.phone_number) {
        // Appeler l'edge function pour Mobile Money
        const { data: paymentResult, error: paymentError } = await supabase.functions.invoke(
          'process-mobile-money-payment',
          {
            body: {
              payment_provider: paymentData.payment_provider,
              phone_number: paymentData.phone_number,
              amount_usd: totalAmount,
              payment_type: 'permit_fee',
              invoice_id: paymentRecord.id
            }
          }
        );

        if (paymentError) throw paymentError;

        // Attendre la confirmation du paiement (polling)
        let attempts = 0;
        const maxAttempts = 30;
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const { data: txData } = await supabase
            .from('payment_transactions')
            .select('status')
            .eq('invoice_id', paymentRecord.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (txData?.status === 'completed') {
            // Mettre à jour le statut du paiement de permis
            const { error: updateError } = await supabase
              .from('permit_payments')
              .update({
                status: 'completed',
                paid_at: new Date().toISOString(),
                transaction_id: paymentResult.transaction_id
              })
              .eq('id', paymentRecord.id);

            if (updateError) throw updateError;
            break;
          } else if (txData?.status === 'failed') {
            throw new Error('Le paiement a échoué');
          }
          
          attempts++;
        }

        if (attempts >= maxAttempts) {
          throw new Error('Délai de paiement dépassé');
        }
      } else if (paymentData.payment_method === 'bank_card') {
        // Pour Stripe, créer une session de paiement
        const { data: stripeSession, error: stripeError } = await supabase.functions.invoke(
          'create-payment',
          {
            body: {
              invoice_id: paymentRecord.id,
              payment_type: 'permit_fee',
              amount_usd: totalAmount
            }
          }
        );

        if (stripeError) throw stripeError;

        if (stripeSession?.url) {
          // Rediriger vers Stripe
          window.location.href = stripeSession.url;
          return null; // Le paiement sera complété après redirection
        }
      } else {
        throw new Error('Moyen de paiement non supporté');
      }

      // Créer notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'success',
        title: 'Paiement reçu',
        message: `Votre paiement de ${totalAmount}$ pour la demande de permis a été reçu. Votre dossier est en cours d'examen.`,
        action_url: '/user-dashboard?tab=building-permits'
      });

      toast({
        title: "Paiement réussi",
        description: "Votre demande de permis sera traitée sous peu"
      });

      return paymentRecord;
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Erreur de paiement",
        description: error.message || "Une erreur est survenue lors du paiement",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    fees,
    fetchFees,
    getPaymentForContribution,
    checkPaymentStatus,
    createPayment
  };
};