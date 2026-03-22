/**
 * Shared utility for computing available declared usages based on
 * construction type and nature. Used by both the main CCC form and
 * AdditionalConstructionBlock to guarantee identical results.
 */

const LOCATION_ELIGIBLE_KEYS = new Set([
  'Résidentielle_Durable',
  'Résidentielle_Semi-durable',
  'Commerciale_Durable',
  'Commerciale_Semi-durable',
  'Industrielle_Durable',
  'Industrielle_Semi-durable',
]);

export function resolveAvailableUsages(
  constructionType: string,
  constructionNature: string,
  getPicklistDependentOptions: (key: string) => Record<string, string[]>,
): string[] {
  if (!constructionType || !constructionNature) return [];

  const usageMap = getPicklistDependentOptions('picklist_declared_usage');
  const specificKey = `${constructionType}_${constructionNature}`;
  const usages = [...(usageMap[specificKey] || usageMap[constructionNature] || [])];

  // Inject 'Location' for eligible type+nature combinations
  if (LOCATION_ELIGIBLE_KEYS.has(specificKey) && !usages.includes('Location')) {
    usages.push('Location');
  }

  return usages;
}
