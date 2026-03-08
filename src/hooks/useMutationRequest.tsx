import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface MutationFee {
  id: string;
  fee_name: string;
  amount_usd: number;
  description: string | null;
  is_mandatory: boolean;
  is_active: boolean;
  display_order: number;
}

export interface MutationRequest {
  id: string;
  reference_number: string;
  user_id: string;
  parcel_number: string;
  parcel_id: string | null;
  mutation_type: string;
  requester_type: string;
  requester_name: string;
  requester_phone: string | null;
  requester_email: string | null;
  beneficiary_name: string | null;
  beneficiary_phone: string | null;
  proposed_changes: Record<string, any>;
  justification: string | null;
  fee_items: any[];
  total_amount_usd: number;
  payment_status: string;
  status: string;
  processing_notes: string | null;
  rejection_reason: string | null;
  estimated_processing_days: number;
  created_at: string;
  updated_at: string;
}

export const useMutationRequest = () => {
  const [loading, setLoading] = useState(false);
  const [fees, setFees] = useState<MutationFee[]>([]);
  const [userRequests, setUserRequests] = useState<MutationRequest[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchFees = async () => {
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
  };

  const fetchUserRequests = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mutation_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserRequests((data || []) as MutationRequest[]);
    } catch (error: any) {
      console.error('Error fetching user requests:', error);
    } finally {
      setLoading(false);
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
    total_amount_override?: number; // Total calculé côté formulaire (inclut frais mutation + retard)
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
        status: 'pending'
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
        updateData.status = 'in_review'; // Passer automatiquement en révision après paiement
      }

      const { error } = await supabase
        .from('mutation_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      // Créer une notification
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

  useEffect(() => {
    fetchFees();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserRequests();
    }
  }, [user]);

  return {
    loading,
    fees,
    userRequests,
    fetchFees,
    fetchUserRequests,
    createMutationRequest,
    updatePaymentStatus
  };
};
