import { CadastralSearchResult } from './useCadastralSearch';

export interface MissingDataByCategory {
  category: 'information' | 'location_history' | 'history' | 'obligations';
  categoryName: string;
  missingFields: string[];
  hasMissingData: boolean;
}

/**
 * Hook pour détecter les données cadastrales manquantes par rubrique
 * Analyse les résultats de recherche cadastrale et identifie les champs non renseignés
 */
export const useMissingCadastralData = () => {
  
  const analyzeMissingData = (result: CadastralSearchResult | null): MissingDataByCategory[] => {
    if (!result) return [];
    
    const { parcel, ownership_history, tax_history, mortgage_history, boundary_history, building_permits } = result;
    
    const categories: MissingDataByCategory[] = [];
    
    // === 1. INFORMATIONS GÉNÉRALES ===
    const infoMissing: string[] = [];
    
    if (!parcel.property_title_type) infoMissing.push('Type de titre de propriété');
    if (!parcel.title_reference_number) infoMissing.push('Numéro de référence du titre');
    if (!parcel.current_owner_name) infoMissing.push('Nom du propriétaire actuel');
    if (!parcel.current_owner_legal_status) infoMissing.push('Statut juridique du propriétaire');
    if (!parcel.current_owner_since) infoMissing.push('Date de propriété actuelle');
    if (!parcel.area_sqm || parcel.area_sqm === 0) infoMissing.push('Superficie en m²');
    if (!parcel.construction_type) infoMissing.push('Type de construction');
    if (!parcel.construction_nature) infoMissing.push('Nature de construction');
    if (!parcel.declared_usage) infoMissing.push('Usage déclaré');
    if (!building_permits || building_permits.length === 0) infoMissing.push('Permis de construire');
    if (!parcel.owner_document_url) infoMissing.push('Document du propriétaire');
    if (!parcel.property_title_document_url) infoMissing.push('Document du titre de propriété');
    
    categories.push({
      category: 'information',
      categoryName: 'Informations générales',
      missingFields: infoMissing,
      hasMissingData: infoMissing.length > 0
    });
    
    // === 2. LOCALISATION ===
    const locationMissing: string[] = [];
    
    if (!parcel.province) locationMissing.push('Province');
    
    // Section urbaine
    if (parcel.parcel_type === 'SU') {
      if (!parcel.ville) locationMissing.push('Ville');
      if (!parcel.commune) locationMissing.push('Commune');
      if (!parcel.quartier) locationMissing.push('Quartier');
      if (!parcel.avenue) locationMissing.push('Avenue');
    }
    
    // Section rurale
    if (parcel.parcel_type === 'SR') {
      if (!parcel.territoire) locationMissing.push('Territoire');
      if (!parcel.collectivite) locationMissing.push('Collectivité');
      if (!parcel.groupement) locationMissing.push('Groupement');
      if (!parcel.village) locationMissing.push('Village');
    }
    
    if (!parcel.gps_coordinates || parcel.gps_coordinates.length === 0) locationMissing.push('Coordonnées GPS des bornes');
    if (!parcel.nombre_bornes || parcel.nombre_bornes === 0) locationMissing.push('Nombre de bornes');
    if (!parcel.surface_calculee_bornes) locationMissing.push('Surface calculée à partir des bornes');
    
    categories.push({
      category: 'location_history',
      categoryName: 'Localisation',
      missingFields: locationMissing,
      hasMissingData: locationMissing.length > 0
    });
    
    // === 3. HISTORIQUE ===
    const historyMissing: string[] = [];
    
    if (!ownership_history || ownership_history.length === 0) {
      historyMissing.push('Historique des propriétaires');
    }
    
    if (!boundary_history || boundary_history.length === 0) {
      historyMissing.push('Historique de bornage');
    }
    
    categories.push({
      category: 'history',
      categoryName: 'Historique',
      missingFields: historyMissing,
      hasMissingData: historyMissing.length > 0
    });
    
    // === 4. OBLIGATIONS ===
    const obligationsMissing: string[] = [];
    
    if (!tax_history || tax_history.length === 0) {
      obligationsMissing.push('Historique fiscal (taxes)');
    }
    
    if (!mortgage_history || mortgage_history.length === 0) {
      obligationsMissing.push('Historique des hypothèques');
    }
    
    categories.push({
      category: 'obligations',
      categoryName: 'Obligations',
      missingFields: obligationsMissing,
      hasMissingData: obligationsMissing.length > 0
    });
    
    return categories;
  };
  
  return { analyzeMissingData };
};
