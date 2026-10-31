import { isUnbuiltLand } from '@/utils/cccPredicates';
import { useEffect } from 'react';
import { getCategoriesForConstructionType } from '@/lib/ccc/propertyCategories';
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
 * Cascade construction : Type → Catégorie de bien ; Type → Nature → Matériaux ; Type + Nature → Usage ; Nature → Standing.
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
  // Types proposés : tous (le type vient en premier).
  useEffect(() => {
    setAvailableConstructionTypes(Array.from(new Set(Object.values(categoryToConstructionTypes).flat())));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ConstructionType → Catégorie de bien + Natures (et purge des valeurs incompatibles)
  useEffect(() => {
    if (!formData.constructionType) {
      setAvailableConstructionNatures([]);
      handleInputChange('constructionNature', undefined);
      setAvailableConstructionMaterials([]);
      handleInputChange('constructionMaterials', undefined);
      return;
    }
    const categories = getCategoriesForConstructionType(formData.constructionType);
    if (categories.length === 1) {
      if (formData.propertyCategory !== categories[0]) handleInputChange('propertyCategory', categories[0]);
    } else if (formData.propertyCategory && !categories.includes(formData.propertyCategory)) {
      handleInputChange('propertyCategory', undefined);
    }

    const natureMap = getPicklistDependentOptions('picklist_construction_nature');
    const natures = natureMap[formData.constructionType] || [];
    setAvailableConstructionNatures(natures);
    if (natures.length === 1) {
      if (formData.constructionNature !== natures[0]) handleInputChange('constructionNature', natures[0]);
    } else if (formData.constructionNature && !natures.includes(formData.constructionNature)) {
      handleInputChange('constructionNature', undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.constructionType, getPicklistDependentOptions]);

  // Nature → Matériaux
  useEffect(() => {
    if (!formData.constructionNature || formData.constructionNature === 'Non bâti') {
      setAvailableConstructionMaterials([]);
      if (formData.constructionMaterials) handleInputChange('constructionMaterials', undefined);
      return;
    }
    const dbMaterialsMap = getPicklistDependentOptions('picklist_construction_materials');
    const hasMaterialsInDb = Object.keys(dbMaterialsMap).length > 0;
    const mats = (hasMaterialsInDb
      ? dbMaterialsMap[formData.constructionNature]
      : MATERIALS_BY_NATURE_FALLBACK[formData.constructionNature]) || [];
    setAvailableConstructionMaterials(mats);
    if (formData.constructionMaterials && !mats.includes(formData.constructionMaterials)) {
      handleInputChange('constructionMaterials', undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.constructionNature, getPicklistDependentOptions]);

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
    // Auto-select when only one usage is available
    if (usages.length === 1 && formData.declaredUsage !== usages[0]) {
      handleInputChange('declaredUsage', usages[0]);
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

  // Terrain non bâti → purge des données de construction devenues sans objet
  // (année de construction et matériaux restaient sinon dans la charge utile).
  useEffect(() => {
    if (!isUnbuiltLand(formData)) return;
    if (formData.constructionYear) handleInputChange('constructionYear', undefined);
    if (formData.constructionMaterials) handleInputChange('constructionMaterials', undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.propertyCategory, formData.constructionType, formData.constructionNature, formData.constructionYear, formData.constructionMaterials]);
}
