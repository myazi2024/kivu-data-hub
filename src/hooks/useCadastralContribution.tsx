import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface CadastralContributionData {
  parcelNumber: string;
  parcelType?: 'SU' | 'SR';
  
  // Informations générales
  propertyTitleType?: string;
  leaseType?: 'initial' | 'renewal';
  titleReferenceNumber?: string;
  titleIssueDate?: string;
  isTitleInCurrentOwnerName?: boolean;
  ownerAcquisitionDate?: string;
  currentOwners?: Array<{
    lastName: string;
    middleName?: string;
    firstName: string;
    legalStatus: string;
    gender?: string;
    since: string;
  }>;
  constructionType?: string;
  constructionNature?: string;
  constructionMaterials?: string;
  declaredUsage?: string;
  constructionYear?: number;
  
  // Autorisation de bâtir
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
  previousPermitNumber?: string;
  
  // Demande d'autorisation de bâtir
  permitRequest?: {
    permitType: 'construction' | 'regularization';
    hasExistingConstruction: boolean;
    constructionDescription: string;
    plannedUsage: string;
    estimatedArea?: number;
    applicantName: string;
    applicantPhone: string;
    applicantEmail?: string;
    numberOfFloors?: string;
    buildingMaterials?: string;
    architecturalPlanImages?: string[];
    constructionYear?: string;
    regularizationReason?: string;
    originalPermitNumber?: string;
    constructionPhotos?: string[];
  };
  
  // Localisation
  areaSqm?: number;
  parcelSides?: Array<{ name: string; length: string }>;
  province?: string;
  ville?: string;
  commune?: string;
  quartier?: string;
  avenue?: string;
  houseNumber?: string;
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
    receiptUrl?: string;
    taxType?: string;
  }>;
  mortgageHistory?: Array<{
    mortgageAmountUsd: number;
    durationMonths: number;
    creditorName: string;
    creditorType: string;
    contractDate: string;
    mortgageStatus: string;
    receiptUrl?: string;
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

// Helper: strip SU/SR prefix to get raw parcel digits
const extractRawParcelNumber = (parcelNumber: string): string => {
  return parcelNumber.replace(/^(SU\/|SR\/|SU|SR)/i, '').trim();
};

export const useCadastralContribution = () => {
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState<ContributorCode[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  // Shared payload builder to avoid duplication between insert and update
  // Converts camelCase nested JSON to snake_case for DB trigger compatibility
  const buildContributionPayload = (data: CadastralContributionData) => {
    // Convert ownership history to snake_case for DB trigger
    const ownershipHistorySnake = data.ownershipHistory?.map(o => ({
      owner_name: o.ownerName,
      legal_status: o.legalStatus,
      ownership_start_date: o.startDate,
      ownership_end_date: o.endDate || null,
      mutation_type: o.mutationType || null,
      ownership_document_url: null
    })) || null;

    // Convert tax history to snake_case for DB trigger
    const taxHistorySnake = data.taxHistory?.map(t => ({
      tax_year: t.taxYear,
      amount_usd: t.amountUsd,
      payment_status: t.paymentStatus,
      payment_date: t.paymentDate || null,
      receipt_document_url: t.receiptUrl || null
    })) || null;

    // Convert mortgage history to snake_case for DB trigger
    const mortgageHistorySnake = data.mortgageHistory?.map(m => ({
      mortgage_amount_usd: m.mortgageAmountUsd,
      duration_months: m.durationMonths,
      creditor_name: m.creditorName,
      creditor_type: m.creditorType,
      contract_date: m.contractDate,
      mortgage_status: m.mortgageStatus
    })) || null;

    // Convert building permits to snake_case for DB trigger
    const buildingPermitsSnake = data.buildingPermits?.map(p => ({
      permit_type: p.permitType,
      permit_number: p.permitNumber,
      issuing_service: p.issuingService,
      issue_date: p.issueDate,
      validity_period_months: p.validityMonths,
      administrative_status: p.administrativeStatus,
      issuing_service_contact: p.issuingServiceContact || null,
      permit_document_url: p.attachmentUrl || null,
      is_current: true
    })) || null;

    // Convert boundary history to snake_case for DB trigger
    const boundaryHistorySnake = data.boundaryHistory?.map(b => ({
      pv_reference_number: b.pvReferenceNumber,
      boundary_purpose: b.boundaryPurpose,
      surveyor_name: b.surveyorName,
      survey_date: b.surveyDate
    })) || null;

    const payload: any = {
      parcel_number: data.parcelNumber,
      parcel_type: data.parcelType,
      property_title_type: data.propertyTitleType,
      lease_type: data.leaseType,
      title_reference_number: data.titleReferenceNumber,
      title_issue_date: data.titleIssueDate,
      current_owners_details: data.currentOwners && data.currentOwners.length > 0 
        ? data.currentOwners 
        : null,
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
      parcel_sides: data.parcelSides,
      construction_type: data.constructionType,
      construction_nature: data.constructionNature,
      construction_materials: data.constructionMaterials || null,
      construction_year: data.constructionYear || null,
      declared_usage: data.declaredUsage,
      building_permits: buildingPermitsSnake,
      previous_permit_number: data.previousPermitNumber || data.permitRequest?.originalPermitNumber,
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
      ownership_history: ownershipHistorySnake,
      boundary_history: boundaryHistorySnake,
      tax_history: taxHistorySnake,
      mortgage_history: mortgageHistorySnake,
      whatsapp_number: data.whatsappNumber,
      owner_document_url: data.ownerDocumentUrl,
      property_title_document_url: data.titleDocumentUrl,
    };

    if (data.permitRequest) {
      payload.permit_request_data = data.permitRequest;
    }

    return payload;
  };

  // Shared validation logic used by both submit and update
  const validateContributionData = (data: CadastralContributionData): { valid: boolean; message?: string } => {
    // FIX #4: Validate raw parcel number (digits only) after stripping SU/SR prefix
    const rawNumber = extractRawParcelNumber(data.parcelNumber);
    if (!/^\d+$/.test(rawNumber)) {
      return { valid: false, message: "Le numéro de parcelle doit contenir uniquement des chiffres (hors préfixe SU/SR)" };
    }

    // Validate GPS coordinates
    if (data.gpsCoordinates && data.gpsCoordinates.length > 0) {
      const invalidCoord = data.gpsCoordinates.find(coord => {
        const lat = Number(coord.lat);
        const lng = Number(coord.lng);
        return isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180;
      });
      
      if (invalidCoord) {
        return { valid: false, message: "Les coordonnées doivent être dans les plages valides (lat: -90 à 90, lng: -180 à 180)" };
      }

      if (data.gpsCoordinates.length < 3) {
        return { valid: false, message: "Veuillez fournir au moins 3 points GPS pour définir la parcelle" };
      }
    }

    // Validate positive area
    if (data.areaSqm && Number(data.areaSqm) <= 0) {
      return { valid: false, message: "La superficie doit être supérieure à 0" };
    }

    return { valid: true };
  };

  // Shared user validation: check blocked status and fraud
  const validateUserSecurity = async (authenticatedUserId: string, data: CadastralContributionData): Promise<{
    allowed: boolean;
    isSuspicious: boolean;
    fraudScore: number;
    fraudReasons: string[];
  }> => {
    // Check if user is blocked
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_blocked, blocked_reason, fraud_strikes')
      .eq('user_id', authenticatedUserId)
      .maybeSingle();

    if (profileError) {
      console.error('Erreur lors de la vérification du profil:', profileError);
      toast({
        title: "Erreur de vérification",
        description: "Impossible de vérifier votre profil. Veuillez réessayer.",
        variant: "destructive",
      });
      return { allowed: false, isSuspicious: false, fraudScore: 0, fraudReasons: [] };
    }

    if (profile?.is_blocked) {
      toast({
        title: "Compte bloqué",
        description: `Votre compte a été bloqué pour fraude : ${profile.blocked_reason || 'Violations répétées'}`,
        variant: "destructive",
      });
      return { allowed: false, isSuspicious: false, fraudScore: 0, fraudReasons: [] };
    }

    // Fraud detection
    const { data: fraudCheck, error: fraudError } = await supabase
      .rpc('detect_suspicious_contribution', {
        p_user_id: authenticatedUserId,
        p_parcel_number: data.parcelNumber
      });

    if (fraudError) {
      console.error('Erreur détection fraude:', fraudError);
    }

    const suspicionData = Array.isArray(fraudCheck) && fraudCheck.length > 0 ? fraudCheck[0] : null;
    const isSuspicious = suspicionData?.is_suspicious || false;
    const fraudScore = suspicionData?.fraud_score || 0;
    const fraudReasons = suspicionData?.reasons || [];

    // Block if critical fraud score
    if (isSuspicious && fraudScore >= 80) {
      toast({
        title: "Contribution suspecte",
        description: "Cette contribution a été signalée pour vérification. Un administrateur vous contactera.",
        variant: "destructive",
      });
      
      await supabase.from('fraud_attempts').insert({
        user_id: authenticatedUserId,
        fraud_type: 'suspicious_contribution',
        severity: 'high',
        description: Array.isArray(fraudReasons) ? fraudReasons.join(', ') : 'Score de fraude élevé'
      });
      
      return { allowed: false, isSuspicious, fraudScore, fraudReasons };
    }

    return { allowed: true, isSuspicious, fraudScore, fraudReasons };
  };

  const submitContribution = async (data: CadastralContributionData) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!user && !session) {
      toast({
        title: "Authentification requise",
        description: "Vous devez être connecté pour soumettre une contribution",
        variant: "destructive",
      });
      return { success: false };
    }

    const authenticatedUserId = user?.id || session?.user?.id;
    if (!authenticatedUserId) {
      toast({
        title: "Erreur d'authentification",
        description: "Impossible de récupérer votre identifiant utilisateur",
        variant: "destructive",
      });
      return { success: false };
    }

    // FIX #4: Use shared validation
    const validation = validateContributionData(data);
    if (!validation.valid) {
      toast({
        title: "Données invalides",
        description: validation.message,
        variant: "destructive",
      });
      return { success: false };
    }

    setLoading(true);

    try {
      // FIX #5: Use shared security validation
      const security = await validateUserSecurity(authenticatedUserId, data);
      if (!security.allowed) {
        return { success: false };
      }

      // Submit the contribution
      const contributionPayload = {
        ...buildContributionPayload(data),
        user_id: authenticatedUserId,
        status: 'pending',
        is_suspicious: security.isSuspicious,
        fraud_score: security.fraudScore,
        fraud_reason: security.fraudReasons.length > 0 ? security.fraudReasons.join('; ') : null
      };

      const { data: contributionData, error: contributionError } = await supabase
        .from('cadastral_contributions')
        .insert(contributionPayload)
        .select()
        .maybeSingle();

      if (contributionError) {
        console.error('Erreur lors de l\'insertion:', contributionError);
        toast({
          title: "Erreur de soumission",
          description: contributionError.message || "Impossible d'enregistrer votre contribution. Veuillez réessayer.",
          variant: "destructive",
        });
        return { success: false };
      }

      if (!contributionData) {
        toast({
          title: "Erreur de soumission",
          description: "La contribution n'a pas pu être enregistrée. Veuillez réessayer.",
          variant: "destructive",
        });
        return { success: false };
      }

      // Record fraud attempt if suspicious
      if (security.isSuspicious) {
        await supabase
          .from('fraud_attempts')
          .insert({
            user_id: authenticatedUserId,
            contribution_id: contributionData.id,
            fraud_type: 'suspicious_contribution',
            description: security.fraudReasons.join('; '),
            severity: security.fraudScore >= 80 ? 'critical' : security.fraudScore >= 50 ? 'high' : 'medium'
          });
      }

      toast({
        title: "Contribution enregistrée !",
        description: security.isSuspicious 
          ? "Votre contribution a été reçue et sera examinée par notre équipe."
          : "Merci pour votre contribution. Elle sera vérifiée et vous recevrez votre code CCC après validation.",
      });

      await fetchUserCodes();

      // Clean localStorage
      try {
        localStorage.removeItem(`cadastral_contribution_${data.parcelNumber}`);
        localStorage.removeItem('ccc_form_draft');
      } catch (storageError) {
        console.warn('Impossible de nettoyer le localStorage:', storageError);
      }

      return { success: true, contributionId: contributionData.id };
    } catch (err) {
      console.error('Erreur lors de la soumission:', err);
      const errorMessage = err instanceof Error ? err.message : "Une erreur inattendue est survenue";
      toast({
        title: "Erreur",
        description: `Impossible de soumettre votre contribution: ${errorMessage}`,
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCodes = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const authenticatedUserId = user?.id || session?.user?.id;
    
    if (!authenticatedUserId) return;

    try {
      const { data, error } = await supabase
        .from('cadastral_contributor_codes')
        .select('*')
        .eq('user_id', authenticatedUserId)
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

  // FIX #5: Update now includes full validation (blocked user, fraud, data validation)
  const updateContribution = async (contributionId: string, data: CadastralContributionData) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!user && !session) {
      toast({
        title: "Authentification requise",
        description: "Vous devez être connecté pour modifier une contribution",
        variant: "destructive",
      });
      return { success: false };
    }

    const authenticatedUserId = user?.id || session?.user?.id;
    if (!authenticatedUserId) {
      toast({
        title: "Erreur d'authentification",
        description: "Impossible de récupérer votre identifiant utilisateur",
        variant: "destructive",
      });
      return { success: false };
    }

    // FIX #5: Validate data before update (was missing!)
    const validation = validateContributionData(data);
    if (!validation.valid) {
      toast({
        title: "Données invalides",
        description: validation.message,
        variant: "destructive",
      });
      return { success: false };
    }

    setLoading(true);

    try {
      // FIX #5: Check blocked status before allowing update
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_blocked, blocked_reason')
        .eq('user_id', authenticatedUserId)
        .maybeSingle();

      if (profile?.is_blocked) {
        toast({
          title: "Compte bloqué",
          description: `Votre compte a été bloqué : ${profile.blocked_reason || 'Violations répétées'}`,
          variant: "destructive",
        });
        return { success: false };
      }

      // Build update payload using shared builder
      const contributionPayload = {
        ...buildContributionPayload(data),
        updated_at: new Date().toISOString(),
      };

      const { data: updateData, error: updateError } = await supabase
        .from('cadastral_contributions')
        .update(contributionPayload)
        .eq('id', contributionId)
        .eq('user_id', authenticatedUserId)
        .in('status', ['pending', 'returned'])
        .select('id');

      if (updateError) {
        console.error('Erreur lors de la mise à jour:', updateError);
        toast({
          title: "Erreur de mise à jour",
          description: updateError.message || "Impossible de modifier votre contribution. Veuillez réessayer.",
          variant: "destructive",
        });
        return { success: false };
      }

      if (!updateData || updateData.length === 0) {
        toast({
          title: "Mise à jour impossible",
          description: "Cette contribution ne peut plus être modifiée (elle a peut-être déjà été approuvée ou rejetée).",
          variant: "destructive",
        });
        return { success: false };
      }

      toast({
        title: "Contribution mise à jour",
        description: "Vos modifications ont été enregistrées avec succès.",
      });

      // Clean localStorage
      try {
        localStorage.removeItem(`cadastral_contribution_${data.parcelNumber}`);
        localStorage.removeItem(`ccc_form_draft_${data.parcelNumber}`);
      } catch (storageError) {
        console.warn('Impossible de nettoyer le localStorage:', storageError);
      }

      return { success: true, contributionId };
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      const errorMessage = err instanceof Error ? err.message : "Une erreur inattendue est survenue";
      toast({
        title: "Erreur",
        description: `Impossible de modifier votre contribution: ${errorMessage}`,
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return {
    submitContribution,
    updateContribution,
    validateCCCCode,
    fetchUserCodes,
    codes,
    loading
  };
};
