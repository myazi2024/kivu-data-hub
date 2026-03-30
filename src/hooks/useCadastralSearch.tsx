import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCatalogConfig } from './useCatalogConfig';
import { useTestEnvironment } from '@/hooks/useTestEnvironment';
import { CadastralParcel } from '@/types/cadastral';

// Ré-exporter CadastralParcel pour rétrocompatibilité
export type { CadastralParcel };

export interface BuildingPermit {
  id: string;
  permit_number: string;
  issue_date: string;
  validity_period_months: number;
  issuing_service: string;
  administrative_status: 'Conforme' | 'En attente' | 'Non autorisé';
  issuing_service_contact: string | null;
  permit_document_url: string | null;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface OwnershipHistory {
  id: string;
  owner_name: string;
  legal_status: string;
  ownership_start_date: string;
  ownership_end_date: string | null;
  mutation_type: string | null;
  ownership_document_url: string | null;
}

export interface TaxHistory {
  id: string;
  tax_year: number;
  amount_usd: number;
  payment_status: 'pending' | 'paid' | 'overdue';
  payment_date: string | null;
  receipt_document_url: string | null;
}

export interface MortgagePayment {
  id: string;
  payment_amount_usd: number;
  payment_date: string;
  payment_type: 'partial' | 'total';
  payment_receipt_url: string | null;
}

export interface MortgageHistory {
  id: string;
  reference_number: string | null;
  mortgage_amount_usd: number;
  duration_months: number;
  creditor_name: string;
  creditor_type: string;
  contract_date: string;
  mortgage_status: 'active' | 'paid_off' | 'defaulted' | 'Active' | 'En cours' | 'Éteinte';
  payments: MortgagePayment[];
}

export interface BoundaryHistory {
  id: string;
  pv_reference_number: string;
  boundary_purpose: 'Réajustement ou rectification' | 'Morcellement ou fusion' | 'Mise en valeur ou mutation';
  surveyor_name: string;
  survey_date: string;
  boundary_document_url: string | null;
}

export interface LandDispute {
  id: string;
  reference_number: string;
  dispute_nature: string;
  declarant_name: string;
  current_status: string;
  dispute_start_date: string | null;
  dispute_type: string;
  parcel_number: string;
  [key: string]: any;
}

export interface LegalVerification {
  title_type: string | null;
  title_reference: string | null;
  title_issue_date: string | null;
  title_document_url: string | null;
  owner_document_url: string | null;
  has_dispute: boolean;
  is_subdivided: boolean;
  parcel_verified: boolean;
}

export interface CadastralSearchResult {
  parcel: CadastralParcel;
  ownership_history: OwnershipHistory[];
  tax_history: TaxHistory[];
  mortgage_history: MortgageHistory[];
  boundary_history: BoundaryHistory[];
  building_permits: BuildingPermit[];
  land_disputes: LandDispute[];
  legal_verification: LegalVerification | null;
}

// Default error messages (no longer depends on useSearchConfig)
const DEFAULT_ERROR_MESSAGES = {
  not_found: "Aucune parcelle trouvée pour ce numéro cadastral.",
  not_found_help: "Cette parcelle n'est pas encore dans notre base ou le numéro est incorrect.",
  verification_prompt: "Vérifiez vos informations avant de contribuer."
};

export const useCadastralSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<CadastralSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { isTestRoute } = useTestEnvironment();

  const errorMessages = DEFAULT_ERROR_MESSAGES;

  const validateParcelNumber = (query: string): boolean => {
    return query.trim().length > 0;
  };

  const searchParcel = async (parcelNumber: string) => {
    if (!validateParcelNumber(parcelNumber)) {
      setError('Veuillez saisir un numéro de parcelle');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Correction 3: Utiliser la RPC sécurisée qui gate les données premium
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_cadastral_parcel_data',
        { p_parcel_number: parcelNumber.trim() }
      );

      if (rpcError) {
        if (rpcError.code === 'PGRST116') {
          setError(errorMessages.not_found);
        } else {
          throw rpcError;
        }
        return;
      }

      if (!rpcData || (typeof rpcData === 'object' && !Array.isArray(rpcData) && (rpcData as any).error === 'not_found')) {
        setError(errorMessages.not_found);
        return;
      }

      const result = rpcData as any;

      // Formater les hypothèques (renommer cadastral_mortgage_payments → payments)
      const formattedMortgageData = (result.mortgage_history || []).map((mortgage: any) => ({
        ...mortgage,
        payments: mortgage.cadastral_mortgage_payments || []
      }));

      setSearchResult({
        parcel: result.parcel as unknown as CadastralParcel,
        ownership_history: result.ownership_history || [],
        tax_history: result.tax_history || [],
        mortgage_history: formattedMortgageData,
        boundary_history: result.boundary_history || [],
        building_permits: result.building_permits || [],
        land_disputes: result.land_disputes || [],
        legal_verification: result.legal_verification || null,
      });

    } catch (err) {
      console.error('Erreur lors de la recherche cadastrale:', err);
      setError('Erreur lors de la recherche. Veuillez réessayer.');
      toast({
        title: "Erreur",
        description: "Impossible d'effectuer la recherche cadastrale",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResult(null);
    setError(null);
  };

  return {
    searchQuery,
    setSearchQuery,
    searchResult,
    loading,
    error,
    searchParcel,
    clearSearch,
    validateParcelNumber
  };
};
