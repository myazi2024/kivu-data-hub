import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LandTitleRequestData {
  // Type de demande
  requestType?: 'initial' | 'renouvellement' | 'conversion' | '';
  selectedParcelNumber?: string;
  
  // Demandeur
  requesterType: 'owner' | 'beneficiary' | 'representative';
  requesterLastName: string;
  requesterFirstName: string;
  requesterMiddleName?: string;
  requesterPhone: string;
  requesterEmail?: string;
  requesterLegalStatus?: string;
  requesterGender?: string;
  requesterIdDocumentFile?: File | null;
  // Champs conditionnels demandeur (Personne morale / État)
  requesterEntityType?: string;
  requesterEntitySubType?: string;
  requesterEntitySubTypeOther?: string;
  requesterRightType?: string;
  
  // Propriétaire
  isOwnerSameAsRequester: boolean;
  ownerLastName?: string;
  ownerFirstName?: string;
  ownerMiddleName?: string;
  ownerLegalStatus?: string;
  ownerGender?: string;
  ownerPhone?: string;
  ownerIdDocumentFile?: File | null;
  // Champs conditionnels propriétaire (Personne morale / État)
  ownerEntityType?: string;
  ownerEntitySubType?: string;
  ownerEntitySubTypeOther?: string;
  ownerRightType?: string;
  
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
  standing?: string;
  constructionYear?: number;
  floorNumber?: string;
  
  // Proposed building permit update
  proposedPermitType?: string;
  proposedPermitNumber?: string;
  proposedPermitDate?: string;
  proposedPermitService?: string;
  proposedPermitDocumentFile?: File | null;
  
  // Documents
  proofOfOwnershipFile?: File | null;
  procurationDocumentFile?: File | null;
  additionalDocuments?: File[];
}

// Phone number validation for DRC numbers
const PHONE_REGEX = /^\+?243\s?\d{9}$/;

export const validatePhone = (phone: string): boolean => {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return PHONE_REGEX.test(cleaned);
};

/**
 * Upload d'un document dans le bucket privé `land-title-documents`.
 * Le chemin est préfixé par l'identifiant du propriétaire (exigé par les règles d'accès).
 * On stocke le chemin (et non une URL publique) : la lecture se fait via une URL signée.
 */
const uploadDocument = async (file: File, folder: string, userId: string): Promise<string | null> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${folder}/${Date.now()}_${crypto.randomUUID()}.${fileExt}`;
  const { error } = await supabase.storage.from('land-title-documents').upload(fileName, file);
  if (error) {
    console.error('Error uploading document:', error);
    return null;
  }
  return fileName;
};

/** Supprime les fichiers déjà envoyés quand la demande ne peut pas être créée. */
const removeUploaded = async (paths: string[]) => {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from('land-title-documents').remove(paths);
  if (error) console.error('Cleanup of uploaded documents failed:', error);
};

/** URL signée (1h) pour consulter un document de demande de titre foncier. */
export const getLandTitleDocumentUrl = async (pathOrUrl: string | null): Promise<string | null> => {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith('http')) return pathOrUrl; // anciens enregistrements
  const { data, error } = await supabase.storage
    .from('land-title-documents')
    .createSignedUrl(pathOrUrl, 3600);
  if (error) {
    console.error('Signed URL error:', error);
    return null;
  }
  return data?.signedUrl ?? null;
};

export const useLandTitleRequest = () => {
  const [loading, setLoading] = useState(false);

  /**
   * Crée la demande (avant paiement). Le serveur recalcule frais et montant et
   * renvoie le montant dû, utilisé tel quel pour le paiement.
   */
  const createPendingRequest = useCallback(async (
    data: LandTitleRequestData,
  ): Promise<{ success: boolean; requestId?: string; referenceNumber?: string; totalAmountUsd?: number }> => {
    setLoading(true);
    let uploaded: string[] = [];
    try {
      // 1. Utilisateur courant (obligatoire : le chemin de stockage lui est rattaché)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté pour soumettre une demande');
        return { success: false };
      }

      // 2. Upload des documents (en cas d'échec, les fichiers déjà envoyés sont supprimés)
      const uploads: Array<{ key: string; file: File | null | undefined; folder: string; label: string }> = [
        { key: 'requester', file: data.requesterIdDocumentFile, folder: 'requester-id', label: "la pièce d'identité du demandeur" },
        { key: 'owner', file: data.isOwnerSameAsRequester ? null : data.ownerIdDocumentFile, folder: 'owner-id', label: "la pièce d'identité du propriétaire" },
        { key: 'proof', file: data.proofOfOwnershipFile, folder: 'proof-of-ownership', label: 'la preuve de propriété' },
        { key: 'procuration', file: data.requesterType === 'representative' ? data.procurationDocumentFile : null, folder: 'procuration', label: 'la procuration' },
        { key: 'permit', file: data.proposedPermitDocumentFile, folder: 'proposed-permit', label: "le document d'autorisation" },
      ];
      const paths: Record<string, string | null> = {};
      uploaded = [];
      for (const u of uploads) {
        paths[u.key] = null;
        if (!u.file) continue;
        const path = await uploadDocument(u.file, u.folder, user.id);
        if (!path) {
          await removeUploaded(uploaded);
          uploaded = [];
          toast.error(`Échec de l'envoi de ${u.label}. Aucune demande n'a été créée.`);
          return { success: false };
        }
        paths[u.key] = path;
        uploaded.push(path);
      }
      const requesterIdDocUrl = paths.requester;
      const ownerIdDocUrl = paths.owner;
      const proofOfOwnershipUrl = paths.proof;
      const procurationDocUrl = paths.procuration;
      const proposedPermitDocUrl = paths.permit;

      // 3. Insertion : les frais, le montant et les statuts sont recalculés/forcés côté serveur.
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
          standing: data.standing || null,
          construction_year: data.constructionYear || null,
          floor_number: data.floorNumber || null,
           proof_of_ownership_url: proofOfOwnershipUrl,
           procuration_document_url: procurationDocUrl,
           proposed_permit_type: data.proposedPermitType || null,
           proposed_permit_number: data.proposedPermitNumber || null,
           proposed_permit_date: data.proposedPermitDate || null,
           proposed_permit_service: data.proposedPermitService || null,
           proposed_permit_document_url: proposedPermitDocUrl,
          additional_documents: {
            requester_entity_type: data.requesterEntityType || null,
            requester_entity_sub_type: data.requesterEntitySubType || null,
            requester_entity_sub_type_other: data.requesterEntitySubTypeOther || null,
            requester_right_type: data.requesterRightType || null,
            owner_entity_type: data.ownerEntityType || null,
            owner_entity_sub_type: data.ownerEntitySubType || null,
            owner_entity_sub_type_other: data.ownerEntitySubTypeOther || null,
            owner_right_type: data.ownerRightType || null,
          },
        } as any])
        .select('id, reference_number, total_amount_usd')
        .single();

      if (error) throw error;

      return { 
        success: true, 
        requestId: insertedData.id, 
        referenceNumber: insertedData.reference_number,
        totalAmountUsd: Number((insertedData as any).total_amount_usd ?? 0),
      };
    } catch (error: any) {
      console.error('Error creating land title request:', error);
      await removeUploaded(uploaded);
      toast.error(error.message || 'Erreur lors de la création de la demande');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cancel orphaned pending request (e.g. user cancelled payment).
   */
  const cancelPendingRequest = useCallback(async (requestId: string): Promise<void> => {
    try {
      const { error } = await supabase.rpc('cancel_land_title_request' as any, { p_request_id: requestId });
      if (error) throw error;
    } catch (error) {
      console.error('Error cancelling pending request:', error);
    }
  }, []);

  return {
    loading,
    createPendingRequest,
    cancelPendingRequest
  };
};
