import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface CadastralContributionData {
  parcelNumber: string;
  sectionType?: 'urbaine' | 'rurale'; // Type de section cadastrale
  
  // Informations générales
  propertyTitleType?: string;
  leaseType?: 'initial' | 'renewal';
  titleReferenceNumber?: string;
  currentOwners?: Array<{
    lastName: string;  // Nom
    middleName?: string;  // Post-nom
    firstName: string;  // Prénom
    legalStatus: string;
    since: string;
  }>;
  constructionType?: string;
  constructionNature?: string;
  declaredUsage?: string;
  
  // Permis de construire
  buildingPermits?: Array<{
    permitType: 'construction' | 'regularization';
    permitNumber: string;
    issuingService: string;
    issueDate: string;
    validityMonths: number;
    administrativeStatus: string;
    issuingServiceContact?: string;
    attachmentUrl?: string;
  }>;
  previousPermitNumber?: string; // ✅ NOUVEAU: pour régularisation
  
  // Demande de permis de construire (nouveau)
  permitRequest?: {
    permitType: 'construction' | 'regularization';
    hasExistingConstruction: boolean;
    constructionDescription: string;
    plannedUsage: string;
    estimatedArea?: number;
    applicantName: string;
    applicantPhone: string;
    applicantEmail?: string;
    // Champs spécifiques permis de construire
    numberOfFloors?: string;
    buildingMaterials?: string;
    architecturalPlanImages?: string[]; // URLs après upload
    // Champs spécifiques permis de régularisation
    constructionYear?: string;
    regularizationReason?: string; // ✅ Correction orthographe pour matcher le Dialog
    originalPermitNumber?: string;
    constructionPhotos?: string[]; // URLs après upload
  };
  
  // Localisation
  areaSqm?: number;  // Déplacé ici depuis informations générales
  parcelSides?: Array<{ name: string; length: string }>; // Dimensions exactes des côtés
  province?: string;
  ville?: string;
  commune?: string;
  quartier?: string;
  avenue?: string;
  territoire?: string;
  collectivite?: string;
  groupement?: string;
  village?: string;
  circonscriptionFonciere?: string;
  gpsCoordinates?: Array<{ lat: number; lng: number; borne: string }>;
  
  // Historiques
  ownershipHistory?: Array<{
    ownerName: string;
    legalStatus: string;
    startDate: string;
    endDate?: string;
    mutationType?: string;
  }>;
  boundaryHistory?: Array<{
    pvReferenceNumber: string;
    boundaryPurpose: string;
    surveyorName: string;
    surveyDate: string;
  }>;
  
  // Obligations
  taxHistory?: Array<{
    taxYear: number;
    amountUsd: number;
    paymentStatus: string;
    paymentDate?: string;
    receiptUrl?: string; // ✅ Ajouté
    taxType?: string; // ✅ Ajouté
  }>;
  mortgageHistory?: Array<{
    mortgageAmountUsd: number;
    durationMonths: number;
    creditorName: string;
    creditorType: string;
    contractDate: string;
    mortgageStatus: string;
    receiptUrl?: string; // ✅ Ajouté
  }>;
  
  // Pièces jointes
  ownerDocumentUrl?: string;
  titleDocumentUrl?: string;
  
  // Métadonnées
  whatsappNumber?: string;
}

export interface ContributorCode {
  id: string;
  code: string;
  parcel_number: string;
  value_usd: number;
  is_used: boolean;
  used_at: string | null;
  expires_at: string;
  created_at: string;
}

export const useCadastralContribution = () => {
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState<ContributorCode[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const submitContribution = async (data: CadastralContributionData) => {
    if (!user) {
      toast({
        title: "Authentification requise",
        description: "Vous devez être connecté pour soumettre une contribution",
        variant: "destructive",
      });
      return { success: false };
    }

    // 🔒 VALIDATION: Format numéro parcelle (chiffres uniquement)
    if (!/^\d+$/.test(data.parcelNumber)) {
      toast({
        title: "Format invalide",
        description: "Le numéro de parcelle doit contenir uniquement des chiffres",
        variant: "destructive",
      });
      return { success: false };
    }

    // 🔒 VALIDATION: Coordonnées GPS valides
    if (data.gpsCoordinates && data.gpsCoordinates.length > 0) {
      const invalidCoord = data.gpsCoordinates.find(coord => {
        const lat = Number(coord.lat); // Utiliser 'lat' au lieu de 'latitude'
        const lng = Number(coord.lng); // Utiliser 'lng' au lieu de 'longitude'
        return isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180;
      });
      
      if (invalidCoord) {
        toast({
          title: "Coordonnées GPS invalides",
          description: "Les coordonnées doivent être dans les plages valides (lat: -90 à 90, lng: -180 à 180)",
          variant: "destructive",
        });
        return { success: false };
      }

      if (data.gpsCoordinates.length < 3) {
        toast({
          title: "Coordonnées insuffisantes",
          description: "Veuillez fournir au moins 3 points GPS pour définir la parcelle",
          variant: "destructive",
        });
        return { success: false };
      }
    }

    // 🔒 VALIDATION: Superficie positive
    if (data.areaSqm && Number(data.areaSqm) <= 0) {
      toast({
        title: "Superficie invalide",
        description: "La superficie doit être supérieure à 0",
        variant: "destructive",
      });
      return { success: false };
    }

    setLoading(true);

    try {
      // 🔒 Vérifier si l'utilisateur est bloqué AVANT détection fraude
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_blocked, blocked_reason, fraud_strikes')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile?.is_blocked) {
        toast({
          title: "Compte bloqué",
          description: `Votre compte a été bloqué pour fraude : ${profile.blocked_reason || 'Violations répétées'}`,
          variant: "destructive",
        });
        return { success: false };
      }

      // 🔒 Détection de fraude - Utiliser l'ancienne fonction en attendant migration types
      const { data: fraudCheck, error: fraudError } = await supabase
        .rpc('detect_suspicious_contribution', {
          p_user_id: user.id,
          p_parcel_number: data.parcelNumber
        });

      if (fraudError) {
        console.error('Erreur détection fraude:', fraudError);
      }

      const suspicionData = Array.isArray(fraudCheck) && fraudCheck.length > 0 ? fraudCheck[0] : null;
      const isSuspicious = suspicionData?.is_suspicious || false;
      const fraudScore = suspicionData?.fraud_score || 0;
      const fraudReasons = suspicionData?.reasons || [];

      // Si détection fraude positive critique, bloquer immédiatement
      if (isSuspicious && fraudScore >= 80) {
        toast({
          title: "Contribution suspecte",
          description: "Cette contribution a été signalée pour vérification. Un administrateur vous contactera.",
          variant: "destructive",
        });
        
        // Enregistrer la tentative de fraude
        await supabase.from('fraud_attempts').insert({
          user_id: user.id,
          fraud_type: 'suspicious_contribution',
          severity: 'high',
          description: Array.isArray(fraudReasons) ? fraudReasons.join(', ') : 'Score de fraude élevé'
        });
        
        return { success: false };
      }

      // Soumettre la contribution
      const contributionPayload: any = {
        user_id: user.id,
        parcel_number: data.parcelNumber,
        parcel_type: data.sectionType === 'urbaine' ? 'SU' : data.sectionType === 'rurale' ? 'SR' : 'SU', // Convertir en SU/SR
        property_title_type: data.propertyTitleType,
        lease_type: data.leaseType,
        title_reference_number: data.titleReferenceNumber,
        
        // ✅ NOUVEAU: Stocker les détails complets des propriétaires
        current_owners_details: data.currentOwners && data.currentOwners.length > 0 
          ? data.currentOwners 
          : null,
        
        // Conserver les anciens champs pour rétrocompatibilité (trigger les synchronisera automatiquement)
        current_owner_name: data.currentOwners && data.currentOwners.length > 0 
          ? data.currentOwners.map(o => `${o.lastName}${o.middleName ? ' ' + o.middleName : ''} ${o.firstName}`).join('; ')
          : undefined,
        current_owner_legal_status: data.currentOwners && data.currentOwners.length > 0 
          ? data.currentOwners[0].legalStatus 
          : undefined,
        current_owner_since: data.currentOwners && data.currentOwners.length > 0 
          ? data.currentOwners[0].since 
          : undefined,
        
        area_sqm: data.areaSqm,
        parcel_sides: data.parcelSides, // Dimensions exactes des côtés
        construction_type: data.constructionType,
        construction_nature: data.constructionNature,
        declared_usage: data.declaredUsage,
        building_permits: data.buildingPermits,
        previous_permit_number: data.previousPermitNumber || data.permitRequest?.originalPermitNumber, // ✅ Extraction depuis permitRequest si présent
        province: data.province,
        ville: data.ville,
        commune: data.commune,
        quartier: data.quartier,
        avenue: data.avenue,
        territoire: data.territoire,
        collectivite: data.collectivite,
        groupement: data.groupement,
        village: data.village,
        circonscription_fonciere: data.circonscriptionFonciere,
        gps_coordinates: data.gpsCoordinates,
        ownership_history: data.ownershipHistory,
        boundary_history: data.boundaryHistory,
        tax_history: data.taxHistory,
        mortgage_history: data.mortgageHistory,
        whatsapp_number: data.whatsappNumber,
        owner_document_url: data.ownerDocumentUrl,
        property_title_document_url: data.titleDocumentUrl,
        status: 'pending',
        is_suspicious: isSuspicious,
        fraud_score: fraudScore,
        fraud_reason: fraudReasons.length > 0 ? fraudReasons.join('; ') : null
      };

      // Ajouter les données de demande de permis si présentes (stockées en JSONB)
      if (data.permitRequest) {
        contributionPayload.permit_request_data = data.permitRequest;
      }

      const { data: contributionData, error: contributionError } = await supabase
        .from('cadastral_contributions')
        .insert(contributionPayload)
        .select()
        .maybeSingle();

      if (contributionError) throw contributionError;

      // Enregistrer une tentative de fraude si détectée
      if (isSuspicious) {
        await supabase
          .from('fraud_attempts')
          .insert({
            user_id: user.id,
            contribution_id: contributionData.id,
            fraud_type: 'suspicious_contribution',
            description: fraudReasons.join('; '),
            severity: fraudScore >= 80 ? 'critical' : fraudScore >= 50 ? 'high' : 'medium'
          });
      }

      // Message différent selon si la contribution est suspecte ou non
      if (isSuspicious) {
        toast({
          title: "Contribution enregistrée",
          description: "Votre contribution a été reçue et sera examinée par notre équipe. Vous recevrez votre code CCC après validation.",
        });
      } else {
        toast({
          title: "Contribution enregistrée !",
          description: "Merci pour votre contribution. Elle sera vérifiée et vous recevrez votre code CCC après validation par notre équipe.",
        });
      }

      toast({
        title: "Contribution soumise",
        description: "Votre contribution a été soumise avec succès et sera examinée par nos équipes.",
      });

      // Recharger les codes CCC
      await fetchUserCodes();

      // ✅ Nettoyer le localStorage SEULEMENT après confirmation complète
      try {
        localStorage.removeItem('ccc_form_draft');
      } catch (storageError) {
        console.warn('Impossible de nettoyer le localStorage:', storageError);
      }

      return { success: true };
    } catch (err) {
      console.error('Erreur lors de la soumission:', err);
      toast({
        title: "Erreur",
        description: "Impossible de soumettre votre contribution",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCodes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('cadastral_contributor_codes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCodes(data || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des codes:', err);
    }
  };

  const validateCCCCode = async (code: string, invoiceAmount: number) => {
    try {
      const { data, error } = await supabase.rpc('validate_and_apply_ccc', {
        code_input: code,
        invoice_amount: invoiceAmount
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        if (!result.is_valid) {
          toast({
            title: "Code invalide",
            description: result.message || "Ce code n'est plus valide",
            variant: "destructive",
          });
        }
        return result;
      }

      return null;
    } catch (err) {
      console.error('Erreur lors de la validation du code:', err);
      return null;
    }
  };

  return {
    submitContribution,
    validateCCCCode,
    fetchUserCodes,
    codes,
    loading
  };
};
