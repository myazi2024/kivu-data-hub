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
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const ref = `EXP-${year}${month}-${random}`;
      const { data } = await supabase
        .from('real_estate_expertise_requests')
        .select('id')
        .eq('reference_number', ref)
        .maybeSingle();
      if (!data) return ref;
      attempts++;
    }
    // Fallback with timestamp for guaranteed uniqueness
    return `EXP-${year}${month}-${Date.now().toString(36).toUpperCase()}`;
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
          user_id: user.id,
          reference_number,
          supporting_documents: data.supporting_documents || [],
        })
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

  const getRequestByParcel = useCallback(async (parcelNumber: string): Promise<ExpertiseRequest | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('real_estate_expertise_requests')
        .select('*')
        .eq('parcel_number', parcelNumber)
        .eq('status', 'completed')
        .order('certificate_issue_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as ExpertiseRequest | null;
    } catch (error: any) {
      console.error('Error fetching expertise by parcel:', error);
      return null;
    }
  }, [user]);

  const checkCertificateValidity = useCallback((certificateIssueDate?: string): { isValid: boolean; daysRemaining: number } => {
    if (!certificateIssueDate) return { isValid: false, daysRemaining: 0 };

    const issueDate = new Date(certificateIssueDate);
    const expiryDate = new Date(issueDate);
    expiryDate.setMonth(expiryDate.getMonth() + 6);
    
    const today = new Date();
    const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      isValid: daysRemaining > 0,
      daysRemaining: Math.max(0, daysRemaining)
    };
  }, []);

  const checkExistingValidCertificate = useCallback(async (parcelNumber: string): Promise<ExpertiseRequest | null> => {
    try {
      const { data, error } = await supabase
        .from('real_estate_expertise_requests')
        .select('*')
        .eq('parcel_number', parcelNumber)
        .eq('status', 'completed')
        .not('certificate_issue_date', 'is', null)
        .not('certificate_url', 'is', null)
        .order('certificate_issue_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data || !data.certificate_url?.trim()) return null;

      const validity = checkCertificateValidity(data.certificate_issue_date);
      return validity.isValid ? (data as ExpertiseRequest) : null;
    } catch (error: any) {
      console.error('Error checking existing certificate:', error);
      return null;
    }
  }, [checkCertificateValidity]);

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
    getRequestByParcel,
    checkExistingValidCertificate,
    checkCertificateValidity,
  };
};
