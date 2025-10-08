import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface CadastralContributionData {
  parcelNumber: string;
  
  // Informations générales
  propertyTitleType?: string;
  titleReferenceNumber?: string;
  currentOwnerName?: string;
  currentOwnerLegalStatus?: string;
  currentOwnerSince?: string;
  areaSqm?: number;
  constructionType?: string;
  constructionNature?: string;
  declaredUsage?: string;
  
  // Permis de construire
  buildingPermits?: Array<{
    permitNumber: string;
    issuingService: string;
    issueDate: string;
    validityMonths: number;
    administrativeStatus: string;
    issuingServiceContact?: string;
  }>;
  
  // Localisation
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
  }>;
  mortgageHistory?: Array<{
    mortgageAmountUsd: number;
    durationMonths: number;
    creditorName: string;
    creditorType: string;
    contractDate: string;
    mortgageStatus: string;
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
      // Soumettre la contribution
      const { data: contributionData, error: contributionError } = await supabase
        .from('cadastral_contributions')
        .insert({
          user_id: user.id,
          parcel_number: data.parcelNumber,
          property_title_type: data.propertyTitleType,
          title_reference_number: data.titleReferenceNumber,
          current_owner_name: data.currentOwnerName,
          current_owner_legal_status: data.currentOwnerLegalStatus,
          current_owner_since: data.currentOwnerSince,
          area_sqm: data.areaSqm,
          construction_type: data.constructionType,
          construction_nature: data.constructionNature,
          declared_usage: data.declaredUsage,
          province: data.province,
          ville: data.ville,
          commune: data.commune,
          quartier: data.quartier,
          avenue: data.avenue,
          territoire: data.territoire,
          collectivite: data.collectivite,
          groupement: data.groupement,
          village: data.village,
          gps_coordinates: data.gpsCoordinates,
          ownership_history: data.ownershipHistory,
          boundary_history: data.boundaryHistory,
          tax_history: data.taxHistory,
          mortgage_history: data.mortgageHistory,
          whatsapp_number: data.whatsappNumber,
          owner_document_url: data.ownerDocumentUrl,
          property_title_document_url: data.titleDocumentUrl,
          status: 'pending'
        })
        .select()
        .single();

      if (contributionError) throw contributionError;

      // Générer un code CCC
      const { data: cccCode, error: codeError } = await supabase.rpc('generate_ccc_code');
      
      if (codeError) throw codeError;

      // Créer le code contributeur
      const { error: insertCodeError } = await supabase
        .from('cadastral_contributor_codes')
        .insert({
          code: cccCode,
          user_id: user.id,
          contribution_id: contributionData.id,
          parcel_number: data.parcelNumber,
          value_usd: 5.00
        });

      if (insertCodeError) throw insertCodeError;

      toast({
        title: "Contribution enregistrée !",
        description: `Merci pour votre contribution. Votre code CCC : ${cccCode}`,
      });

      await fetchUserCodes();

      return { success: true, code: cccCode };
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
        return data[0];
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
