/**
 * Source unique de vérité pour savoir si une construction (principale ou
 * supplémentaire) est mise en location.
 *
 * Depuis la refonte, « Location » n'est plus une valeur du picklist « Usage » :
 * c'est un indicateur booléen distinct (`isRented` / `is_rented`), l'usage réel
 * (Habitation, Commerce, Bureau…) restant obligatoire.
 *
 * Les enregistrements historiques non migrés portent encore
 * `declaredUsage === 'Location'` : ils sont traités comme « en location ».
 */
export interface RentedLike {
  isRented?: boolean | null;
  is_rented?: boolean | null;
  declaredUsage?: string | null;
  declared_usage?: string | null;
}

export function isConstructionRented(c: RentedLike | null | undefined): boolean {
  if (!c) return false;
  if (c.isRented === true || c.is_rented === true) return true;
  return c.declaredUsage === 'Location' || c.declared_usage === 'Location';
}

/**
 * Types de construction pour lesquels la question
 * « Ce bien est-il mis en location ? » a du sens.
 *
 * L'éligibilité dépend du type de construction seul, jamais de la nature :
 * la logique locative est identique pour toutes les valeurs du picklist
 * « Matériaux » (Durable, Semi-durable ou Précaire).
 */
const RENTAL_ELIGIBLE_TYPES = new Set([
  'Résidentielle',
  'Commerciale',
  'Industrielle',
]);

/** Biens non bâtis pouvant être loués (parking, terrain agricole). */
const RENTAL_ELIGIBLE_UNBUILT_TYPES = new Set([
  'Terrain nu',
  'Agricole',
]);

export function isRentalEligible(
  constructionType?: string | null,
  constructionNature?: string | null,
): boolean {
  if (!constructionType || !constructionNature) return false;
  if (RENTAL_ELIGIBLE_TYPES.has(constructionType)) return true;
  return (
    constructionNature === 'Non bâti' &&
    RENTAL_ELIGIBLE_UNBUILT_TYPES.has(constructionType)
  );
}

/**
 * Catégories de bien louées individuellement comme une construction unique
 * à un seul locataire. Pour ces catégories, la question
 * « Comment ce bien est-il mis en location ? » (mono/multi) n'a pas de sens :
 * le mode est implicitement « un seul local ».
 */
const SINGLE_UNIT_RENTAL_CATEGORIES = new Set([
  'Appartement',
  'Local commercial',
  'Entrepôt/Hangar',
]);

export function isSingleUnitRentalCategory(propertyCategory?: string | null): boolean {
  if (!propertyCategory) return false;
  return SINGLE_UNIT_RENTAL_CATEGORIES.has(propertyCategory.trim());
}

/**
 * Catégories de bien non conçues pour loger des personnes (Local commercial,
 * Entrepôt/Hangar). Pour ces catégories, la « Capacité d'accueil » et les
 * indicateurs d'occupation (habitants, occupants) ne sont pas pertinents :
 * leur collecte biaiserait les statistiques de densité / taux d'occupation
 * calculées dans Analytics. Les champs correspondants sont masqués et
 * exemptés de la validation.
 */
const NON_RESIDENTIAL_CATEGORIES = new Set([
  'Local commercial',
  'Entrepôt/Hangar',
]);

export function isNonResidentialCategory(propertyCategory?: string | null): boolean {
  if (!propertyCategory) return false;
  return NON_RESIDENTIAL_CATEGORIES.has(propertyCategory.trim());
}

/** Usage réel déduit du type de construction (migration des anciennes valeurs « Location »). */
export function deduceRealUsage(constructionType?: string | null): string {
  switch (constructionType) {
    case 'Commerciale':
      return 'Commerce';
    case 'Industrielle':
      return 'Industrie';
    case 'Agricole':
      return 'Agriculture';
    default:
      return 'Habitation';
  }
}

/**
 * Local d'un bien « divisé en plusieurs locaux » occupé par le propriétaire
 * (bailleur) : aucun loyer, date de mise en location ni contrat ne s'applique.
 * Accepte les clés camelCase (formulaire) et snake_case (base).
 */
export function isOwnerOccupiedUnit(u: any): boolean {
  if (!u || typeof u !== 'object') return false;
  const occupied = u.isOccupied ?? u.is_occupied;
  const by = u.occupiedBy ?? u.occupied_by;
  return occupied === true && by === 'owner';
}

/**
 * Convertit un local enregistré (clés snake_case en base, camelCase pour les
 * brouillons et constructions additionnelles) vers la forme du formulaire.
 */
export function normalizeRentalUnitFromDb(u: any): any {
  if (!u || typeof u !== 'object') return u;
  const pick = (camel: string, snake: string) => (u[camel] !== undefined && u[camel] !== null ? u[camel] : u[snake] ?? undefined);
  const numOrUndef = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : Number(v));
  const by = pick('occupiedBy', 'occupied_by');
  return {
    label: pick('label', 'label') ?? undefined,
    monthlyRentUsd: numOrUndef(pick('monthlyRentUsd', 'monthly_rent_usd')),
    isOccupied: pick('isOccupied', 'is_occupied'),
    occupiedBy: by === 'owner' || by === 'tenant' ? by : undefined,
    occupantCount: numOrUndef(pick('occupantCount', 'occupant_count')),
    hostingCapacity: numOrUndef(pick('hostingCapacity', 'hosting_capacity')),
    actualUsage: pick('actualUsage', 'actual_usage'),
    actualUsageOther: pick('actualUsageOther', 'actual_usage_other'),
    operationalCapacity: numOrUndef(pick('operationalCapacity', 'operational_capacity')),
    operationalCapacityUnit: pick('operationalCapacityUnit', 'operational_capacity_unit'),
    leaseContractUrl: pick('leaseContractUrl', 'lease_contract_url'),
    rentalStartDate: pick('rentalStartDate', 'rental_start_date'),
    floor: pick('floor', 'floor'),
  };
}

/**
 * Construction en location produisant un loyer : exclut le cas « plusieurs
 * locaux » où tous les locaux sont occupés par le propriétaire.
 */
export function hasTenantRentalIncome(c: any): boolean {
  if (!isConstructionRented(c)) return false;
  const config = c?.rentalConfiguration ?? c?.rental_configuration;
  const units = c?.rentalUnits ?? c?.rental_units;
  if (config === 'multi' && Array.isArray(units) && units.length > 0) {
    return units.some((u: any) => !isOwnerOccupiedUnit(u));
  }
  return true;
}
