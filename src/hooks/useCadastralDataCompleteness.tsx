import { useMemo } from 'react';
import { CadastralSearchResult } from './useCadastralSearch';

export interface DataField {
  key: string;
  label: string;
  category: 'general' | 'location' | 'ownership' | 'obligations';
  isAvailable: boolean;
}

export interface ServiceCompleteness {
  serviceId: string;
  status: 'complete' | 'partial' | 'empty';
  availableFields: DataField[];
  missingFields: DataField[];
  completionPercentage: number;
}

export const useCadastralDataCompleteness = (result: CadastralSearchResult | null) => {
  const analyzeData = useMemo(() => {
    if (!result) return [];

    const { parcel, ownership_history, tax_history, mortgage_history, boundary_history, building_permits } = result;

    // Définir tous les champs possibles par catégorie
    const generalFields: DataField[] = [
      { key: 'propertyTitleType', label: 'Type de titre de propriété', category: 'general', isAvailable: !!parcel.property_title_type },
      { key: 'titleReferenceNumber', label: 'Numéro de référence du titre', category: 'general', isAvailable: !!parcel.title_reference_number },
      { key: 'currentOwnerName', label: 'Nom du propriétaire actuel', category: 'general', isAvailable: !!parcel.current_owner_name },
      { key: 'currentOwnerLegalStatus', label: 'Statut juridique du propriétaire', category: 'general', isAvailable: !!parcel.current_owner_legal_status },
      { key: 'currentOwnerSince', label: 'Propriétaire depuis', category: 'general', isAvailable: !!parcel.current_owner_since },
      { key: 'areaSqm', label: 'Superficie (m²)', category: 'general', isAvailable: !!parcel.area_sqm && parcel.area_sqm > 0 },
      { key: 'constructionType', label: 'Type de construction', category: 'general', isAvailable: !!parcel.construction_type },
      { key: 'constructionNature', label: 'Nature de la construction', category: 'general', isAvailable: !!parcel.construction_nature },
      { key: 'declaredUsage', label: 'Usage déclaré', category: 'general', isAvailable: !!parcel.declared_usage },
    ];

    const locationFields: DataField[] = [
      { key: 'province', label: 'Province', category: 'location', isAvailable: !!parcel.province },
      { key: 'ville', label: 'Ville', category: 'location', isAvailable: !!parcel.ville },
      { key: 'commune', label: 'Commune', category: 'location', isAvailable: !!parcel.commune },
      { key: 'quartier', label: 'Quartier', category: 'location', isAvailable: !!parcel.quartier },
      { key: 'avenue', label: 'Avenue', category: 'location', isAvailable: !!parcel.avenue },
      { key: 'territoire', label: 'Territoire', category: 'location', isAvailable: !!parcel.territoire },
      { key: 'collectivite', label: 'Collectivité', category: 'location', isAvailable: !!parcel.collectivite },
      { key: 'groupement', label: 'Groupement', category: 'location', isAvailable: !!parcel.groupement },
      { key: 'village', label: 'Village', category: 'location', isAvailable: !!parcel.village },
      { key: 'circonscriptionFonciere', label: 'Circonscription foncière', category: 'location', isAvailable: !!parcel.circonscription_fonciere },
      { key: 'gpsCoordinates', label: 'Coordonnées GPS', category: 'location', isAvailable: !!parcel.gps_coordinates && Array.isArray(parcel.gps_coordinates) && parcel.gps_coordinates.length > 0 },
    ];

    const ownershipFields: DataField[] = [
      { key: 'ownershipHistory', label: 'Historique des propriétaires', category: 'ownership', isAvailable: ownership_history.length > 0 },
      { key: 'boundaryHistory', label: 'Historique des bornages', category: 'ownership', isAvailable: boundary_history.length > 0 },
    ];

    const obligationFields: DataField[] = [
      { key: 'taxHistory', label: 'Historique des taxes', category: 'obligations', isAvailable: tax_history.length > 0 },
      { key: 'mortgageHistory', label: 'Historique des hypothèques', category: 'obligations', isAvailable: mortgage_history.length > 0 },
    ];

    // Permis de construire - considéré séparément ou comme partie de 'general'
    const buildingPermitFields: DataField[] = [
      { key: 'buildingPermits', label: 'Permis de construire', category: 'general', isAvailable: building_permits.length > 0 },
    ];

    // Analyser chaque service - Les IDs doivent correspondre aux service_id de la BDD
    const services: ServiceCompleteness[] = [
      {
        serviceId: 'information_generale', // Correspond au service_id dans cadastral_services_config
        status: 'empty',
        availableFields: [],
        missingFields: [],
        completionPercentage: 0
      },
      {
        serviceId: 'localisation', // Correspond au service_id dans cadastral_services_config
        status: 'empty',
        availableFields: [],
        missingFields: [],
        completionPercentage: 0
      },
      {
        serviceId: 'historique_proprietaires', // Correspond au service_id dans cadastral_services_config
        status: 'empty',
        availableFields: [],
        missingFields: [],
        completionPercentage: 0
      },
      {
        serviceId: 'obligations', // Correspond au service_id dans cadastral_services_config
        status: 'empty',
        availableFields: [],
        missingFields: [],
        completionPercentage: 0
      }
    ];

    // Analyser Information Générale
    const allGeneralFields = [...generalFields, ...buildingPermitFields];
    const availableGeneral = allGeneralFields.filter(f => f.isAvailable);
    const missingGeneral = allGeneralFields.filter(f => !f.isAvailable);
    services[0].availableFields = availableGeneral;
    services[0].missingFields = missingGeneral;
    services[0].completionPercentage = (availableGeneral.length / allGeneralFields.length) * 100;
    if (availableGeneral.length === 0) services[0].status = 'empty';
    else if (missingGeneral.length === 0) services[0].status = 'complete';
    else services[0].status = 'partial';

    // Analyser Localisation
    const availableLocation = locationFields.filter(f => f.isAvailable);
    const missingLocation = locationFields.filter(f => !f.isAvailable);
    services[1].availableFields = availableLocation;
    services[1].missingFields = missingLocation;
    services[1].completionPercentage = (availableLocation.length / locationFields.length) * 100;
    if (availableLocation.length === 0) services[1].status = 'empty';
    else if (missingLocation.length === 0) services[1].status = 'complete';
    else services[1].status = 'partial';

    // Analyser Historique des propriétaires
    const availableOwnership = ownershipFields.filter(f => f.isAvailable);
    const missingOwnership = ownershipFields.filter(f => !f.isAvailable);
    services[2].availableFields = availableOwnership;
    services[2].missingFields = missingOwnership;
    services[2].completionPercentage = (availableOwnership.length / ownershipFields.length) * 100;
    if (availableOwnership.length === 0) services[2].status = 'empty';
    else if (missingOwnership.length === 0) services[2].status = 'complete';
    else services[2].status = 'partial';

    // Analyser Obligations
    const availableObligation = obligationFields.filter(f => f.isAvailable);
    const missingObligation = obligationFields.filter(f => !f.isAvailable);
    services[3].availableFields = availableObligation;
    services[3].missingFields = missingObligation;
    services[3].completionPercentage = (availableObligation.length / obligationFields.length) * 100;
    if (availableObligation.length === 0) services[3].status = 'empty';
    else if (missingObligation.length === 0) services[3].status = 'complete';
    else services[3].status = 'partial';

    return services;
  }, [result]);

  return { servicesCompleteness: analyzeData };
};
