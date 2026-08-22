/**
 * Shared utility for computing available declared usages based on
 * construction type and nature. Used by both the main CCC form and
 * AdditionalConstructionBlock to guarantee identical results.
 *
 * NOTE : « Location » n'est plus un usage. La mise en location est un
 * indicateur booléen distinct (voir `src/utils/rentalStatus.ts`).
 */

export { isRentalEligible } from './rentalStatus';

export function resolveAvailableUsages(
  constructionType: string,
  constructionNature: string,
  getPicklistDependentOptions: (key: string) => Record<string, string[]>,
): string[] {
  if (!constructionType || !constructionNature) return [];

  const usageMap = getPicklistDependentOptions('picklist_declared_usage');
  const specificKey = `${constructionType}_${constructionNature}`;
  const usages = [...(usageMap[specificKey] || usageMap[constructionNature] || [])];

  // « Location » est désormais géré par la question dédiée « Ce bien est-il mis en location ? »
  return usages.filter((u) => u !== 'Location');
}
