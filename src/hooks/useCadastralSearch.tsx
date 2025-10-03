import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CadastralParcel {
  id: string;
  parcel_number: string;
  parcel_type: 'SU' | 'SR';
  location: string;
  property_title_type: string;
  area_sqm: number;
  area_hectares: number;
  gps_coordinates: Array<{ lat: number; lng: number; borne: string }>;
  latitude: number;
  longitude: number;
  current_owner_name: string;
  current_owner_legal_status: string;
  current_owner_since: string;
  created_at: string;
  updated_at: string;
  // Nouveaux champs de localisation
  province: string;
  ville: string | null;
  commune: string | null;
  quartier: string | null;
  avenue: string | null;
  territoire: string | null;
  collectivite: string | null;
  groupement: string | null;
  village: string | null;
  // Nouveaux champs de bornage
  nombre_bornes: number;
  surface_calculee_bornes: number | null;
  // Nouveaux champs de construction
  construction_type: string | null;
  construction_nature: 'Durable' | 'Semi-durable' | 'Précaire' | null;
  declared_usage: 'Résidentiel' | 'Commercial' | 'Mixte' | 'Institutionnel' | 'Industriel' | 'Agricole' | null;
}

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
}

export interface TaxHistory {
  id: string;
  tax_year: number;
  amount_usd: number;
  payment_status: 'pending' | 'paid' | 'overdue';
  payment_date: string | null;
}

export interface MortgagePayment {
  id: string;
  payment_amount_usd: number;
  payment_date: string;
  payment_type: 'partial' | 'total';
}

export interface MortgageHistory {
  id: string;
  mortgage_amount_usd: number;
  duration_months: number;
  creditor_name: string;
  creditor_type: string;
  contract_date: string;
  mortgage_status: 'active' | 'paid_off' | 'defaulted';
  payments: MortgagePayment[];
}

export interface BoundaryHistory {
  id: string;
  pv_reference_number: string;
  boundary_purpose: 'Réajustement ou rectification' | 'Morcellement ou fusion' | 'Mise en valeur ou mutation';
  surveyor_name: string;
  survey_date: string;
}

export interface CadastralSearchResult {
  parcel: CadastralParcel;
  ownership_history: OwnershipHistory[];
  tax_history: TaxHistory[];
  mortgage_history: MortgageHistory[];
  boundary_history: BoundaryHistory[];
  building_permits: BuildingPermit[];
}

export const useCadastralSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<CadastralSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fonction pour valider le format du numéro de parcelle
  const validateParcelNumber = (query: string): boolean => {
    // Format SU: SU/[Section]/[Parcelle]/[Code] ou SU/[Section]/[Parcelle]/[Subdivision]/[Code]
    // Format SR: SR/[Section]/[Parcelle]/[Code]
    // Exemples: SU/2130/KIN, SU/2130/1/KIN, SR/01/0987/BEN
    const pattern = /^(SU|SR)\/\d+\/\d+(\/\d+)?\/[A-Z]{2,3}$/i;
    return pattern.test(query.trim().toUpperCase());
  };

  // Fonction de recherche
  const searchParcel = async (parcelNumber: string) => {
    if (!validateParcelNumber(parcelNumber)) {
      setError('Format invalide. Utilisez le format SU/XXXX/CODE ou SR/XX/XXXX/CODE (ex: SU/2130/KIN, SR/01/0987/BEN)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Recherche de la parcelle principale
      const { data: parcelData, error: parcelError } = await supabase
        .from('cadastral_parcels')
        .select('*')
        .ilike('parcel_number', parcelNumber.trim())
        .single();

      if (parcelError) {
        if (parcelError.code === 'PGRST116') {
          setError('Aucune parcelle trouvée avec ce numéro');
        } else {
          throw parcelError;
        }
        return;
      }

      // Recherche de l'historique des propriétaires
      const { data: ownershipData, error: ownershipError } = await supabase
        .from('cadastral_ownership_history')
        .select('*')
        .eq('parcel_id', parcelData.id)
        .order('ownership_start_date', { ascending: false });

      if (ownershipError) throw ownershipError;

      // Recherche de l'historique des taxes
      const { data: taxData, error: taxError } = await supabase
        .from('cadastral_tax_history')
        .select('*')
        .eq('parcel_id', parcelData.id)
        .order('tax_year', { ascending: false });

      if (taxError) throw taxError;

      // Recherche de l'historique des hypothèques avec paiements
      const { data: mortgageData, error: mortgageError } = await supabase
        .from('cadastral_mortgages')
        .select(`
          *,
          cadastral_mortgage_payments (
            id,
            payment_amount_usd,
            payment_date,
            payment_type
          )
        `)
        .eq('parcel_id', parcelData.id)
        .order('contract_date', { ascending: false });

      if (mortgageError) throw mortgageError;

      // Recherche de l'historique de bornage
      const { data: boundaryData, error: boundaryError } = await supabase
        .from('cadastral_boundary_history')
        .select('*')
        .eq('parcel_id', parcelData.id)
        .order('survey_date', { ascending: false });

      if (boundaryError) throw boundaryError;

      // Recherche des permis de construire
      const { data: buildingPermitsData, error: buildingPermitsError } = await supabase
        .from('cadastral_building_permits')
        .select('*')
        .eq('parcel_id', parcelData.id)
        .order('issue_date', { ascending: false });

      if (buildingPermitsError) throw buildingPermitsError;

      // Transformation des données d'hypothèques pour correspondre à l'interface
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

  // Effet pour rechercher automatiquement après une pause de frappe
  useEffect(() => {
    if (searchQuery.length >= 3) {
      const timeoutId = setTimeout(() => {
        searchParcel(searchQuery);
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      setSearchResult(null);
      setError(null);
    }
  }, [searchQuery]);

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