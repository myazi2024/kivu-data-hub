import { CadastralSearchResult } from '@/hooks/useCadastralSearch';

export type DataStatus = 'complete' | 'partial' | 'empty';

export interface ServiceCompleteness {
  status: DataStatus;
  availableFields: string[];
  missingFields: string[];
  totalFields: number;
  filledFields: number;
}

export interface ServiceDataAnalysis {
  [serviceId: string]: ServiceCompleteness;
}

/**
 * Analyse la complétude des données pour les informations générales
 */
const analyzeGeneralInfo = (result: CadastralSearchResult): ServiceCompleteness => {
  const fields = {
    'Type de titre de propriété': result.parcel.property_title_type,
    'Numéro de référence du titre': result.parcel.title_reference_number,
    'Propriétaire actuel': result.parcel.current_owner_name,
    'Statut juridique': result.parcel.current_owner_legal_status,
    'Propriétaire depuis': result.parcel.current_owner_since,
    'Superficie (m²)': result.parcel.area_sqm,
    'Type de construction': result.parcel.construction_type,
    'Nature de construction': result.parcel.construction_nature,
    'Usage déclaré': result.parcel.declared_usage,
  };

  const availableFields: string[] = [];
  const missingFields: string[] = [];

  Object.entries(fields).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      availableFields.push(key);
    } else {
      missingFields.push(key);
    }
  });

  const totalFields = Object.keys(fields).length;
  const filledFields = availableFields.length;

  let status: DataStatus;
  if (filledFields === 0) status = 'empty';
  else if (filledFields === totalFields) status = 'complete';
  else status = 'partial';

  return { status, availableFields, missingFields, totalFields, filledFields };
};

/**
 * Analyse la complétude des données de localisation
 */
const analyzeLocation = (result: CadastralSearchResult): ServiceCompleteness => {
  const fields = {
    'Province': result.parcel.province,
    'Ville': result.parcel.ville,
    'Commune': result.parcel.commune,
    'Quartier': result.parcel.quartier,
    'Avenue': result.parcel.avenue,
    'Territoire': result.parcel.territoire,
    'Collectivité': result.parcel.collectivite,
    'Groupement': result.parcel.groupement,
    'Village': result.parcel.village,
    'Circonscription foncière': (result.parcel as any).circonscription_fonciere,
    'Coordonnées GPS': result.parcel.gps_coordinates,
  };

  const availableFields: string[] = [];
  const missingFields: string[] = [];

  Object.entries(fields).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      availableFields.push(key);
    } else {
      missingFields.push(key);
    }
  });

  const totalFields = Object.keys(fields).length;
  const filledFields = availableFields.length;

  let status: DataStatus;
  if (filledFields === 0) status = 'empty';
  else if (filledFields === totalFields) status = 'complete';
  else status = 'partial';

  return { status, availableFields, missingFields, totalFields, filledFields };
};

/**
 * Analyse la complétude de l'historique de propriété
 */
const analyzeOwnershipHistory = (result: CadastralSearchResult): ServiceCompleteness => {
  const hasHistory = result.ownership_history && result.ownership_history.length > 0;
  
  if (!hasHistory) {
    return {
      status: 'empty',
      availableFields: [],
      missingFields: ['Historique des propriétaires'],
      totalFields: 1,
      filledFields: 0,
    };
  }

  const availableFields: string[] = [];
  const missingFields: string[] = [];

  result.ownership_history.forEach((owner, index) => {
    const ownerLabel = `Propriétaire ${index + 1}`;
    if (owner.owner_name && owner.ownership_start_date) {
      availableFields.push(ownerLabel);
    } else {
      missingFields.push(ownerLabel);
    }
  });

  const totalFields = result.ownership_history.length;
  const filledFields = availableFields.length;

  let status: DataStatus;
  if (filledFields === 0) status = 'empty';
  else if (filledFields === totalFields) status = 'complete';
  else status = 'partial';

  return { status, availableFields, missingFields, totalFields, filledFields };
};

/**
 * Analyse la complétude de l'historique fiscal
 */
const analyzeTaxHistory = (result: CadastralSearchResult): ServiceCompleteness => {
  const hasHistory = result.tax_history && result.tax_history.length > 0;
  
  if (!hasHistory) {
    return {
      status: 'empty',
      availableFields: [],
      missingFields: ['Historique fiscal'],
      totalFields: 1,
      filledFields: 0,
    };
  }

  const availableFields: string[] = [];
  const missingFields: string[] = [];

  result.tax_history.forEach((tax, index) => {
    const taxLabel = `Taxe ${tax.tax_year || index + 1}`;
    if (tax.amount_usd && tax.tax_year) {
      availableFields.push(taxLabel);
    } else {
      missingFields.push(taxLabel);
    }
  });

  const totalFields = result.tax_history.length;
  const filledFields = availableFields.length;

  let status: DataStatus;
  if (filledFields === 0) status = 'empty';
  else if (filledFields === totalFields) status = 'complete';
  else status = 'partial';

  return { status, availableFields, missingFields, totalFields, filledFields };
};

/**
 * Analyse la complétude de l'historique hypothécaire
 */
const analyzeMortgageHistory = (result: CadastralSearchResult): ServiceCompleteness => {
  const hasHistory = result.mortgage_history && result.mortgage_history.length > 0;
  
  if (!hasHistory) {
    return {
      status: 'empty',
      availableFields: [],
      missingFields: ['Historique hypothécaire'],
      totalFields: 1,
      filledFields: 0,
    };
  }

  const availableFields: string[] = [];
  const missingFields: string[] = [];

  result.mortgage_history.forEach((mortgage, index) => {
    const mortgageLabel = `Hypothèque ${index + 1}`;
    if (mortgage.creditor_name && mortgage.mortgage_amount_usd) {
      availableFields.push(mortgageLabel);
    } else {
      missingFields.push(mortgageLabel);
    }
  });

  const totalFields = result.mortgage_history.length;
  const filledFields = availableFields.length;

  let status: DataStatus;
  if (filledFields === 0) status = 'empty';
  else if (filledFields === totalFields) status = 'complete';
  else status = 'partial';

  return { status, availableFields, missingFields, totalFields, filledFields };
};

/**
 * Analyse la complétude des permis de construire
 */
const analyzeBuildingPermits = (result: CadastralSearchResult): ServiceCompleteness => {
  const hasPermits = result.building_permits && result.building_permits.length > 0;
  
  if (!hasPermits) {
    return {
      status: 'empty',
      availableFields: [],
      missingFields: ['Permis de construire'],
      totalFields: 1,
      filledFields: 0,
    };
  }

  const availableFields: string[] = [];
  const missingFields: string[] = [];

  result.building_permits.forEach((permit, index) => {
    const permitLabel = `Permis ${permit.permit_number || index + 1}`;
    if (permit.permit_number && permit.issue_date) {
      availableFields.push(permitLabel);
    } else {
      missingFields.push(permitLabel);
    }
  });

  const totalFields = result.building_permits.length;
  const filledFields = availableFields.length;

  let status: DataStatus;
  if (filledFields === 0) status = 'empty';
  else if (filledFields === totalFields) status = 'complete';
  else status = 'partial';

  return { status, availableFields, missingFields, totalFields, filledFields };
};

/**
 * Analyse la complétude de l'historique de bornage
 */
const analyzeBoundaryHistory = (result: CadastralSearchResult): ServiceCompleteness => {
  const hasHistory = result.boundary_history && result.boundary_history.length > 0;
  
  if (!hasHistory) {
    return {
      status: 'empty',
      availableFields: [],
      missingFields: ['Historique de bornage'],
      totalFields: 1,
      filledFields: 0,
    };
  }

  const availableFields: string[] = [];
  const missingFields: string[] = [];

  result.boundary_history.forEach((boundary, index) => {
    const boundaryLabel = `Bornage ${index + 1}`;
    if (boundary.surveyor_name && boundary.survey_date) {
      availableFields.push(boundaryLabel);
    } else {
      missingFields.push(boundaryLabel);
    }
  });

  const totalFields = result.boundary_history.length;
  const filledFields = availableFields.length;

  let status: DataStatus;
  if (filledFields === 0) status = 'empty';
  else if (filledFields === totalFields) status = 'complete';
  else status = 'partial';

  return { status, availableFields, missingFields, totalFields, filledFields };
};

/**
 * Analyse la complétude de toutes les données cadastrales par service
 */
export const analyzeServiceCompleteness = (result: CadastralSearchResult): ServiceDataAnalysis => {
  return {
    'informations_generales': analyzeGeneralInfo(result),
    'localisation': analyzeLocation(result),
    'historique_propriete': analyzeOwnershipHistory(result),
    'historique_fiscal': analyzeTaxHistory(result),
    'historique_hypothecaire': analyzeMortgageHistory(result),
    'permis_construire': analyzeBuildingPermits(result),
    'historique_bornage': analyzeBoundaryHistory(result),
  };
};

/**
 * Obtient un label lisible pour le statut de complétude
 */
export const getStatusLabel = (status: DataStatus): string => {
  switch (status) {
    case 'complete': return 'Données complètes';
    case 'partial': return 'Données partielles';
    case 'empty': return 'Pas de données';
  }
};

/**
 * Obtient une couleur pour le statut
 */
export const getStatusColor = (status: DataStatus): string => {
  switch (status) {
    case 'complete': return 'text-green-600';
    case 'partial': return 'text-orange-600';
    case 'empty': return 'text-red-600';
  }
};
