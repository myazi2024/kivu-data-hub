export interface CrossVariable {
  label: string;
  field: string;
  maxCategories?: number;
}

export const CROSS_VARIABLE_REGISTRY: Record<string, Record<string, CrossVariable[]>> = {
  'title-requests': {
    'request-type': [{ label: 'Statut', field: 'status' }, { label: 'Paiement', field: 'payment_status' }, { label: 'Province', field: 'province' }, { label: 'Usage', field: 'declared_usage' }],
    'requester-type': [{ label: 'Statut', field: 'status' }, { label: 'Genre', field: 'requester_gender' }, { label: 'Province', field: 'province' }],
    'status': [{ label: 'Type demande', field: 'request_type' }, { label: 'Paiement', field: 'payment_status' }, { label: 'Province', field: 'province' }],
    'payment': [{ label: 'Statut', field: 'status' }, { label: 'Type demande', field: 'request_type' }, { label: 'Province', field: 'province' }],
    'legal-status': [{ label: 'Usage', field: 'declared_usage' }, { label: 'Province', field: 'province' }, { label: 'Statut', field: 'status' }],
    'declared-usage': [{ label: 'Construction', field: 'construction_type' }, { label: 'Province', field: 'province' }, { label: 'Statut', field: 'status' }],
    'gender': [{ label: 'Statut', field: 'status' }, { label: 'Type demande', field: 'request_type' }, { label: 'Province', field: 'province' }],
    'nationality': [{ label: 'Statut', field: 'status' }, { label: 'Province', field: 'province' }],
    'deduced-title': [{ label: 'Statut', field: 'status' }, { label: 'Province', field: 'province' }],
    'owner-same': [{ label: 'Statut', field: 'status' }, { label: 'Province', field: 'province' }],
    'surface': [{ label: 'Province', field: 'province' }, { label: 'Usage', field: 'declared_usage' }, { label: 'Statut', field: 'status' }],
    'construction-type': [{ label: 'Usage', field: 'declared_usage' }, { label: 'Province', field: 'province' }, { label: 'Statut', field: 'status' }],
    'construction-nature': [{ label: 'Province', field: 'province' }, { label: 'Usage', field: 'declared_usage' }],
  },
  'parcels-titled': {
    'title-type': [{ label: 'Statut juridique', field: 'current_owner_legal_status' }, { label: 'Usage', field: 'declared_usage' }, { label: 'Province', field: 'province' }],
    'legal-status': [{ label: 'Type titre', field: 'property_title_type' }, { label: 'Usage', field: 'declared_usage' }, { label: 'Province', field: 'province' }],
    'gender': [{ label: 'Type titre', field: 'property_title_type' }, { label: 'Province', field: 'province' }],
    'construction-type': [{ label: 'Usage', field: 'declared_usage' }, { label: 'Province', field: 'province' }, { label: 'Type titre', field: 'property_title_type' }],
    'construction-nature': [{ label: 'Province', field: 'province' }, { label: 'Type titre', field: 'property_title_type' }],
    'usage': [{ label: 'Type titre', field: 'property_title_type' }, { label: 'Province', field: 'province' }],
    'lease-type': [{ label: 'Usage', field: 'declared_usage' }, { label: 'Province', field: 'province' }],
    'surface': [{ label: 'Province', field: 'province' }, { label: 'Usage', field: 'declared_usage' }],
  },
  'contributions': {
    'contribution-type': [{ label: 'Statut', field: 'status' }, { label: 'Province', field: 'province' }, { label: 'Usage', field: 'declared_usage' }],
    'status': [{ label: 'Type contribution', field: 'contribution_type' }, { label: 'Province', field: 'province' }],
    'title-type': [{ label: 'Statut', field: 'status' }, { label: 'Province', field: 'province' }, { label: 'Usage', field: 'declared_usage' }],
    'legal-status': [{ label: 'Type contribution', field: 'contribution_type' }, { label: 'Province', field: 'province' }],
    'usage': [{ label: 'Type contribution', field: 'contribution_type' }, { label: 'Statut', field: 'status' }, { label: 'Province', field: 'province' }],
    'construction-type': [{ label: 'Province', field: 'province' }, { label: 'Statut', field: 'status' }],
    'fraud-detection': [{ label: 'Type contribution', field: 'contribution_type' }, { label: 'Province', field: 'province' }],
    'fraud-score': [{ label: 'Type contribution', field: 'contribution_type' }, { label: 'Province', field: 'province' }],
    'appeal-status': [{ label: 'Province', field: 'province' }],
  },
  'expertise': {
    'status': [{ label: 'Condition', field: 'property_condition' }, { label: 'Qualité', field: 'construction_quality' }, { label: 'Province', field: 'province' }],
    'payment': [{ label: 'Statut', field: 'status' }, { label: 'Province', field: 'province' }],
    'property-condition': [{ label: 'Qualité', field: 'construction_quality' }, { label: 'Province', field: 'province' }, { label: 'Accès', field: 'road_access_type' }],
    'construction-quality': [{ label: 'Condition', field: 'property_condition' }, { label: 'Province', field: 'province' }],
    'wall-material': [{ label: 'Toiture', field: 'roof_material' }, { label: 'Province', field: 'province' }],
    'roof-material': [{ label: 'Murs', field: 'wall_material' }, { label: 'Province', field: 'province' }],
    'sound-env': [{ label: 'Province', field: 'province' }, { label: 'Position', field: 'building_position' }],
    'building-position': [{ label: 'Province', field: 'province' }, { label: 'Env. sonore', field: 'sound_environment' }],
    'road-access': [{ label: 'Province', field: 'province' }, { label: 'Condition', field: 'property_condition' }],
    'risk-zones': [{ label: 'Province', field: 'province' }],
    'market-value': [{ label: 'Province', field: 'province' }, { label: 'Qualité', field: 'construction_quality' }, { label: 'Condition', field: 'property_condition' }],
    'floors': [{ label: 'Province', field: 'province' }, { label: 'Qualité', field: 'construction_quality' }],
  },
  'mutations': {
    'status': [{ label: 'Type mutation', field: 'mutation_type' }, { label: 'Province', field: 'province' }, { label: 'Paiement', field: 'payment_status' }],
    'mutation-type': [{ label: 'Statut', field: 'status' }, { label: 'Province', field: 'province' }, { label: 'Paiement', field: 'payment_status' }],
    'requester-type': [{ label: 'Statut', field: 'status' }, { label: 'Province', field: 'province' }],
    'payment': [{ label: 'Statut', field: 'status' }, { label: 'Type mutation', field: 'mutation_type' }, { label: 'Province', field: 'province' }],
    'market-value': [{ label: 'Type mutation', field: 'mutation_type' }, { label: 'Province', field: 'province' }],
    'title-age': [{ label: 'Type mutation', field: 'mutation_type' }, { label: 'Province', field: 'province' }],
    'late-fees': [{ label: 'Type mutation', field: 'mutation_type' }, { label: 'Province', field: 'province' }],
  },
  'subdivision': {
    'status': [{ label: 'Objet', field: 'purpose_of_subdivision' }, { label: 'Province', field: 'province' }, { label: 'Demandeur', field: 'requester_type' }],
    'lots-distribution': [{ label: 'Province', field: 'province' }, { label: 'Objet', field: 'purpose_of_subdivision' }],
    'purpose': [{ label: 'Statut', field: 'status' }, { label: 'Province', field: 'province' }],
    'requester-type': [{ label: 'Statut', field: 'status' }, { label: 'Province', field: 'province' }],
    'payment': [{ label: 'Statut', field: 'status' }, { label: 'Province', field: 'province' }],
    'surface': [{ label: 'Province', field: 'province' }, { label: 'Objet', field: 'purpose_of_subdivision' }],
  },
  'disputes': {
    'nature': [{ label: 'Statut', field: 'current_status' }, { label: 'Province', field: 'province' }, { label: 'Type', field: 'dispute_type' }],
    'resolution-status': [{ label: 'Nature', field: 'dispute_nature' }, { label: 'Province', field: 'province' }],
    'status-detail': [{ label: 'Nature', field: 'dispute_nature' }, { label: 'Province', field: 'province' }],
    'type': [{ label: 'Nature', field: 'dispute_nature' }, { label: 'Province', field: 'province' }, { label: 'Résolution', field: 'resolution_level' }],
    'resolution-level': [{ label: 'Nature', field: 'dispute_nature' }, { label: 'Province', field: 'province' }],
    'declarant-quality': [{ label: 'Nature', field: 'dispute_nature' }, { label: 'Province', field: 'province' }],
    'lifting-status': [{ label: 'Nature', field: 'dispute_nature' }, { label: 'Province', field: 'province' }],
    'lifting-nature': [{ label: 'Province', field: 'province' }],
  },
  'mortgages': {
    'creditor-type': [{ label: 'Statut', field: 'mortgage_status' }, { label: 'Province', field: 'province' }],
    'amount-brackets': [{ label: 'Province', field: 'province' }, { label: 'Créancier', field: 'creditor_type' }],
    'status': [{ label: 'Créancier', field: 'creditor_type' }, { label: 'Province', field: 'province' }],
    'duration': [{ label: 'Province', field: 'province' }, { label: 'Créancier', field: 'creditor_type' }],
  },
  'building-permits': {
    'status': [{ label: 'Service', field: 'issuing_service' }, { label: 'Province', field: 'province' }],
    'current-status': [{ label: 'Province', field: 'province' }, { label: 'Service', field: 'issuing_service' }],
    'issuing-service': [{ label: 'Statut', field: 'administrative_status' }, { label: 'Province', field: 'province' }],
    'validity-period': [{ label: 'Province', field: 'province' }],
  },
  'taxes': {
    'status': [{ label: 'Exercice', field: 'tax_year' }, { label: 'Province', field: 'province' }],
    'fiscal-year': [{ label: 'Statut', field: 'payment_status' }, { label: 'Province', field: 'province' }],
    'amount-range': [{ label: 'Statut', field: 'payment_status' }, { label: 'Province', field: 'province' }],
  },
  'ownership': {
    'legal-status': [{ label: 'Type mutation', field: 'mutation_type' }, { label: 'Province', field: 'province' }],
    'mutation-type': [{ label: 'Statut juridique', field: 'legal_status' }, { label: 'Province', field: 'province' }],
  },
  'fraud': {
    'fraud-type': [{ label: 'Sévérité', field: 'severity' }, { label: 'Province', field: 'province' }],
    'severity': [{ label: 'Type fraude', field: 'fraud_type' }, { label: 'Province', field: 'province' }],
    'linked': [{ label: 'Type fraude', field: 'fraud_type' }, { label: 'Sévérité', field: 'severity' }],
  },
  'certificates': {
    'cert-type': [{ label: 'Statut', field: 'status' }, { label: 'Province', field: 'province' }],
    'status': [{ label: 'Type certificat', field: 'certificate_type' }, { label: 'Province', field: 'province' }],
  },
  'invoices': {
    'status': [{ label: 'Paiement', field: 'payment_method' }, { label: 'Province', field: 'province' }, { label: 'Zone géo', field: 'geographical_zone' }],
    'payment-method': [{ label: 'Statut', field: 'status' }, { label: 'Province', field: 'province' }],
    'geo-zone': [{ label: 'Statut', field: 'status' }, { label: 'Province', field: 'province' }],
  },
};

/** Get cross variables for a specific tab and chart */
export function getCrossVariables(tabKey: string, chartKey: string): CrossVariable[] {
  return CROSS_VARIABLE_REGISTRY[tabKey]?.[chartKey] || [];
}
