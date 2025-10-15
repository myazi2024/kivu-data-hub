/**
 * Mapping entre les clés utilisées dans useCadastralDataCompleteness
 * et les clés réelles du formulaire CadastralContributionDialog
 */

export interface FieldMapping {
  dataKey: string; // Clé utilisée dans DataField (camelCase)
  formKey: string; // Clé utilisée dans le formulaire (snake_case ou camelCase)
  tab: 'general' | 'location' | 'history' | 'obligations'; // Onglet correspondant
  label: string; // Label pour l'affichage
}

export const FIELD_MAPPINGS: FieldMapping[] = [
  // Onglet General (Informations générales)
  { dataKey: 'propertyTitleType', formKey: 'propertyTitleType', tab: 'general', label: 'Type de titre de propriété' },
  { dataKey: 'titleReferenceNumber', formKey: 'titleReferenceNumber', tab: 'general', label: 'Numéro de référence du titre' },
  { dataKey: 'currentOwnerName', formKey: 'currentOwnerName', tab: 'general', label: 'Nom du propriétaire actuel' },
  { dataKey: 'currentOwnerLegalStatus', formKey: 'currentOwnerLegalStatus', tab: 'general', label: 'Statut juridique du propriétaire' },
  { dataKey: 'currentOwnerSince', formKey: 'currentOwnerSince', tab: 'general', label: 'Propriétaire depuis' },
  { dataKey: 'areaSqm', formKey: 'areaSqm', tab: 'general', label: 'Superficie (m²)' },
  { dataKey: 'constructionType', formKey: 'constructionType', tab: 'general', label: 'Type de construction' },
  { dataKey: 'constructionNature', formKey: 'constructionNature', tab: 'general', label: 'Nature de la construction' },
  { dataKey: 'declaredUsage', formKey: 'declaredUsage', tab: 'general', label: 'Usage déclaré' },
  { dataKey: 'buildingPermits', formKey: 'buildingPermits', tab: 'general', label: 'Permis de construire' },

  // Onglet Location (Localisation)
  { dataKey: 'province', formKey: 'province', tab: 'location', label: 'Province' },
  { dataKey: 'ville', formKey: 'ville', tab: 'location', label: 'Ville' },
  { dataKey: 'commune', formKey: 'commune', tab: 'location', label: 'Commune' },
  { dataKey: 'quartier', formKey: 'quartier', tab: 'location', label: 'Quartier' },
  { dataKey: 'avenue', formKey: 'avenue', tab: 'location', label: 'Avenue' },
  { dataKey: 'territoire', formKey: 'territoire', tab: 'location', label: 'Territoire' },
  { dataKey: 'collectivite', formKey: 'collectivite', tab: 'location', label: 'Collectivité' },
  { dataKey: 'groupement', formKey: 'groupement', tab: 'location', label: 'Groupement' },
  { dataKey: 'village', formKey: 'village', tab: 'location', label: 'Village' },
  { dataKey: 'circonscriptionFonciere', formKey: 'circonscriptionFonciere', tab: 'location', label: 'Circonscription foncière' },
  { dataKey: 'gpsCoordinates', formKey: 'gpsCoordinates', tab: 'location', label: 'Coordonnées GPS' },

  // Onglet History (Historique des propriétaires)
  { dataKey: 'ownershipHistory', formKey: 'ownershipHistory', tab: 'history', label: 'Historique des propriétaires' },
  { dataKey: 'boundaryHistory', formKey: 'boundaryHistory', tab: 'history', label: 'Historique des bornages' },

  // Onglet Obligations
  { dataKey: 'taxHistory', formKey: 'taxHistory', tab: 'obligations', label: 'Historique des taxes' },
  { dataKey: 'mortgageHistory', formKey: 'mortgageHistory', tab: 'obligations', label: 'Historique des hypothèques' },
];

/**
 * Obtenir le mapping d'un champ par sa clé de données
 */
export const getFieldMappingByDataKey = (dataKey: string): FieldMapping | undefined => {
  return FIELD_MAPPINGS.find(m => m.dataKey === dataKey);
};

/**
 * Obtenir le mapping d'un champ par sa clé de formulaire
 */
export const getFieldMappingByFormKey = (formKey: string): FieldMapping | undefined => {
  return FIELD_MAPPINGS.find(m => m.formKey === formKey);
};

/**
 * Obtenir tous les mappings pour un onglet donné
 */
export const getFieldMappingsForTab = (tab: string): FieldMapping[] => {
  return FIELD_MAPPINGS.filter(m => m.tab === tab);
};

/**
 * Vérifier si un champ appartient à un onglet spécifique
 */
export const isFieldInTab = (fieldKey: string, tab: string): boolean => {
  const mapping = getFieldMappingByDataKey(fieldKey) || getFieldMappingByFormKey(fieldKey);
  return mapping?.tab === tab;
};
