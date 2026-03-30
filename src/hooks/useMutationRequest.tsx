import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTestEnvironment, applyTestFilter } from '@/hooks/useTestEnvironment';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

import type { MutationFee, MutationRequest, MutationRequestWithProfile } from '@/types/mutation';

export type { MutationFee, MutationRequest, MutationRequestWithProfile };

export const useMutationRequest = () => {
  const [loading, setLoading] = useState(false);
  const [fees, setFees] = useState<MutationFee[]>([]);
  const [userRequests, setUserRequests] = useState<MutationRequest[]>([]);
  const { user, profile } = useAuth();
  const { isTestRoute } = useTestEnvironment();
  const { toast } = useToast();

  const fetchFees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('mutation_fees_config')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setFees((data || []) as MutationFee[]);
      return data || [];
    } catch (error: any) {
      console.error('Error fetching mutation fees:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les frais de mutation",
        variant: "destructive"
      });
      return [];
    }
  }, [toast]);

  const fetchUserRequests = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      let query = supabase
        .from('mutation_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      query = applyTestFilter(query, 'reference_number', isTestRoute);
      const { data, error } = await query;

      if (error) throw error;
      setUserRequests((data || []) as MutationRequest[]);
    } catch (error: any) {
      console.error('Error fetching user requests:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Check if user already has a pending/in_review mutation request for this parcel.
   * Prevents duplicate submissions.
   */
  const checkExistingPendingRequest = async (parcelNumber: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data, error } = await supabase
        .from('mutation_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('parcel_number', parcelNumber)
        .in('status', ['pending', 'in_review', 'on_hold'])
        .limit(1);

      if (error) throw error;
      return (data?.length ?? 0) > 0;
    } catch (error) {
      console.error('Error checking existing request:', error);
      return false;
    }
  };

  const createMutationRequest = async (data: {
    parcel_number: string;
    parcel_id?: string;
    mutation_type: string;
    requester_type: string;
    requester_name: string;
    requester_phone?: string;
    requester_email?: string;
    beneficiary_name?: string;
    beneficiary_phone?: string;
    proposed_changes: Record<string, any>;
    justification?: string;
    selected_fees: MutationFee[];
    total_amount_override?: number;
    // New dedicated column fields
    supporting_documents?: string[];
    market_value_usd?: number;
    expertise_certificate_url?: string;
    expertise_certificate_date?: string;
    title_age?: string;
    mutation_fee_amount?: number;
    bank_fee_amount?: number;
    late_fee_amount?: number;
    late_fee_days?: number;
  }) => {
    if (!user) {
      toast({
        title: "Authentification requise",
        description: "Vous devez être connecté pour soumettre une demande de mutation",
        variant: "destructive"
      });
      return null;
    }

    setLoading(true);
    try {
      const baseFees = data.selected_fees.reduce((sum, fee) => sum + fee.amount_usd, 0);
      const totalAmount = data.total_amount_override ?? baseFees;
      const feeItems = data.selected_fees.map(fee => ({
        fee_id: fee.id,
        fee_name: fee.fee_name,
        amount_usd: fee.amount_usd
      }));

      const insertData = {
        user_id: user.id,
        parcel_number: data.parcel_number,
        parcel_id: data.parcel_id || null,
        mutation_type: data.mutation_type,
        requester_type: data.requester_type,
        requester_name: data.requester_name,
        requester_phone: data.requester_phone || null,
        requester_email: data.requester_email || null,
        beneficiary_name: data.beneficiary_name || null,
        beneficiary_phone: data.beneficiary_phone || null,
        proposed_changes: data.proposed_changes,
        justification: data.justification || null,
        fee_items: feeItems,
        total_amount_usd: totalAmount,
        payment_status: 'pending',
        status: 'pending',
        estimated_processing_days: 14,
        // Dedicated columns (no longer buried in JSON)
        supporting_documents: data.supporting_documents?.length ? data.supporting_documents : null,
        market_value_usd: data.market_value_usd ?? null,
        expertise_certificate_url: data.expertise_certificate_url ?? null,
        expertise_certificate_date: data.expertise_certificate_date || null,
        title_age: data.title_age ?? null,
        mutation_fee_amount: data.mutation_fee_amount ?? null,
        bank_fee_amount: data.bank_fee_amount ?? null,
        late_fee_amount: data.late_fee_amount ?? null,
        late_fee_days: data.late_fee_days ?? null,
      };

      const { data: request, error } = await supabase
        .from('mutation_requests')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Demande créée",
        description: "Veuillez procéder au paiement pour soumettre votre demande"
      });

      return request as MutationRequest;
    } catch (error: any) {
      console.error('Error creating mutation request:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la demande de mutation",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (requestId: string, status: 'paid' | 'failed', paymentId?: string) => {
    try {
      const updateData: any = {
        payment_status: status,
        updated_at: new Date().toISOString()
      };

      if (status === 'paid') {
        updateData.paid_at = new Date().toISOString();
        updateData.payment_id = paymentId;
        updateData.status = 'in_review';
      }

      const { error } = await supabase
        .from('mutation_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      if (user && status === 'paid') {
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'success',
          title: 'Demande de mutation soumise',
          message: 'Votre demande de mutation a été soumise avec succès et est en cours d\'examen.',
          action_url: '/user-dashboard?tab=mutations'
        });
      }

      await fetchUserRequests();
      return true;
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      return false;
    }
  };

  const cancelMutationRequest = async (requestId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('mutation_requests')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('user_id', user.id)
        .in('status', ['pending']);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'warning',
        title: 'Demande de mutation annulée',
        message: 'Votre demande de mutation a été annulée avec succès.',
        action_url: '/user-dashboard?tab=mutations'
      });

      toast({
        title: "Demande annulée",
        description: "Votre demande de mutation a été annulée."
      });

      await fetchUserRequests();
      return true;
    } catch (error: any) {
      console.error('Error cancelling mutation request:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'annuler la demande",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  useEffect(() => {
    if (user) {
      fetchUserRequests();
    }
  }, [user, fetchUserRequests]);

  return {
    loading,
    fees,
    userRequests,
    fetchFees,
    fetchUserRequests,
    createMutationRequest,
    updatePaymentStatus,
    cancelMutationRequest,
    checkExistingPendingRequest
  };
};
