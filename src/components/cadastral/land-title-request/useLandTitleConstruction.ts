import { useEffect, useRef, useState } from 'react';
import { useCCCFormPicklists } from '@/hooks/useCCCFormPicklists';
import { CATEGORY_TO_CONSTRUCTION_TYPES, MATERIAL_TO_NATURE } from './constants';

/**
 * État « construction » du formulaire titre foncier et cascades alignées sur le CCC :
 * catégorie → type → nature → usage, matériaux → nature.
 * `skipCascadeRef` suspend les cascades lors d'un préremplissage groupé.
 */
export const useLandTitleConstruction = () => {
  const skipCascadeRef = useRef(false);
  const { getDependentOptions } = useCCCFormPicklists();
  const [propertyCategory, setPropertyCategory] = useState('');
  const [constructionType, setConstructionType] = useState('');
  const [constructionNature, setConstructionNature] = useState('');
  const [constructionMaterials, setConstructionMaterials] = useState('');
  const [declaredUsage, setDeclaredUsage] = useState('');
  const [standing, setStanding] = useState('');
  const [constructionYear, setConstructionYear] = useState('');
  const [floorNumber, setFloorNumber] = useState('');
  const [availableConstructionTypes, setAvailableConstructionTypes] = useState<string[]>([]);
  const [availableConstructionNatures, setAvailableConstructionNatures] = useState<string[]>([]);
  const [availableDeclaredUsages, setAvailableDeclaredUsages] = useState<string[]>([]);

  useEffect(() => {
    if (skipCascadeRef.current) return;
    if (!propertyCategory) {
      setAvailableConstructionTypes([]);
      setConstructionType('');
      return;
    }
    const allowedTypes = (CATEGORY_TO_CONSTRUCTION_TYPES as Record<string, string[]>)[propertyCategory] || [];
    setAvailableConstructionTypes(allowedTypes);
    if (allowedTypes.length === 1) {
      setConstructionType(prev => (prev !== allowedTypes[0] ? allowedTypes[0] : prev));
    } else {
      setConstructionType(prev => (prev && !allowedTypes.includes(prev) ? '' : prev));
    }
  }, [propertyCategory]);

  useEffect(() => {
    if (skipCascadeRef.current) return;
    if (!constructionType) {
      setAvailableConstructionNatures([]);
      setConstructionNature('');
      setAvailableDeclaredUsages([]);
      setDeclaredUsage('');
      return;
    }
    const natures: string[] = getDependentOptions('picklist_construction_nature')[constructionType] ?? [];
    setAvailableConstructionNatures(natures);
    setConstructionNature(prev => (prev && !natures.includes(prev) ? '' : prev));
  }, [constructionType, getDependentOptions]);

  useEffect(() => {
    const determined = MATERIAL_TO_NATURE[constructionMaterials];
    if (determined && availableConstructionNatures.includes(determined)) {
      setConstructionNature(prev => (prev !== determined ? determined : prev));
    }
  }, [constructionMaterials, availableConstructionNatures]);

  useEffect(() => {
    if (skipCascadeRef.current) return;
    if (!constructionType || !constructionNature) {
      setAvailableDeclaredUsages([]);
      setDeclaredUsage('');
      return;
    }
    const usageMap = getDependentOptions('picklist_declared_usage');
    const usages: string[] = [...(usageMap[`${constructionType}_${constructionNature}`] ?? usageMap[constructionNature] ?? [])];
    setAvailableDeclaredUsages(usages);
    setDeclaredUsage(prev => (prev && !usages.includes(prev) ? '' : prev));
  }, [constructionType, constructionNature, getDependentOptions]);

  return {
    skipCascadeRef,
    propertyCategory, setPropertyCategory, constructionType, setConstructionType,
    constructionNature, setConstructionNature, constructionMaterials, setConstructionMaterials,
    declaredUsage, setDeclaredUsage, standing, setStanding, constructionYear, setConstructionYear,
    floorNumber, setFloorNumber, availableConstructionTypes, availableConstructionNatures, availableDeclaredUsages,
  };
};
