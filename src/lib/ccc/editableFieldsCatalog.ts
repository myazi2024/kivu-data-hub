/**
 * Catalogue des données CCC modifiables depuis l'espace utilisateur.
 *
 * Il décrit, pour chaque colonne autorisée, son libellé, l'onglet du formulaire
 * dont elle provient, le type de saisie et ses dépendances de liste. La liste
 * blanche doit rester alignée avec la fonction SQL `ccc_correctable_columns()`.
 */

export type CCCFieldInputType = 'text' | 'number' | 'date' | 'boolean' | 'select';

export type CCCFieldSection =
  | 'Général'
  | 'Localisation'
  | 'Construction'
  | 'Location'
  | 'Valeur marchande';

export interface CCCEditableField {
  /** Colonne en base (contribution + parcelle). */
  field: string;
  label: string;
  section: CCCFieldSection;
  input: CCCFieldInputType;
  /** Clé de picklist simple (useCCCFormPicklists.getOptions). */
  picklistKey?: string;
  /** Clé de picklist dépendante (useCCCFormPicklists.getDependentOptions). */
  dependentPicklistKey?: string;
  /** Champ dont dépend la liste ci-dessus. */
  dependsOn?: string;
  /** Champs devenant incohérents lorsque celui-ci change. */
  invalidates?: string[];
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  maxLength?: number;
  help?: string;
}

export const CCC_EDITABLE_FIELDS: CCCEditableField[] = [
  // --- Général ---
  { field: 'property_title_type', label: 'Type de titre de propriété', section: 'Général', input: 'text', maxLength: 120 },
  { field: 'title_reference_number', label: 'Numéro du titre', section: 'Général', input: 'text', maxLength: 80 },
  { field: 'title_issue_date', label: "Date d'émission du titre", section: 'Général', input: 'date' },
  { field: 'lease_type', label: 'Type de bail', section: 'Général', input: 'text', maxLength: 80 },
  { field: 'lease_years', label: 'Durée du bail (années)', section: 'Général', input: 'number', min: 0, max: 99, step: 1 },
  { field: 'current_owner_name', label: 'Nom du propriétaire actuel', section: 'Général', input: 'text', maxLength: 150 },
  {
    field: 'current_owner_legal_status', label: 'Statut juridique du propriétaire', section: 'Général',
    input: 'select', picklistKey: 'picklist_legal_status',
  },
  { field: 'current_owner_since', label: 'Propriétaire depuis', section: 'Général', input: 'date' },
  { field: 'is_title_in_current_owner_name', label: 'Titre au nom du propriétaire actuel', section: 'Général', input: 'boolean' },
  { field: 'whatsapp_number', label: 'Numéro WhatsApp', section: 'Général', input: 'text', maxLength: 30 },

  // --- Localisation ---
  { field: 'area_sqm', label: 'Superficie', section: 'Localisation', input: 'number', unit: 'm²', min: 1, step: 0.01 },
  { field: 'province', label: 'Province', section: 'Localisation', input: 'text', maxLength: 80 },
  { field: 'land_district', label: 'Circonscription foncière', section: 'Localisation', input: 'text', maxLength: 120 },
  { field: 'ville', label: 'Ville', section: 'Localisation', input: 'text', maxLength: 80 },
  { field: 'commune', label: 'Commune', section: 'Localisation', input: 'text', maxLength: 80 },
  { field: 'quartier', label: 'Quartier', section: 'Localisation', input: 'text', maxLength: 80 },
  { field: 'avenue', label: 'Avenue', section: 'Localisation', input: 'text', maxLength: 120 },
  { field: 'house_number', label: 'Numéro de la maison', section: 'Localisation', input: 'text', maxLength: 20 },
  { field: 'territoire', label: 'Territoire', section: 'Localisation', input: 'text', maxLength: 80 },
  { field: 'collectivite', label: 'Collectivité', section: 'Localisation', input: 'text', maxLength: 80 },
  { field: 'groupement', label: 'Groupement', section: 'Localisation', input: 'text', maxLength: 80 },
  { field: 'village', label: 'Village', section: 'Localisation', input: 'text', maxLength: 80 },

  // --- Construction ---
  {
    field: 'construction_type', label: 'Type de construction', section: 'Construction',
    input: 'select', picklistKey: 'picklist_construction_type',
    invalidates: ['construction_nature', 'construction_materials', 'standing', 'declared_usage'],
  },
  {
    field: 'construction_nature', label: 'Nature de la construction', section: 'Construction',
    input: 'select', dependentPicklistKey: 'picklist_construction_nature', dependsOn: 'construction_type',
    invalidates: ['construction_materials', 'standing', 'declared_usage'],
  },
  {
    field: 'construction_materials', label: 'Matériaux de construction', section: 'Construction',
    input: 'select', dependentPicklistKey: 'picklist_construction_materials', dependsOn: 'construction_nature',
  },
  {
    field: 'standing', label: 'Standing / niveau de finition', section: 'Construction',
    input: 'select', dependentPicklistKey: 'picklist_standing', dependsOn: 'construction_nature',
  },
  {
    field: 'declared_usage', label: 'Usage déclaré', section: 'Construction',
    input: 'select', dependsOn: 'construction_nature',
  },
  { field: 'actual_usage', label: 'Usage réel', section: 'Construction', input: 'text', maxLength: 120 },
  { field: 'actual_usage_other', label: 'Usage réel (précision)', section: 'Construction', input: 'text', maxLength: 150 },
  { field: 'construction_year', label: 'Année de construction', section: 'Construction', input: 'number', min: 1850, max: new Date().getFullYear(), step: 1 },
  {
    field: 'construction_status', label: 'État de la construction', section: 'Construction',
    input: 'select', picklistKey: '__construction_status',
  },
  { field: 'building_height', label: 'Hauteur du bâtiment', section: 'Construction', input: 'number', unit: 'm', min: 0, step: 0.1 },
  { field: 'floor_number', label: "Nombre d'étages", section: 'Construction', input: 'text', maxLength: 20 },
  { field: 'property_category', label: 'Catégorie du bien', section: 'Construction', input: 'text', maxLength: 80 },
  { field: 'apartment_number', label: "Numéro de l'appartement", section: 'Construction', input: 'text', maxLength: 20 },
  { field: 'apartment_orientation', label: "Orientation de l'appartement", section: 'Construction', input: 'text', maxLength: 40 },
  { field: 'apartment_length', label: "Longueur de l'appartement", section: 'Construction', input: 'number', unit: 'm', min: 0, step: 0.1 },
  { field: 'apartment_width', label: "Largeur de l'appartement", section: 'Construction', input: 'number', unit: 'm', min: 0, step: 0.1 },
  { field: 'apartment_height', label: "Hauteur de l'appartement", section: 'Construction', input: 'number', unit: 'm', min: 0, step: 0.1 },

  // --- Location / occupation ---
  { field: 'is_rented', label: 'Bien mis en location', section: 'Location', input: 'boolean', invalidates: [] },
  { field: 'is_occupied', label: 'Bien occupé', section: 'Location', input: 'boolean' },
  { field: 'rental_configuration', label: 'Configuration locative', section: 'Location', input: 'text', maxLength: 60 },
  { field: 'rental_units_count', label: 'Nombre de locaux loués', section: 'Location', input: 'number', min: 0, max: 500, step: 1 },
  { field: 'monthly_rent_usd', label: 'Loyer mensuel (USD)', section: 'Location', input: 'number', min: 0, step: 1 },
  { field: 'rental_start_date', label: 'Début de la location', section: 'Location', input: 'date' },
  { field: 'hosting_capacity', label: "Capacité d'accueil", section: 'Location', input: 'number', min: 0, step: 1 },
  { field: 'occupant_count', label: "Nombre d'occupants", section: 'Location', input: 'number', min: 0, step: 1 },
  { field: 'operational_capacity', label: 'Capacité opérationnelle', section: 'Location', input: 'number', min: 0, step: 1 },
  { field: 'operational_capacity_unit', label: 'Unité de capacité opérationnelle', section: 'Location', input: 'text', maxLength: 40 },
  { field: 'sound_environment', label: 'Environnement sonore', section: 'Location', input: 'text', maxLength: 80 },
  { field: 'nearby_noise_sources', label: 'Sources de bruit à proximité', section: 'Location', input: 'text', maxLength: 200 },

  // --- Valeur marchande ---
  { field: 'resale_price_amount', label: 'Prix de revente déclaré', section: 'Valeur marchande', input: 'number', min: 0, step: 1 },
  {
    field: 'resale_price_currency', label: 'Devise du prix de revente', section: 'Valeur marchande',
    input: 'select', picklistKey: '__currency',
  },
  { field: 'would_sell_if_offered', label: 'Vendrait si une offre arrivait', section: 'Valeur marchande', input: 'boolean' },
  { field: 'has_recent_appraisal', label: 'Expertise récente disponible', section: 'Valeur marchande', input: 'boolean' },
  { field: 'appraisal_date', label: "Date de l'expertise", section: 'Valeur marchande', input: 'date' },
  { field: 'appraiser_name', label: "Nom de l'expert", section: 'Valeur marchande', input: 'text', maxLength: 150 },
  { field: 'appraised_value_amount', label: 'Valeur expertisée', section: 'Valeur marchande', input: 'number', min: 0, step: 1 },
  {
    field: 'appraised_value_currency', label: 'Devise de la valeur expertisée', section: 'Valeur marchande',
    input: 'select', picklistKey: '__currency',
  },
  { field: 'previous_permit_number', label: "Numéro d'autorisation précédente", section: 'Construction', input: 'text', maxLength: 80 },
];

/** Listes locales pour les champs sans picklist configurable en base. */
export const CCC_LOCAL_OPTIONS: Record<string, { value: string; label: string }[]> = {
  __construction_status: [
    { value: 'completed', label: 'Construction achevée' },
    { value: 'in_progress', label: 'Construction en cours' },
  ],
  __currency: [
    { value: 'USD', label: 'USD' },
    { value: 'CDF', label: 'CDF' },
  ],
};

export const CCC_FIELD_SECTIONS: CCCFieldSection[] = [
  'Général', 'Localisation', 'Construction', 'Location', 'Valeur marchande',
];

const BY_FIELD = new Map(CCC_EDITABLE_FIELDS.map((f) => [f.field, f]));

export const getEditableField = (field: string): CCCEditableField | undefined => BY_FIELD.get(field);

export const isEditableField = (field: string): boolean => BY_FIELD.has(field);

/** Valeur brute d'une contribution ramenée à une chaîne utilisable en saisie. */
export function toInputValue(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'boolean') return raw ? 'true' : 'false';
  if (typeof raw === 'string' && raw.includes('T') && /^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    return raw.slice(0, 10);
  }
  return String(raw);
}

/** Affichage lisible d'une valeur (récapitulatif avant / après). */
export function formatFieldValue(field: CCCEditableField, value: string): string {
  if (value === '' ) return 'Non renseigné';
  if (field.input === 'boolean') return value === 'true' ? 'Oui' : 'Non';
  const local = CCC_LOCAL_OPTIONS[field.picklistKey ?? ''];
  const match = local?.find((o) => o.value === value);
  if (match) return match.label;
  return field.unit ? `${value} ${field.unit}` : value;
}

/**
 * Champs devenus incohérents après modification d'un champ parent.
 * Ne retourne que ceux qui portent réellement une valeur sur la contribution.
 */
export function collectInvalidatedFields(
  changedField: string,
  currentValues: Record<string, unknown>,
): string[] {
  const def = BY_FIELD.get(changedField);
  if (!def?.invalidates?.length) return [];
  return def.invalidates.filter((f) => {
    const v = currentValues[f];
    return v !== null && v !== undefined && v !== '';
  });
}

/** Validation locale d'une saisie, alignée sur les contraintes du formulaire. */
export function validateFieldValue(field: CCCEditableField, value: string): string | null {
  if (value === '') return null; // effacement autorisé
  if (field.input === 'number') {
    const n = Number(value);
    if (!Number.isFinite(n)) return 'Valeur numérique attendue';
    if (field.min !== undefined && n < field.min) return `Minimum : ${field.min}`;
    if (field.max !== undefined && n > field.max) return `Maximum : ${field.max}`;
  }
  if (field.input === 'date' && Number.isNaN(Date.parse(value))) return 'Date invalide';
  if (field.maxLength && value.length > field.maxLength) return `Maximum ${field.maxLength} caractères`;
  return null;
}
