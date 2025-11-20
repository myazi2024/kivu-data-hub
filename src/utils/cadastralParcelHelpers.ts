/**
 * Fonctions utilitaires pour les parcelles cadastrales
 * 
 * Ces fonctions garantissent que les opérations sur les parcelles cadastrales
 * sont effectuées de manière sûre et cohérente.
 */

import { supabase } from '@/integrations/supabase/client';
import { CadastralParcelInsert, CadastralParcelUpdate, createSafeCadastralParcelInsert, createSafeCadastralParcelUpdate } from '@/types/cadastral';

/**
 * Insère une nouvelle parcelle cadastrale de manière sécurisée
 * 
 * IMPORTANT: N'essayez JAMAIS d'insérer area_hectares - il est calculé automatiquement
 * 
 * @param parcelData - Données de la parcelle (sans area_hectares)
 * @returns Résultat de l'insertion
 */
export async function insertCadastralParcel(parcelData: Partial<CadastralParcelInsert>) {
  // Créer un payload sécurisé qui exclut area_hectares
  const safeData = createSafeCadastralParcelInsert(parcelData as any);
  
  const { data, error } = await supabase
    .from('cadastral_parcels')
    .insert(safeData)
    .select()
    .single();
  
  if (error) {
    console.error('Erreur lors de l\'insertion de la parcelle:', error);
    throw new Error(`Impossible d'insérer la parcelle: ${error.message}`);
  }
  
  return data;
}

/**
 * Met à jour une parcelle cadastrale existante de manière sécurisée
 * 
 * IMPORTANT: N'essayez JAMAIS de mettre à jour area_hectares - il est calculé automatiquement
 * 
 * @param parcelId - ID de la parcelle à mettre à jour
 * @param updates - Modifications à appliquer (sans area_hectares)
 * @returns Résultat de la mise à jour
 */
export async function updateCadastralParcel(
  parcelId: string,
  updates: Partial<CadastralParcelUpdate>
) {
  // Créer un payload sécurisé qui exclut area_hectares
  const safeUpdates = createSafeCadastralParcelUpdate(updates as any);
  
  const { data, error } = await supabase
    .from('cadastral_parcels')
    .update(safeUpdates)
    .eq('id', parcelId)
    .select()
    .single();
  
  if (error) {
    console.error('Erreur lors de la mise à jour de la parcelle:', error);
    throw new Error(`Impossible de mettre à jour la parcelle: ${error.message}`);
  }
  
  return data;
}

/**
 * Crée une parcelle à partir d'une contribution approuvée
 * 
 * Cette fonction est généralement appelée automatiquement lors de l'approbation
 * d'une contribution par un administrateur.
 * 
 * @param contribution - Données de la contribution approuvée
 * @returns La parcelle créée
 */
export async function createParcelFromContribution(contribution: any) {
  // Extraire les données pertinentes de la contribution
  const parcelData: Partial<CadastralParcelInsert> = {
    parcel_number: contribution.parcel_number,
    parcel_type: contribution.parcel_type || 'SU',
    location: contribution.ville || contribution.commune || contribution.quartier || 'Non spécifié',
    property_title_type: contribution.property_title_type || 'Certificat d\'enregistrement',
    title_reference_number: contribution.title_reference_number,
    area_sqm: contribution.area_sqm,
    // area_hectares sera calculé automatiquement par la base de données
    current_owner_name: contribution.current_owner_name,
    current_owner_legal_status: contribution.current_owner_legal_status,
    current_owner_since: contribution.current_owner_since,
    construction_type: contribution.construction_type,
    construction_nature: contribution.construction_nature,
    declared_usage: contribution.declared_usage,
    province: contribution.province,
    ville: contribution.ville,
    commune: contribution.commune,
    quartier: contribution.quartier,
    avenue: contribution.avenue,
    territoire: contribution.territoire,
    collectivite: contribution.collectivite,
    groupement: contribution.groupement,
    village: contribution.village,
    circonscription_fonciere: contribution.circonscription_fonciere,
    gps_coordinates: contribution.gps_coordinates,
    latitude: contribution.gps_coordinates?.[0]?.lat,
    longitude: contribution.gps_coordinates?.[0]?.lng,
    parcel_sides: contribution.parcel_sides,
    whatsapp_number: contribution.whatsapp_number,
    owner_document_url: contribution.owner_document_url,
    property_title_document_url: contribution.property_title_document_url,
    lease_type: contribution.lease_type,
  };
  
  return insertCadastralParcel(parcelData);
}

/**
 * Calcule la surface en hectares à partir de la surface en m²
 * (Utile pour afficher la valeur avant l'insertion)
 * 
 * @param areaSqm - Surface en mètres carrés
 * @returns Surface en hectares
 */
export function calculateAreaHectares(areaSqm: number): number {
  return areaSqm / 10000.0;
}

/**
 * Formate l'affichage de la surface (avec m² et ha)
 * 
 * @param areaSqm - Surface en mètres carrés
 * @returns Chaîne formatée
 */
export function formatArea(areaSqm: number): string {
  const hectares = calculateAreaHectares(areaSqm);
  if (hectares >= 1) {
    return `${areaSqm.toLocaleString()} m² (${hectares.toFixed(2)} ha)`;
  }
  return `${areaSqm.toLocaleString()} m²`;
}
