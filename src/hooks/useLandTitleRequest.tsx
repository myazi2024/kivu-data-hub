import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LandTitleFee {
  id: string;
  fee_name: string;
  description: string | null;
  amount_usd: number;
  is_mandatory: boolean;
  is_active: boolean;
  display_order: number;
}

export interface LandTitleRequestData {
  // Type de demande
  requestType?: 'initial' | 'renouvellement' | 'definitif' | '';
  selectedParcelNumber?: string;
  
  // Demandeur
  requesterType: 'owner' | 'representative';
  requesterLastName: string;
  requesterFirstName: string;
  requesterMiddleName?: string;
  requesterPhone: string;
  requesterEmail?: string;
  requesterIdDocumentFile?: File | null;
  
  // Propriétaire
  isOwnerSameAsRequester: boolean;
  ownerLastName?: string;
  ownerFirstName?: string;
  ownerMiddleName?: string;
  ownerLegalStatus?: string;
  ownerPhone?: string;
  ownerIdDocumentFile?: File | null;
  
  // Localisation
  sectionType: 'urbaine' | 'rurale' | '';
  province: string;
  ville?: string;
  commune?: string;
  quartier?: string;
  avenue?: string;
  territoire?: string;
  collectivite?: string;
  groupement?: string;
  village?: string;
  circonscriptionFonciere?: string;
  
  // Données techniques
  areaSqm?: number;
  gpsCoordinates?: Array<{ borne: string; lat: string; lng: string }>;
  parcelSides?: Array<{ name: string; length: string }>;
  roadBorderingSides?: Array<{ side: string; roadName: string }>;
  
  // Valorisation
  constructionType?: string;
  declaredUsage?: string;
  deducedTitleType?: string;
  
  // Documents
  proofOfOwnershipFile?: File | null;
  additionalDocuments?: File[];
  
  // Frais sélectionnés
  selectedFees: string[];
  
  // Total calculé dynamiquement
  totalAmountOverride?: number;
}

export const useLandTitleRequest = () => {
  const [loading, setLoading] = useState(false);
  const [fees, setFees] = useState<LandTitleFee[]>([]);
  const [loadingFees, setLoadingFees] = useState(true);

  const fetchFees = useCallback(async () => {
    try {
      setLoadingFees(true);
      const { data, error } = await supabase
        .from('land_title_fees_config')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setFees(data || []);
    } catch (error) {
      console.error('Error fetching land title fees:', error);
      toast.error('Erreur lors du chargement des frais');
    } finally {
      setLoadingFees(false);
    }
  }, []);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  const calculateTotal = useCallback((selectedFeeIds: string[]): number => {
    return fees
      .filter(fee => fee.is_mandatory || selectedFeeIds.includes(fee.id))
      .reduce((total, fee) => total + fee.amount_usd, 0);
  }, [fees]);

  const getMandatoryFees = useCallback((): LandTitleFee[] => {
    return fees.filter(fee => fee.is_mandatory);
  }, [fees]);

  const getOptionalFees = useCallback((): LandTitleFee[] => {
    return fees.filter(fee => !fee.is_mandatory);
  }, [fees]);

  const uploadDocument = async (file: File, folder: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('land-title-documents')
        .upload(fileName, file);

      if (uploadError) {
        // Bucket might not exist, try creating in public bucket
        const { error: publicUploadError } = await supabase.storage
          .from('public')
          .upload(`land-titles/${fileName}`, file);
          
        if (publicUploadError) throw publicUploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from('public')
          .getPublicUrl(`land-titles/${fileName}`);
        return publicUrlData.publicUrl;
      }

      const { data: urlData } = supabase.storage
        .from('land-title-documents')
        .getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading document:', error);
      return null;
    }
  };

  const submitRequest = async (data: LandTitleRequestData): Promise<{ success: boolean; requestId?: string; referenceNumber?: string }> => {
    setLoading(true);
    try {
      // Upload documents
      let requesterIdDocUrl: string | null = null;
      let ownerIdDocUrl: string | null = null;
      let proofOfOwnershipUrl: string | null = null;

      if (data.requesterIdDocumentFile) {
        requesterIdDocUrl = await uploadDocument(data.requesterIdDocumentFile, 'requester-id');
      }

      if (data.ownerIdDocumentFile && !data.isOwnerSameAsRequester) {
        ownerIdDocUrl = await uploadDocument(data.ownerIdDocumentFile, 'owner-id');
      }

      if (data.proofOfOwnershipFile) {
        proofOfOwnershipUrl = await uploadDocument(data.proofOfOwnershipFile, 'proof-of-ownership');
      }

      // Build fee items - use dynamic fees if available
      const totalAmount = data.totalAmountOverride ?? calculateTotal(data.selectedFees);
      
      const feeItems = fees
        .filter(fee => fee.is_mandatory || data.selectedFees.includes(fee.id))
        .map(fee => ({
          id: fee.id,
          name: fee.fee_name,
          amount: fee.amount_usd,
          is_mandatory: fee.is_mandatory
        }));

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté pour soumettre une demande');
        return { success: false };
      }

      const { data: insertedData, error } = await supabase
        .from('land_title_requests')
        .insert([{
          user_id: user.id,
          requester_type: data.requesterType,
          requester_last_name: data.requesterLastName,
          requester_first_name: data.requesterFirstName,
          requester_middle_name: data.requesterMiddleName || null,
          requester_phone: data.requesterPhone,
          requester_email: data.requesterEmail || null,
          requester_id_document_url: requesterIdDocUrl,
          is_owner_same_as_requester: data.isOwnerSameAsRequester,
          owner_last_name: data.isOwnerSameAsRequester ? null : data.ownerLastName,
          owner_first_name: data.isOwnerSameAsRequester ? null : data.ownerFirstName,
          owner_middle_name: data.isOwnerSameAsRequester ? null : data.ownerMiddleName,
          owner_legal_status: data.isOwnerSameAsRequester ? null : data.ownerLegalStatus,
          owner_phone: data.isOwnerSameAsRequester ? null : data.ownerPhone,
          owner_id_document_url: ownerIdDocUrl,
          section_type: data.sectionType,
          province: data.province,
          ville: data.ville || null,
          commune: data.commune || null,
          quartier: data.quartier || null,
          avenue: data.avenue || null,
          territoire: data.territoire || null,
          collectivite: data.collectivite || null,
          groupement: data.groupement || null,
          village: data.village || null,
          circonscription_fonciere: data.circonscriptionFonciere || null,
          area_sqm: data.areaSqm || null,
          gps_coordinates: data.gpsCoordinates || null,
          parcel_sides: data.parcelSides || null,
          road_bordering_sides: data.roadBorderingSides || null,
          proof_of_ownership_url: proofOfOwnershipUrl,
          fee_items: feeItems,
          total_amount_usd: totalAmount
        }] as any)
        .select('id, reference_number')
        .single();

      if (error) throw error;

      toast.success('Demande de titre foncier soumise avec succès');
      return { 
        success: true, 
        requestId: insertedData.id, 
        referenceNumber: insertedData.reference_number 
      };
    } catch (error: any) {
      console.error('Error submitting land title request:', error);
      toast.error(error.message || 'Erreur lors de la soumission de la demande');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    fees,
    loadingFees,
    fetchFees,
    calculateTotal,
    getMandatoryFees,
    getOptionalFees,
    submitRequest
  };
};
