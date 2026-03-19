import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCatalogConfig } from './useCatalogConfig';
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

export interface CadastralSearchResult {
  parcel: CadastralParcel;
  ownership_history: OwnershipHistory[];
  tax_history: TaxHistory[];
  mortgage_history: MortgageHistory[];
  boundary_history: BoundaryHistory[];
  building_permits: BuildingPermit[];
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
      const { data: parcelData, error: parcelError } = await supabase
        .from('cadastral_parcels')
        .select('*')
        .ilike('parcel_number', parcelNumber.trim())
        .is('deleted_at', null)
        .maybeSingle();

      if (parcelError) {
        if (parcelError.code === 'PGRST116') {
          setError(errorMessages.not_found);
        } else {
          throw parcelError;
        }
        return;
      }

      if (!parcelData) {
        setError(errorMessages.not_found);
        return;
      }

      const [
        { data: ownershipData, error: ownershipError },
        { data: taxData, error: taxError },
        { data: mortgageData, error: mortgageError },
        { data: boundaryData, error: boundaryError },
        { data: buildingPermitsData, error: buildingPermitsError }
      ] = await Promise.all([
        supabase
          .from('cadastral_ownership_history')
          .select('*')
          .eq('parcel_id', parcelData.id)
          .order('ownership_start_date', { ascending: false }),
        supabase
          .from('cadastral_tax_history')
          .select('*')
          .eq('parcel_id', parcelData.id)
          .order('tax_year', { ascending: false }),
        supabase
          .from('cadastral_mortgages')
          .select(`
            *,
            cadastral_mortgage_payments (
              id,
              payment_amount_usd,
              payment_date,
              payment_type,
              payment_receipt_url
            )
          `)
          .eq('parcel_id', parcelData.id)
          .order('contract_date', { ascending: false }),
        supabase
          .from('cadastral_boundary_history')
          .select('*')
          .eq('parcel_id', parcelData.id)
          .order('survey_date', { ascending: false }),
        supabase
          .from('cadastral_building_permits')
          .select('*')
          .eq('parcel_id', parcelData.id)
          .order('issue_date', { ascending: false })
      ]);

      if (ownershipError) throw ownershipError;
      if (taxError) throw taxError;
      if (mortgageError) throw mortgageError;
      if (boundaryError) throw boundaryError;
      if (buildingPermitsError) throw buildingPermitsError;

      const formattedMortgageData = mortgageData?.map(mortgage => ({
        ...mortgage,
        payments: mortgage.cadastral_mortgage_payments || []
      })) || [];

      setSearchResult({
        parcel: parcelData as unknown as CadastralParcel,
        ownership_history: ownershipData as OwnershipHistory[],
        tax_history: taxData as TaxHistory[],
        mortgage_history: formattedMortgageData as MortgageHistory[],
        boundary_history: boundaryData as BoundaryHistory[],
        building_permits: buildingPermitsData as BuildingPermit[]
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
