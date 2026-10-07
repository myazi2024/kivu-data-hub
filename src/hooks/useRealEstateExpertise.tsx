import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { ExpertiseRequest, CreateExpertiseRequestData } from '@/types/expertise';

export type { ExpertiseRequest, CreateExpertiseRequestData };

export const useRealEstateExpertise = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<ExpertiseRequest[]>([]);

  const generateReferenceNumber = async (): Promise<string> => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    let attempts = 0;
    while (attempts < 5) {
      // Crypto-strong random suffix (project rule: never Math.random for IDs)
      const random = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
      const ref = `EXP-${year}${month}-${random}`;
      const { data } = await supabase
        .from('real_estate_expertise_requests')
        .select('id')
        .eq('reference_number', ref)
        .maybeSingle();
      if (!data) return ref;
      attempts++;
    }
    // Fallback (UUID is collision-resistant)
    return `EXP-${year}${month}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  };

  const fetchUserRequests = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('real_estate_expertise_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as ExpertiseRequest[]);
    } catch (error: any) {
      console.error('Error fetching expertise requests:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createExpertiseRequest = async (data: CreateExpertiseRequestData): Promise<ExpertiseRequest | null> => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return null;
    }

    setLoading(true);
    try {
      const reference_number = await generateReferenceNumber();

      const { data: insertedData, error } = await supabase
        .from('real_estate_expertise_requests')
        .insert({
          ...data,
          building_details: data.building_details ?? [],
          user_id: user.id,
          reference_number,
          supporting_documents: data.supporting_documents || [],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .select()
        .single();

      if (error) throw error;

      toast.success('Demande d\'expertise créée avec succès');
      await fetchUserRequests();
      return insertedData as ExpertiseRequest;
    } catch (error: any) {
      console.error('Error creating expertise request:', error);
      toast.error('Erreur lors de la création de la demande');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserRequests();
    }
  }, [user, fetchUserRequests]);

  return {
    loading,
    requests,
    createExpertiseRequest,
    fetchUserRequests,
  };
};
