import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCallback, useState } from 'react';
import { useConstructionCascade } from '@/hooks/ccc/useConstructionCascade';
import type { CadastralContributionData } from '@/hooks/useCadastralContribution';

const CATEGORY_TO_CONSTRUCTION_TYPES: Record<string, string[]> = {
  Appartement: ['Résidentielle'],
  Villa: ['Résidentielle'],
  Maison: ['Résidentielle'],
  'Local commercial': ['Commerciale'],
  'Immeuble/Bâtiment': ['Résidentielle', 'Commerciale', 'Industrielle'],
  'Entrepôt/Hangar': ['Industrielle', 'Agricole'],
  'Terrain nu': ['Terrain nu'],
};

const PICKLISTS: Record<string, Record<string, string[]>> = {
  picklist_construction_nature: {
    Résidentielle: ['Durable', 'Semi-durable', 'Précaire'],
    Commerciale: ['Durable', 'Semi-durable'],
    Industrielle: ['Durable'],
    Agricole: ['Durable', 'Non bâti'],
    'Terrain nu': ['Non bâti'],
  },
  picklist_construction_materials: {
    Durable: ['Béton armé', 'Briques cuites'],
    'Semi-durable': ['Semi-dur', 'Bois'],
    Précaire: ['Tôles', 'Paille'],
  },
  picklist_declared_usage: {
    Résidentielle_Durable: ['Habitation', 'Bureau'],
    'Résidentielle_Semi-durable': ['Habitation'],
    Commerciale_Durable: ['Commerce', 'Bureau'],
    Industrielle_Durable: ['Industrie'],
    Agricole_Durable: ['Agriculture'],
    'Terrain nu_Non bâti': ['Parking', "Espace d'entreposage", 'Aucun'],
    'Agricole_Non bâti': ['Agriculture'],
  },
  picklist_standing: {
    Durable: ['Haut standing', 'Moyen standing'],
    'Semi-durable': ['Moyen standing'],
    Précaire: ['Économique'],
  },
};

/** Harnais : reproduit le couplage formData ↔ handleInputChange de useCCCFormState. */
function useCascadeHarness(initial: Partial<CadastralContributionData>) {
  const [formData, setFormData] = useState<CadastralContributionData>(initial as CadastralContributionData);
  const [types, setTypes] = useState<string[]>([]);
  const [natures, setNatures] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [usages, setUsages] = useState<string[]>([]);
  const [standings, setStandings] = useState<string[]>([]);

  const handleInputChange = useCallback((field: keyof CadastralContributionData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const getPicklistDependentOptions = useCallback(
    (key: string) => PICKLISTS[key] || {},
    [],
  );

  useConstructionCascade({
    formData,
    handleInputChange,
    getPicklistDependentOptions,
    categoryToConstructionTypes: CATEGORY_TO_CONSTRUCTION_TYPES,
    setAvailableConstructionTypes: setTypes,
    setAvailableConstructionNatures: setNatures,
    setAvailableConstructionMaterials: setMaterials,
    setAvailableDeclaredUsages: setUsages,
    setAvailableStandings: setStandings,
  });

  return { formData, handleInputChange, types, natures, materials, usages, standings };
}

const renderCascade = (initial: Partial<CadastralContributionData>) =>
  renderHook(() => useCascadeHarness(initial));

describe('useConstructionCascade — Type → Catégorie', () => {
  it('propose tous les types', () => {
    const { result } = renderCascade({});
    expect(result.current.types).toEqual(['Résidentielle', 'Commerciale', 'Industrielle', 'Agricole', 'Terrain nu']);
  });
  it('Agricole fixe la catégorie quand une seule est compatible', () => {
    const { result } = renderCascade({ constructionType: 'Agricole' });
    expect(result.current.formData.propertyCategory).toBe('Entrepôt/Hangar');
  });
  it('purge une catégorie incompatible avec le type', () => {
    const { result } = renderCascade({ propertyCategory: 'Villa', constructionType: 'Industrielle' });
    expect(result.current.formData.propertyCategory).toBeUndefined();
  });
});

describe('useConstructionCascade — Nature → Matériaux', () => {
  it('les matériaux suivent la nature choisie', () => {
    const { result } = renderCascade({ constructionType: 'Résidentielle' });
    expect(result.current.natures).toEqual(['Durable', 'Semi-durable', 'Précaire']);
    act(() => result.current.handleInputChange('constructionNature', 'Précaire'));
    expect(result.current.materials).toEqual(['Tôles', 'Paille']);
  });
  it('changer de nature purge un matériau devenu invalide', () => {
    const { result } = renderCascade({ constructionType: 'Résidentielle', constructionNature: 'Durable', constructionMaterials: 'Béton armé' });
    act(() => result.current.handleInputChange('constructionNature', 'Précaire'));
    expect(result.current.formData.constructionMaterials).toBeUndefined();
  });
  it('Terrain nu : nature « Non bâti », aucun matériau, usages spécifiques', () => {
    const { result } = renderCascade({ constructionType: 'Terrain nu' });
    expect(result.current.formData.propertyCategory).toBe('Terrain nu');
    expect(result.current.formData.constructionNature).toBe('Non bâti');
    expect(result.current.materials).toEqual([]);
    expect(result.current.usages).toEqual(['Parking', "Espace d'entreposage", 'Aucun']);
  });
  it('Industrielle : nature et usage uniques auto-sélectionnés', () => {
    const { result } = renderCascade({ constructionType: 'Industrielle' });
    expect(result.current.formData.constructionNature).toBe('Durable');
    expect(result.current.formData.declaredUsage).toBe('Industrie');
  });
});
