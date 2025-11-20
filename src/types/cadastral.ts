/**
 * Types sécurisés pour les opérations cadastrales
 * 
 * IMPORTANT: area_hectares est une colonne GENERATED et ne doit JAMAIS être
 * insérée ou mise à jour manuellement. Elle est calculée automatiquement
 * à partir de area_sqm.
 */

import { Database } from '@/integrations/supabase/types';

// Type de base pour les parcelles cadastrales
export type CadastralParcel = Database['public']['Tables']['cadastral_parcels']['Row'];

/**
 * Type pour l'insertion de parcelles cadastrales
 * IMPORTANT: Exclut area_hectares car c'est une colonne générée
 */
export type CadastralParcelInsert = Omit<
  Database['public']['Tables']['cadastral_parcels']['Insert'],
  'area_hectares'
>;

/**
 * Type pour la mise à jour de parcelles cadastrales
 * IMPORTANT: Exclut area_hectares car c'est une colonne générée
 */
export type CadastralParcelUpdate = Omit<
  Database['public']['Tables']['cadastral_parcels']['Update'],
  'area_hectares'
>;

/**
 * Fonction helper pour créer un payload d'insertion sécurisé
 * Supprime automatiquement area_hectares si présent
 */
export function createSafeCadastralParcelInsert(
  data: Partial<Database['public']['Tables']['cadastral_parcels']['Insert']>
): CadastralParcelInsert {
  const { area_hectares, ...safeData } = data as any;
  
  if (area_hectares !== undefined) {
    console.warn(
      '⚠️ Tentative d\'insertion de area_hectares détectée et ignorée. ' +
      'Cette colonne est calculée automatiquement à partir de area_sqm.'
    );
  }
  
  return safeData as CadastralParcelInsert;
}

/**
 * Fonction helper pour créer un payload de mise à jour sécurisé
 * Supprime automatiquement area_hectares si présent
 */
export function createSafeCadastralParcelUpdate(
  data: Partial<Database['public']['Tables']['cadastral_parcels']['Update']>
): CadastralParcelUpdate {
  const { area_hectares, ...safeData } = data as any;
  
  if (area_hectares !== undefined) {
    console.warn(
      '⚠️ Tentative de mise à jour de area_hectares détectée et ignorée. ' +
      'Cette colonne est calculée automatiquement à partir de area_sqm.'
    );
  }
  
  return safeData as CadastralParcelUpdate;
}

/**
 * Type pour les contributions cadastrales
 */
export type CadastralContribution = Database['public']['Tables']['cadastral_contributions']['Row'];

/**
 * Type pour l'insertion de contributions cadastrales
 */
export type CadastralContributionInsert = Database['public']['Tables']['cadastral_contributions']['Insert'];

/**
 * Type pour la mise à jour de contributions cadastrales
 */
export type CadastralContributionUpdate = Database['public']['Tables']['cadastral_contributions']['Update'];
