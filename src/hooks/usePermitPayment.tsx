import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { pollTransactionStatus } from '@/utils/pollTransactionStatus';

// Fix #19: Use shared FeeItem type pattern
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
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelPolling = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

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
        description: "Impossible de charger les frais d'autorisation",
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

    // Cancel any existing polling
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const totalAmount = selectedFees.reduce((sum, fee) => sum + fee.amount_usd, 0);
      const feeItems = selectedFees.map(fee => ({
        fee_id: fee.id,
        fee_name: fee.fee_name,
        amount_usd: fee.amount_usd
      }));

      // Create payment record
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

      // Process payment — NO PIN sent
      if (paymentData.payment_method === 'mobile_money' && paymentData.payment_provider && paymentData.phone_number) {
        const { data: paymentResult, error: invokeError } = await supabase.functions.invoke(
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

        if (invokeError) throw invokeError;

        // Fix #17: Use shared polling utility instead of duplicated logic
        const pollResult = await pollTransactionStatus(
          paymentResult.transaction_id, 25, 2000, controller.signal
        );

        if (pollResult === 'failed') throw new Error('Le paiement a échoué');
        if (pollResult === 'timeout') throw new Error('Délai de paiement dépassé');
        if (pollResult === 'aborted') throw new Error('Paiement annulé');

        // Update permit payment status
        const { error: updateError } = await supabase
          .from('permit_payments')
          .update({
            status: 'completed',
            paid_at: new Date().toISOString(),
            transaction_id: paymentResult.transaction_id
          })
          .eq('id', paymentRecord.id);

        if (updateError) throw updateError;
      } else if (paymentData.payment_method === 'bank_card') {
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
          window.location.href = stripeSession.url;
          return null;
        }
      } else {
        throw new Error('Moyen de paiement non supporté');
      }

      // Create notification
      try {
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'success',
          title: 'Paiement reçu',
          message: `Votre paiement de ${totalAmount}$ pour la demande d'autorisation a été reçu. Votre dossier est en cours d'examen.`,
          action_url: '/user-dashboard?tab=building-permits'
        });
      } catch (notifErr) { console.warn('Notification insert failed:', notifErr); }

      toast({
        title: "Paiement réussi",
        description: "Votre demande d'autorisation sera traitée sous peu"
      });

      return paymentRecord;
    } catch (error: any) {
      if (error.message !== 'Paiement annulé') {
        console.error('Payment error:', error);
        toast({
          title: "Erreur de paiement",
          description: error.message || "Une erreur est survenue lors du paiement",
          variant: "destructive"
        });
      }
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
    createPayment,
    cancelPolling
  };
};
