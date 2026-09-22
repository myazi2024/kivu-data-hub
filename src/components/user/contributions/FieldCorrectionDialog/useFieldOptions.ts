import { useCallback } from 'react';
import { useCCCFormPicklists } from '@/hooks/useCCCFormPicklists';
import { resolveAvailableUsages } from '@/utils/constructionUsageResolver';
import { CCC_LOCAL_OPTIONS, type CCCEditableField } from '@/lib/ccc/editableFieldsCatalog';

export interface FieldOption { value: string; label: string }

/**
 * Résout les options d'une donnée en réutilisant les mêmes listes et cascades
 * que le formulaire CCC (aucune règle dupliquée ici).
 */
export function useFieldOptions() {
  const { loading, getOptions, getDependentOptions } = useCCCFormPicklists();

  const optionsFor = useCallback(
    (field: CCCEditableField, effectiveValues: Record<string, string>): FieldOption[] => {
      if (field.picklistKey?.startsWith('__')) {
        return CCC_LOCAL_OPTIONS[field.picklistKey] ?? [];
      }
      if (field.field === 'declared_usage') {
        const usages = resolveAvailableUsages(
          effectiveValues.construction_type ?? '',
          effectiveValues.construction_nature ?? '',
          getDependentOptions,
        );
        return usages.map((v) => ({ value: v, label: v }));
      }
      if (field.dependentPicklistKey && field.dependsOn) {
        const map = getDependentOptions(field.dependentPicklistKey);
        const parent = effectiveValues[field.dependsOn] ?? '';
        return (map[parent] ?? []).map((v) => ({ value: v, label: v }));
      }
      if (field.picklistKey) {
        return getOptions(field.picklistKey).map((v) => ({ value: v, label: v }));
      }
      return [];
    },
    [getOptions, getDependentOptions],
  );

  return { loading, optionsFor };
}
