import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface CadastralContributionData {
  parcelNumber: string;
  
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

    setLoading(true);

    try {
      // Vérifier si l'utilisateur est bloqué
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_blocked, blocked_reason, fraud_strikes')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profile?.is_blocked) {
        toast({
          title: "Compte bloqué",
          description: `Votre compte a été bloqué pour fraude : ${profile.blocked_reason || 'Violations répétées'}`,
          variant: "destructive",
        });
        return { success: false };
      }

      // Détecter les contributions suspectes
      const { data: fraudCheck, error: fraudError } = await supabase
        .rpc('detect_suspicious_contribution', {
          p_user_id: user.id,
          p_parcel_number: data.parcelNumber
        });

      if (fraudError) {
        console.error('Erreur lors de la vérification anti-fraude:', fraudError);
      }

      const suspicionData = fraudCheck && fraudCheck.length > 0 ? fraudCheck[0] : null;
      const isSuspicious = suspicionData?.is_suspicious || false;
      const fraudScore = suspicionData?.fraud_score || 0;
      const fraudReasons = suspicionData?.reasons || [];

      // Soumettre la contribution
      const contributionPayload: any = {
        user_id: user.id,
        parcel_number: data.parcelNumber,
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
        status: 'approved', // Auto-validation pour les tests
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
        .single();

      if (contributionError) throw contributionError;

      // Créer automatiquement l'entrée dans cadastral_parcels pour les tests (contribution auto-approuvée)
      if (contributionData.status === 'approved') {
        const parcelPayload: any = {
          parcel_number: data.parcelNumber,
          parcel_type: data.parcelNumber?.startsWith('SU') ? 'SU' : 'SR',
          location: [data.ville, data.commune, data.quartier, data.avenue].filter(Boolean).join(', ') || 'Non spécifié',
          property_title_type: data.propertyTitleType || "Certificat d'enregistrement",
          title_reference_number: data.titleReferenceNumber,
          area_sqm: data.areaSqm || 0,
          area_hectares: data.areaSqm ? data.areaSqm / 10000 : null,
          gps_coordinates: data.gpsCoordinates,
          latitude: data.gpsCoordinates && data.gpsCoordinates.length > 0 ? data.gpsCoordinates[0].lat : null,
          longitude: data.gpsCoordinates && data.gpsCoordinates.length > 0 ? data.gpsCoordinates[0].lng : null,
          current_owner_name: data.currentOwners && data.currentOwners.length > 0 
            ? data.currentOwners.map(o => `${o.lastName}${o.middleName ? ' ' + o.middleName : ''} ${o.firstName}`).join('; ')
            : 'Non spécifié',
          current_owner_legal_status: data.currentOwners && data.currentOwners.length > 0 
            ? data.currentOwners[0].legalStatus 
            : 'Personne physique',
          current_owner_since: data.currentOwners && data.currentOwners.length > 0 
            ? data.currentOwners[0].since 
            : new Date().toISOString().split('T')[0],
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
          construction_type: data.constructionType,
          construction_nature: data.constructionNature,
          declared_usage: data.declaredUsage,
          lease_type: data.leaseType,
          whatsapp_number: data.whatsappNumber,
          owner_document_url: data.ownerDocumentUrl,
          property_title_document_url: data.titleDocumentUrl,
          nombre_bornes: data.gpsCoordinates?.length || 3,
          parcel_sides: data.parcelSides
        };

        const { data: parcelData, error: parcelError } = await supabase
          .from('cadastral_parcels')
          .insert(parcelPayload)
          .select('id')
          .single();

        if (parcelError) {
          console.error('Erreur lors de la création de la parcelle:', parcelError);
        } else if (parcelData) {
          // Créer les historiques associés si présents
          const parcelId = parcelData.id;
          
          // Historique de propriété
          if (data.ownershipHistory && data.ownershipHistory.length > 0) {
            const ownershipRecords = data.ownershipHistory.map(oh => ({
              parcel_id: parcelId,
              owner_name: oh.ownerName,
              legal_status: oh.legalStatus,
              ownership_start_date: oh.startDate,
              ownership_end_date: oh.endDate,
              mutation_type: oh.mutationType
            }));
            await supabase.from('cadastral_ownership_history').insert(ownershipRecords);
          }

          // Historique de taxes
          if (data.taxHistory && data.taxHistory.length > 0) {
            const taxRecords = data.taxHistory.map(th => ({
              parcel_id: parcelId,
              tax_year: th.taxYear,
              amount_usd: th.amountUsd,
              payment_status: th.paymentStatus,
              payment_date: th.paymentDate,
              receipt_document_url: th.receiptUrl
            }));
            await supabase.from('cadastral_tax_history').insert(taxRecords);
          }

          // Historique d'hypothèques
          if (data.mortgageHistory && data.mortgageHistory.length > 0) {
            const mortgageRecords = data.mortgageHistory.map(mh => ({
              parcel_id: parcelId,
              mortgage_amount_usd: mh.mortgageAmountUsd,
              duration_months: mh.durationMonths,
              creditor_name: mh.creditorName,
              creditor_type: mh.creditorType,
              contract_date: mh.contractDate,
              mortgage_status: mh.mortgageStatus
            }));
            await supabase.from('cadastral_mortgages').insert(mortgageRecords);
          }

          // Historique de bornage
          if (data.boundaryHistory && data.boundaryHistory.length > 0) {
            const boundaryRecords = data.boundaryHistory.map(bh => ({
              parcel_id: parcelId,
              pv_reference_number: bh.pvReferenceNumber,
              boundary_purpose: bh.boundaryPurpose,
              surveyor_name: bh.surveyorName,
              survey_date: bh.surveyDate
            }));
            await supabase.from('cadastral_boundary_history').insert(boundaryRecords);
          }

          // Permis de construire
          if (data.buildingPermits && data.buildingPermits.length > 0) {
            const permitRecords = data.buildingPermits.map(bp => ({
              parcel_id: parcelId,
              permit_number: bp.permitNumber,
              issue_date: bp.issueDate,
              validity_period_months: bp.validityMonths,
              issuing_service: bp.issuingService,
              administrative_status: bp.administrativeStatus,
              issuing_service_contact: bp.issuingServiceContact,
              permit_document_url: bp.attachmentUrl
            }));
            await supabase.from('cadastral_building_permits').insert(permitRecords);
          }
        }
      }

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

      await fetchUserCodes();

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
