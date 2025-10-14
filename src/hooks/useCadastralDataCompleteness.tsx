import { useMemo } from 'react';
import { CadastralSearchResult } from './useCadastralSearch';

export interface DataField {
  name: string;
  label: string;
  value: any;
  isMissing: boolean;
  category: 'information' | 'location_history' | 'history' | 'obligations';
}

export interface ServiceCompleteness {
  serviceId: string;
  status: 'complete' | 'partial' | 'empty';
  completionRate: number;
  totalFields: number;
  filledFields: number;
  missingFields: DataField[];
  availableFields: DataField[];
}

export const useCadastralDataCompleteness = (result: CadastralSearchResult | null) => {
  const completeness = useMemo(() => {
    if (!result) return null;

    const { parcel, ownership_history, tax_history, mortgage_history, boundary_history, building_permits } = result;

    // Analyser le service "Information générale"
    const informationFields: DataField[] = [
      { name: 'property_title_type', label: 'Type de titre foncier', value: parcel.property_title_type, isMissing: !parcel.property_title_type, category: 'information' },
      { name: 'title_reference_number', label: 'Numéro de référence', value: parcel.title_reference_number, isMissing: !parcel.title_reference_number, category: 'information' },
      { name: 'current_owner_name', label: 'Propriétaire actuel', value: parcel.current_owner_name, isMissing: !parcel.current_owner_name, category: 'information' },
      { name: 'current_owner_legal_status', label: 'Statut juridique', value: parcel.current_owner_legal_status, isMissing: !parcel.current_owner_legal_status, category: 'information' },
      { name: 'current_owner_since', label: 'Propriétaire depuis', value: parcel.current_owner_since, isMissing: !parcel.current_owner_since, category: 'information' },
      { name: 'area_sqm', label: 'Superficie (m²)', value: parcel.area_sqm, isMissing: !parcel.area_sqm || parcel.area_sqm === 0, category: 'information' },
      { name: 'construction_type', label: 'Type de construction', value: parcel.construction_type, isMissing: !parcel.construction_type, category: 'information' },
      { name: 'construction_nature', label: 'Nature de construction', value: parcel.construction_nature, isMissing: !parcel.construction_nature, category: 'information' },
      { name: 'declared_usage', label: 'Usage déclaré', value: parcel.declared_usage, isMissing: !parcel.declared_usage, category: 'information' },
      { name: 'building_permits', label: 'Permis de construire', value: building_permits, isMissing: !building_permits || building_permits.length === 0, category: 'information' },
    ];

    // Analyser le service "Localisation & Bornage"
    const locationFields: DataField[] = [
      { name: 'province', label: 'Province', value: parcel.province, isMissing: !parcel.province, category: 'location_history' },
      { name: 'ville', label: 'Ville', value: parcel.ville, isMissing: !parcel.ville, category: 'location_history' },
      { name: 'commune', label: 'Commune', value: parcel.commune, isMissing: !parcel.commune, category: 'location_history' },
      { name: 'quartier', label: 'Quartier', value: parcel.quartier, isMissing: !parcel.quartier, category: 'location_history' },
      { name: 'avenue', label: 'Avenue', value: parcel.avenue, isMissing: !parcel.avenue, category: 'location_history' },
      { name: 'territoire', label: 'Territoire', value: parcel.territoire, isMissing: !parcel.territoire, category: 'location_history' },
      { name: 'collectivite', label: 'Collectivité', value: parcel.collectivite, isMissing: !parcel.collectivite, category: 'location_history' },
      { name: 'groupement', label: 'Groupement', value: parcel.groupement, isMissing: !parcel.groupement, category: 'location_history' },
      { name: 'village', label: 'Village', value: parcel.village, isMissing: !parcel.village, category: 'location_history' },
      { name: 'gps_coordinates', label: 'Coordonnées GPS', value: parcel.gps_coordinates, isMissing: !parcel.gps_coordinates || (Array.isArray(parcel.gps_coordinates) && parcel.gps_coordinates.length < 3), category: 'location_history' },
      { name: 'boundary_history', label: 'Historique de bornage', value: boundary_history, isMissing: !boundary_history || boundary_history.length === 0, category: 'location_history' },
    ];

    // Analyser le service "Historique"
    const historyFields: DataField[] = [
      { name: 'ownership_history', label: 'Historique des propriétaires', value: ownership_history, isMissing: !ownership_history || ownership_history.length === 0, category: 'history' },
    ];

    // Analyser le service "Obligations"
    const obligationsFields: DataField[] = [
      { name: 'tax_history', label: 'Historique fiscal', value: tax_history, isMissing: !tax_history || tax_history.length === 0, category: 'obligations' },
      { name: 'mortgage_history', label: 'Historique hypothécaire', value: mortgage_history, isMissing: !mortgage_history || mortgage_history.length === 0, category: 'obligations' },
    ];

    // Calculer la complétude pour chaque service
    const calculateServiceCompleteness = (fields: DataField[], serviceId: string): ServiceCompleteness => {
      const totalFields = fields.length;
      const filledFields = fields.filter(f => !f.isMissing).length;
      const missingFields = fields.filter(f => f.isMissing);
      const availableFields = fields.filter(f => !f.isMissing);
      const completionRate = totalFields > 0 ? (filledFields / totalFields) * 100 : 0;

      let status: 'complete' | 'partial' | 'empty';
      if (completionRate === 100) {
        status = 'complete';
      } else if (completionRate > 0) {
        status = 'partial';
      } else {
        status = 'empty';
      }

      return {
        serviceId,
        status,
        completionRate,
        totalFields,
        filledFields,
        missingFields,
        availableFields
      };
    };

    return {
      information: calculateServiceCompleteness(informationFields, 'information'),
      location_history: calculateServiceCompleteness(locationFields, 'location_history'),
      history: calculateServiceCompleteness(historyFields, 'history'),
      obligations: calculateServiceCompleteness(obligationsFields, 'obligations'),
    };
  }, [result]);

  const getServiceCompleteness = (serviceId: string): ServiceCompleteness | null => {
    if (!completeness) return null;
    return completeness[serviceId as keyof typeof completeness] || null;
  };

  const hasCompleteness = (serviceId: string): boolean => {
    const service = getServiceCompleteness(serviceId);
    return service ? service.status !== 'empty' : false;
  };

  const isServiceAccessible = (serviceId: string): boolean => {
    const service = getServiceCompleteness(serviceId);
    return service ? service.status !== 'empty' : false;
  };

  return {
    completeness,
    getServiceCompleteness,
    hasCompleteness,
    isServiceAccessible
  };
};
