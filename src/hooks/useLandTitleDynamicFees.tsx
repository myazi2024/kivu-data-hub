import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DeducedLandTitle } from '@/utils/landTitleDeduction';

export interface LandTitleFeeByType {
  id: string;
  title_type: string;
  fee_category: string;
  fee_name: string;
  description: string | null;
  base_amount_usd: number;
  is_mandatory: boolean;
  applies_to_urban: boolean;
  applies_to_rural: boolean;
  min_area_sqm: number | null;
  max_area_sqm: number | null;
  area_multiplier: number;
  urban_surcharge_usd: number;
  rural_discount_usd: number;
  is_active: boolean;
  display_order: number;
}

export interface CalculatedFee {
  id: string;
  fee_name: string;
  description: string | null;
  category: string;
  base_amount: number;
  zone_adjustment: number;
  final_amount: number;
  is_mandatory: boolean;
  is_applicable: boolean;
}

export interface FeeCalculationResult {
  fees: CalculatedFee[];
  totalAmount: number;
  breakdown: {
    baseFees: number;
    zoneAdjustment: number;
    areaAdjustment: number;
    total: number;
  };
}

// Mapping des types de titres déduits vers les clés de la base
const TITLE_TYPE_MAPPING: Record<string, string> = {
  // Certificat d'enregistrement
  "Certificat d'enregistrement": 'certificat_enregistrement',
  
  // Concession perpétuelle
  "Concession perpétuelle": 'concession_perpetuelle',
  
  // Bail emphytéotique (toutes les variantes)
  "Bail emphytéotique": 'bail_emphyteotique',
  "Bail emphytéotique court (20-25 ans)": 'bail_emphyteotique',
  "Bail emphytéotique agricole (18-99 ans)": 'bail_emphyteotique',
  "Bail emphytéotique industriel (18-99 ans)": 'bail_emphyteotique',
  
  // Bail foncier -> concession ordinaire comme fallback
  "Bail foncier": 'concession_ordinaire',
  
  // Concession ordinaire
  "Concession ordinaire": 'concession_ordinaire',
  
  // Permis d'occupation
  "Permis d'occupation urbain": 'permis_occupation',
  "Permis d'occupation rural": 'permis_occupation',
  "Permis d'occupation provisoire": 'permis_occupation',
  
  // Autorisation d'occupation
  "Autorisation d'occupation provisoire": 'autorisation_occupation',
  "Autorisation d'occupation": 'autorisation_occupation',
  
  // Location
  "Location": 'location',
  "Bail location": 'location',
};

export const useLandTitleDynamicFees = () => {
  const [allFees, setAllFees] = useState<LandTitleFeeByType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('land_title_fees_by_type')
        .select('*')
        .eq('is_active', true)
        .order('title_type')
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;
      setAllFees((data || []) as LandTitleFeeByType[]);
    } catch (err: any) {
      console.error('Error fetching land title fees:', err);
      setError(err.message);
      toast.error('Erreur lors du chargement des frais');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  /**
   * Calcule les frais applicables selon le type de titre, la zone et la superficie
   */
  const calculateFees = useCallback((
    deducedTitle: DeducedLandTitle | null,
    sectionType: 'urbaine' | 'rurale' | '',
    areaSqm?: number
  ): FeeCalculationResult => {
    if (!deducedTitle || allFees.length === 0) {
      return {
        fees: [],
        totalAmount: 0,
        breakdown: { baseFees: 0, zoneAdjustment: 0, areaAdjustment: 0, total: 0 }
      };
    }

    const isUrban = sectionType === 'urbaine';
    const isRural = sectionType === 'rurale';
    
    // Trouver le type de titre correspondant dans la base
    const titleTypeKey = TITLE_TYPE_MAPPING[deducedTitle.type] || 'concession_ordinaire';
    
    // Filtrer les frais pour ce type de titre
    const applicableFees = allFees.filter(fee => {
      // Vérifier le type de titre
      if (fee.title_type !== titleTypeKey) return false;
      
      // Vérifier l'applicabilité selon la zone
      if (isUrban && !fee.applies_to_urban) return false;
      if (isRural && !fee.applies_to_rural) return false;
      
      // Pour les frais de superficie, vérifier la tranche
      if (fee.fee_category === 'superficie' && areaSqm !== undefined) {
        const minOk = fee.min_area_sqm === null || areaSqm >= fee.min_area_sqm;
        const maxOk = fee.max_area_sqm === null || areaSqm < fee.max_area_sqm;
        return minOk && maxOk;
      }
      
      // Exclure les autres tranches de superficie
      if (fee.fee_category === 'superficie') return false;
      
      return true;
    });

    // Ajouter le frais de superficie applicable
    const areaFee = allFees.find(fee => {
      if (fee.title_type !== titleTypeKey) return false;
      if (fee.fee_category !== 'superficie') return false;
      if (areaSqm === undefined) return false;
      
      const minOk = fee.min_area_sqm === null || areaSqm >= fee.min_area_sqm;
      const maxOk = fee.max_area_sqm === null || areaSqm < fee.max_area_sqm;
      return minOk && maxOk;
    });

    const feesToCalculate = areaFee 
      ? [...applicableFees, areaFee]
      : applicableFees;

    // Calculer les montants finaux
    let baseFees = 0;
    let zoneAdjustment = 0;
    let areaAdjustment = 0;

    const calculatedFees: CalculatedFee[] = feesToCalculate.map(fee => {
      let zoneAdj = 0;
      
      if (isUrban) {
        zoneAdj = fee.urban_surcharge_usd || 0;
      } else if (isRural) {
        zoneAdj = -(fee.rural_discount_usd || 0);
      }

      const baseAmount = fee.base_amount_usd;
      const finalAmount = Math.max(0, baseAmount + zoneAdj);

      baseFees += baseAmount;
      zoneAdjustment += zoneAdj;
      
      if (fee.fee_category === 'superficie') {
        areaAdjustment += baseAmount;
      }

      return {
        id: fee.id,
        fee_name: fee.fee_name,
        description: fee.description,
        category: fee.fee_category,
        base_amount: baseAmount,
        zone_adjustment: zoneAdj,
        final_amount: finalAmount,
        is_mandatory: fee.is_mandatory,
        is_applicable: true
      };
    });

    // Trier par ordre d'affichage
    calculatedFees.sort((a, b) => {
      const feeA = allFees.find(f => f.id === a.id);
      const feeB = allFees.find(f => f.id === b.id);
      return (feeA?.display_order || 0) - (feeB?.display_order || 0);
    });

    const totalAmount = calculatedFees.reduce((sum, fee) => sum + fee.final_amount, 0);

    return {
      fees: calculatedFees,
      totalAmount,
      breakdown: {
        baseFees,
        zoneAdjustment,
        areaAdjustment,
        total: totalAmount
      }
    };
  }, [allFees]);

  /**
   * Obtient les types de titres disponibles
   */
  const availableTitleTypes = useMemo(() => {
    const types = new Set(allFees.map(f => f.title_type));
    return Array.from(types);
  }, [allFees]);

  return {
    allFees,
    loading,
    error,
    fetchFees,
    calculateFees,
    availableTitleTypes
  };
};
