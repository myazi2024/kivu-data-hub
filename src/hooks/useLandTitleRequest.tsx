import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LandTitleRequestData {
  // Type de demande
  requestType?: 'initial' | 'renouvellement' | '';
  selectedParcelNumber?: string;
  
  // Demandeur
  requesterType: 'owner' | 'representative';
  requesterLastName: string;
  requesterFirstName: string;
  requesterMiddleName?: string;
  requesterPhone: string;
  requesterEmail?: string;
  requesterLegalStatus?: string;
  requesterGender?: string;
  requesterIdDocumentFile?: File | null;
  
  // Propriétaire
  isOwnerSameAsRequester: boolean;
  ownerLastName?: string;
  ownerFirstName?: string;
  ownerMiddleName?: string;
  ownerLegalStatus?: string;
  ownerGender?: string;
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
  
  
  // Données techniques
  areaSqm?: number;
  gpsCoordinates?: Array<{ borne: string; lat: string; lng: string }>;
  parcelSides?: Array<{ name: string; length: string }>;
  roadBorderingSides?: Array<{ side: string; roadName: string }>;
  
  // Valorisation
  constructionType?: string;
  constructionNature?: string;
  constructionMaterials?: string;
  declaredUsage?: string;
  deducedTitleType?: string;
  nationality?: string;
  occupationDuration?: string;
  standing?: string;
  constructionYear?: number;
  floorNumber?: string;
  
  // Documents
  proofOfOwnershipFile?: File | null;
  procurationDocumentFile?: File | null;
  additionalDocuments?: File[];
  
  // Frais sélectionnés
  selectedFees: string[];
  
  // Total calculé dynamiquement
  totalAmountOverride?: number;
}

// Phone number validation for DRC numbers
const PHONE_REGEX = /^\+?243\s?\d{9}$/;

export const validatePhone = (phone: string): boolean => {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return PHONE_REGEX.test(cleaned);
};

const uploadDocument = async (file: File, folder: string): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${crypto.randomUUID()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('land-title-documents')
      .upload(fileName, file);

    if (uploadError) {
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

export const useLandTitleRequest = () => {
  const [loading, setLoading] = useState(false);

  /**
   * Step 1: Create the DB record with status pending_payment (BEFORE payment).
   * Returns the request ID and reference number for use in the payment step.
   */
  const createPendingRequest = useCallback(async (
    data: LandTitleRequestData,
    feeItems: Array<{ id: string; name: string; amount: number; is_mandatory: boolean }> = []
  ): Promise<{ success: boolean; requestId?: string; referenceNumber?: string }> => {
    setLoading(true);
    try {
      // 1. Upload documents FIRST
      let requesterIdDocUrl: string | null = null;
      let ownerIdDocUrl: string | null = null;
      let proofOfOwnershipUrl: string | null = null;
      let procurationDocUrl: string | null = null;

      if (data.requesterIdDocumentFile) {
        requesterIdDocUrl = await uploadDocument(data.requesterIdDocumentFile, 'requester-id');
        if (!requesterIdDocUrl) {
          toast.error("Échec de l'upload de la pièce d'identité du demandeur");
          return { success: false };
        }
      }

      if (data.ownerIdDocumentFile && !data.isOwnerSameAsRequester) {
        ownerIdDocUrl = await uploadDocument(data.ownerIdDocumentFile, 'owner-id');
        if (!ownerIdDocUrl) {
          toast.error("Échec de l'upload de la pièce d'identité du propriétaire");
          return { success: false };
        }
      }

      if (data.proofOfOwnershipFile) {
        proofOfOwnershipUrl = await uploadDocument(data.proofOfOwnershipFile, 'proof-of-ownership');
        if (!proofOfOwnershipUrl) {
          toast.error("Échec de l'upload de la preuve de propriété");
          return { success: false };
        }
      }

      if (data.procurationDocumentFile && data.requesterType === 'representative') {
        procurationDocUrl = await uploadDocument(data.procurationDocumentFile, 'procuration');
        if (!procurationDocUrl) {
          toast.error("Échec de l'upload de la procuration");
          return { success: false };
        }
      }

      // 2. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté pour soumettre une demande');
        return { success: false };
      }

      const totalAmount = data.totalAmountOverride ?? 0;

      // 3. Insert with payment_status = 'pending'
      const { data: insertedData, error } = await supabase
        .from('land_title_requests')
        .insert([{
          user_id: user.id,
          request_type: data.requestType || 'initial',
          selected_parcel_number: data.selectedParcelNumber || null,
          requester_type: data.requesterType,
          requester_last_name: data.requesterLastName,
          requester_first_name: data.requesterFirstName,
          requester_middle_name: data.requesterMiddleName || null,
          requester_phone: data.requesterPhone,
          requester_email: data.requesterEmail || null,
          requester_legal_status: data.requesterLegalStatus || null,
          requester_gender: data.requesterGender || null,
          requester_id_document_url: requesterIdDocUrl,
          is_owner_same_as_requester: data.isOwnerSameAsRequester,
          owner_last_name: data.isOwnerSameAsRequester ? null : data.ownerLastName,
          owner_first_name: data.isOwnerSameAsRequester ? null : data.ownerFirstName,
          owner_middle_name: data.isOwnerSameAsRequester ? null : data.ownerMiddleName,
          owner_legal_status: data.isOwnerSameAsRequester ? null : data.ownerLegalStatus,
          owner_gender: data.isOwnerSameAsRequester ? null : data.ownerGender,
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
          
          area_sqm: data.areaSqm || null,
          gps_coordinates: data.gpsCoordinates || null,
          parcel_sides: data.parcelSides || null,
          road_bordering_sides: data.roadBorderingSides || null,
          construction_type: data.constructionType || null,
          construction_nature: data.constructionNature || null,
          construction_materials: data.constructionMaterials || null,
          declared_usage: data.declaredUsage || null,
          deduced_title_type: data.deducedTitleType || null,
          nationality: data.nationality || null,
          occupation_duration: data.occupationDuration || null,
          standing: data.standing || null,
          construction_year: data.constructionYear || null,
          floor_number: data.floorNumber || null,
          proof_of_ownership_url: proofOfOwnershipUrl,
          procuration_document_url: procurationDocUrl,
          fee_items: feeItems,
          total_amount_usd: totalAmount,
          payment_status: 'pending'
        } as any])
        .select('id, reference_number')
        .single();

      if (error) throw error;

      return { 
        success: true, 
        requestId: insertedData.id, 
        referenceNumber: insertedData.reference_number 
      };
    } catch (error: any) {
      console.error('Error creating land title request:', error);
      toast.error(error.message || 'Erreur lors de la création de la demande');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Step 2: Mark the request as paid after successful payment.
   */
  const markRequestPaid = useCallback(async (requestId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('land_title_requests')
        .update({ 
          payment_status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;
      
      toast.success('Demande de titre foncier soumise avec succès');
      return true;
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      toast.error(`Le paiement a été effectué mais la mise à jour a échoué. ID demande: ${requestId}. Contactez le support.`);
      return false;
    }
  }, []);

  /**
   * Cancel orphaned pending request (e.g. user cancelled payment).
   */
  const cancelPendingRequest = useCallback(async (requestId: string): Promise<void> => {
    try {
      await supabase
        .from('land_title_requests')
        .update({ 
          status: 'cancelled',
          payment_status: 'cancelled'
        })
        .eq('id', requestId)
        .eq('payment_status', 'pending');
    } catch (error) {
      console.error('Error cancelling pending request:', error);
    }
  }, []);

  return {
    loading,
    createPendingRequest,
    markRequestPaid,
    cancelPendingRequest
  };
};
