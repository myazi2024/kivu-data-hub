import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ExpertiseRequest {
  id: string;
  reference_number: string;
  user_id: string;
  parcel_id?: string;
  parcel_number: string;
  property_description?: string;
  construction_year?: number;
  construction_quality?: string;
  number_of_floors?: number;
  total_built_area_sqm?: number;
  property_condition?: string;
  has_water_supply: boolean;
  has_electricity: boolean;
  has_sewage_system: boolean;
  has_internet: boolean;
  has_security_system: boolean;
  has_parking: boolean;
  parking_spaces?: number;
  has_garden: boolean;
  garden_area_sqm?: number;
  road_access_type?: string;
  distance_to_main_road_m?: number;
  distance_to_hospital_km?: number;
  distance_to_school_km?: number;
  distance_to_market_km?: number;
  flood_risk_zone: boolean;
  erosion_risk_zone: boolean;
  additional_notes?: string;
  supporting_documents: string[];
  requester_name: string;
  requester_phone?: string;
  requester_email?: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'rejected';
  assigned_to?: string;
  assigned_at?: string;
  market_value_usd?: number;
  expertise_date?: string;
  expertise_report_url?: string;
  certificate_url?: string;
  certificate_issue_date?: string;
  certificate_expiry_date?: string;
  processing_notes?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

interface CreateExpertiseRequestData {
  parcel_number: string;
  parcel_id?: string;
  property_description?: string;
  construction_year?: number;
  construction_quality?: string;
  number_of_floors?: number;
  total_built_area_sqm?: number;
  property_condition?: string;
  has_water_supply?: boolean;
  has_electricity?: boolean;
  has_sewage_system?: boolean;
  has_internet?: boolean;
  has_security_system?: boolean;
  has_parking?: boolean;
  parking_spaces?: number;
  has_garden?: boolean;
  garden_area_sqm?: number;
  road_access_type?: string;
  distance_to_main_road_m?: number;
  distance_to_hospital_km?: number;
  distance_to_school_km?: number;
  distance_to_market_km?: number;
  flood_risk_zone?: boolean;
  erosion_risk_zone?: boolean;
  additional_notes?: string;
  supporting_documents?: string[];
  requester_name: string;
  requester_phone?: string;
  requester_email?: string;
}

export const useRealEstateExpertise = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<ExpertiseRequest[]>([]);

  const generateReferenceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `EXP-${year}${month}-${random}`;
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
      const reference_number = generateReferenceNumber();

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

  const getRequestByParcel = async (parcelNumber: string): Promise<ExpertiseRequest | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('real_estate_expertise_requests')
        .select('*')
        .eq('parcel_number', parcelNumber)
        .eq('status', 'completed')
        .order('certificate_issue_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as ExpertiseRequest | null;
    } catch (error: any) {
      console.error('Error fetching expertise by parcel:', error);
      return null;
    }
  };

  /**
   * Check if a valid (non-expired) expertise certificate exists for a parcel.
   * Returns the completed request if the certificate is still valid, null otherwise.
   */
  const checkExistingValidCertificate = async (parcelNumber: string): Promise<ExpertiseRequest | null> => {
    try {
      const { data, error } = await supabase
        .from('real_estate_expertise_requests')
        .select('*')
        .eq('parcel_number', parcelNumber)
        .eq('status', 'completed')
        .not('certificate_issue_date', 'is', null)
        .order('certificate_issue_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const validity = checkCertificateValidity(data.certificate_issue_date);
      return validity.isValid ? (data as ExpertiseRequest) : null;
    } catch (error: any) {
      console.error('Error checking existing certificate:', error);
      return null;
    }
  };

  const checkCertificateValidity = (certificateIssueDate?: string): { isValid: boolean; daysRemaining: number } => {
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
    getRequestByParcel,
    checkExistingValidCertificate,
    checkCertificateValidity,
  };
};
