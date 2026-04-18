import { useCallback, useEffect } from 'react';
import { resolveAvailableUsages } from '@/utils/constructionUsageResolver';
import type { CadastralContributionData } from '@/hooks/useCadastralContribution';

const MATERIALS_BY_NATURE_FALLBACK: Record<string, string[]> = {
  Durable: ['Béton armé', 'Briques cuites', 'Parpaings', 'Pierre naturelle'],
  'Semi-durable': ['Semi-dur', 'Briques adobes', 'Bois', 'Mixte'],
  Précaire: ['Tôles', 'Bois', 'Paille', 'Autre'],
};

const STANDING_BY_NATURE_FALLBACK: Record<string, string[]> = {
  Durable: ['Haut standing', 'Moyen standing', 'Économique'],
  'Semi-durable': ['Moyen standing', 'Économique'],
  Précaire: ['Économique'],
};

interface Params {
  formData: CadastralContributionData;
  handleInputChange: (field: keyof CadastralContributionData, value: any) => void;
  getPicklistDependentOptions: (key: string) => Record<string, string[]>;
  categoryToConstructionTypes: Record<string, string[]>;
  setAvailableConstructionTypes: (v: string[]) => void;
  setAvailableConstructionNatures: (v: string[]) => void;
  setAvailableConstructionMaterials: (v: string[]) => void;
  setAvailableDeclaredUsages: (v: string[]) => void;
  setAvailableStandings: (v: string[]) => void;
}

/**
 * Construction cascade: PropertyCategory → Type → (Natures + Materials) → Usage / Standing.
 * Auto-fills nature from material via reverse map.
 */
export function useConstructionCascade({
  formData,
  handleInputChange,
  getPicklistDependentOptions,
  categoryToConstructionTypes,
  setAvailableConstructionTypes,
  setAvailableConstructionNatures,
  setAvailableConstructionMaterials,
  setAvailableDeclaredUsages,
  setAvailableStandings,
}: Params): void {
  // Helper: build reverse mapping material -> nature
  const buildMaterialToNatureMap = useCallback(
    (materialsMap: Record<string, string[]>): Record<string, string> => {
      const reverseMap: Record<string, string> = {};
      for (const [nature, materials] of Object.entries(materialsMap)) {
        for (const mat of materials) {
          if (!reverseMap[mat]) reverseMap[mat] = nature;
        }
      }
      return reverseMap;
    },
    [],
  );

  // PropertyCategory → ConstructionType
  useEffect(() => {
    if (!formData.propertyCategory) {
      setAvailableConstructionTypes([]);
      handleInputChange('constructionType', undefined);
      return;
    }
    const allowedTypes = categoryToConstructionTypes[formData.propertyCategory] || [];
    setAvailableConstructionTypes(allowedTypes);
    if (allowedTypes.length === 1) {
      if (formData.constructionType !== allowedTypes[0]) handleInputChange('constructionType', allowedTypes[0]);
    } else if (formData.constructionType && !allowedTypes.includes(formData.constructionType)) {
      handleInputChange('constructionType', undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.propertyCategory]);

  // ConstructionType → Natures + Materials (and reset downstream)
  useEffect(() => {
    if (!formData.constructionType) {
      setAvailableConstructionNatures([]);
      handleInputChange('constructionNature', undefined);
      setAvailableDeclaredUsages([]);
      handleInputChange('declaredUsage', undefined);
      setAvailableConstructionMaterials([]);
      handleInputChange('constructionMaterials', undefined);
      setAvailableStandings([]);
      handleInputChange('standing', undefined);
      return;
    }
    const natureMap = getPicklistDependentOptions('picklist_construction_nature');
    const natures = natureMap[formData.constructionType] || [];
    setAvailableConstructionNatures(natures);

    const dbMaterialsMap = getPicklistDependentOptions('picklist_construction_materials');
    const hasMaterialsInDb = Object.keys(dbMaterialsMap).length > 0;
    const allMaterials: string[] = [];
    const seen = new Set<string>();
    for (const nature of natures) {
      if (nature === 'Non bâti') continue;
      const mats = hasMaterialsInDb
        ? (dbMaterialsMap[nature] || [])
        : (MATERIALS_BY_NATURE_FALLBACK[nature] || []);
      for (const m of mats) {
        if (!seen.has(m)) {
          seen.add(m);
          allMaterials.push(m);
        }
      }
    }
    setAvailableConstructionMaterials(allMaterials);

    if (formData.constructionMaterials && !allMaterials.includes(formData.constructionMaterials)) {
      handleInputChange('constructionMaterials', undefined);
      handleInputChange('constructionNature', undefined);
    }
    if (formData.constructionNature && !natures.includes(formData.constructionNature)) {
      handleInputChange('constructionNature', undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.constructionType, getPicklistDependentOptions]);

  // Materials → auto-fill Nature via reverse lookup
  useEffect(() => {
    if (!formData.constructionMaterials || !formData.constructionType) {
      if (!formData.constructionMaterials) {
        handleInputChange('constructionNature', undefined);
        setAvailableStandings([]);
        handleInputChange('standing', undefined);
      }
      return;
    }
    const dbMaterialsMap = getPicklistDependentOptions('picklist_construction_materials');
    const hasMaterialsInDb = Object.keys(dbMaterialsMap).length > 0;
    const materialsMap = hasMaterialsInDb ? dbMaterialsMap : MATERIALS_BY_NATURE_FALLBACK;
    const reverseMap = buildMaterialToNatureMap(materialsMap);
    const deducedNature = reverseMap[formData.constructionMaterials];
    if (deducedNature && deducedNature !== formData.constructionNature) {
      handleInputChange('constructionNature', deducedNature);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.constructionMaterials, formData.constructionType, getPicklistDependentOptions, buildMaterialToNatureMap]);

  // Type + Nature → Declared usages (shared resolver)
  useEffect(() => {
    if (!formData.constructionType || !formData.constructionNature) {
      setAvailableDeclaredUsages([]);
      handleInputChange('declaredUsage', undefined);
      return;
    }
    const usages = resolveAvailableUsages(
      formData.constructionType,
      formData.constructionNature,
      getPicklistDependentOptions,
    );
    setAvailableDeclaredUsages(usages);
    if (formData.declaredUsage && !usages.includes(formData.declaredUsage)) {
      handleInputChange('declaredUsage', undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.constructionType, formData.constructionNature, getPicklistDependentOptions]);

  // Nature → Standing
  useEffect(() => {
    if (!formData.constructionNature || formData.constructionNature === 'Non bâti') {
      setAvailableStandings([]);
      handleInputChange('standing', undefined);
      return;
    }
    const dbStandingMap = getPicklistDependentOptions('picklist_standing');
    const standings =
      (Object.keys(dbStandingMap).length > 0
        ? dbStandingMap[formData.constructionNature]
        : STANDING_BY_NATURE_FALLBACK[formData.constructionNature]) || [];
    setAvailableStandings(standings);
    if (formData.standing && !standings.includes(formData.standing)) {
      handleInputChange('standing', undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.constructionNature, getPicklistDependentOptions]);
}
