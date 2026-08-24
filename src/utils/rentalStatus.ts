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
 * Combinaisons type + nature pour lesquelles la question
 * « Ce bien est-il mis en location ? » a du sens.
 */
const RENTAL_ELIGIBLE_KEYS = new Set([
  'Résidentielle_Durable',
  'Résidentielle_Semi-durable',
  'Commerciale_Durable',
  'Commerciale_Semi-durable',
  'Industrielle_Durable',
  'Industrielle_Semi-durable',
  // Biens non bâtis pouvant être loués (parking, terrain agricole)
  'Terrain nu_Non bâti',
  'Agricole_Non bâti',
]);


export function isRentalEligible(
  constructionType?: string | null,
  constructionNature?: string | null,
): boolean {
  if (!constructionType || !constructionNature) return false;
  return RENTAL_ELIGIBLE_KEYS.has(`${constructionType}_${constructionNature}`);
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
