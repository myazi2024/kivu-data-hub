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

describe('useConstructionCascade — types disponibles par catégorie', () => {
  it.each(Object.entries(CATEGORY_TO_CONSTRUCTION_TYPES))(
    '%s expose les bons types',
    (category, expected) => {
      const { result } = renderCascade({ propertyCategory: category });
      expect(result.current.types).toEqual(expected);
      if (expected.length === 1) {
        expect(result.current.formData.constructionType).toBe(expected[0]);
      }
    },
  );

  it('les catégories multi-types ne présélectionnent aucun type', () => {
    const { result } = renderCascade({ propertyCategory: 'Immeuble/Bâtiment' });
    expect(result.current.formData.constructionType).toBeUndefined();
  });

  it('un type devenu incompatible est effacé au changement de catégorie', () => {
    const { result } = renderCascade({ propertyCategory: 'Villa' });
    expect(result.current.formData.constructionType).toBe('Résidentielle');
    act(() => { result.current.handleInputChange('propertyCategory', 'Local commercial'); });
    expect(result.current.formData.constructionType).toBe('Commerciale');
  });
});

describe('useConstructionCascade — Terrain nu', () => {
  it('auto-sélectionne la nature « Non bâti » et n’expose aucun matériau ni standing', () => {
    const { result } = renderCascade({ propertyCategory: 'Terrain nu' });
    expect(result.current.formData.constructionType).toBe('Terrain nu');
    expect(result.current.formData.constructionNature).toBe('Non bâti');
    expect(result.current.materials).toEqual([]);
    expect(result.current.standings).toEqual([]);
  });

  it('expose les usages spécifiques Parking / Entreposage / Aucun', () => {
    const { result } = renderCascade({ propertyCategory: 'Terrain nu' });
    expect(result.current.usages).toEqual(['Parking', "Espace d'entreposage", 'Aucun']);
    expect(result.current.formData.declaredUsage).toBeUndefined();
  });

  it('purge année de construction et matériaux devenus sans objet', () => {
    const { result } = renderCascade({
      propertyCategory: 'Terrain nu',
      constructionYear: 2010,
      constructionMaterials: 'Béton armé',
    });
    expect(result.current.formData.constructionYear).toBeUndefined();
    expect(result.current.formData.constructionMaterials).toBeUndefined();
  });
});

describe('useConstructionCascade — natures, matériaux, usages, standing', () => {
  it('Résidentielle expose ses natures et l’union de leurs matériaux', () => {
    const { result } = renderCascade({ propertyCategory: 'Villa' });
    expect(result.current.natures).toEqual(['Durable', 'Semi-durable', 'Précaire']);
    expect(result.current.materials).toEqual(['Béton armé', 'Briques cuites', 'Semi-dur', 'Bois', 'Tôles', 'Paille']);
  });

  it('le matériau déduit automatiquement la nature', () => {
    const { result } = renderCascade({ propertyCategory: 'Villa' });
    act(() => { result.current.handleInputChange('constructionMaterials', 'Semi-dur'); });
    expect(result.current.formData.constructionNature).toBe('Semi-durable');
    expect(result.current.standings).toEqual(['Moyen standing']);
  });

  it('un usage devenu invalide est remplacé quand la nature change', () => {
    const { result } = renderCascade({ propertyCategory: 'Villa' });
    act(() => { result.current.handleInputChange('constructionMaterials', 'Béton armé'); });
    act(() => { result.current.handleInputChange('declaredUsage', 'Bureau'); });
    expect(result.current.formData.declaredUsage).toBe('Bureau');
    act(() => { result.current.handleInputChange('constructionMaterials', 'Semi-dur'); });
    // Semi-durable n'offre que « Habitation » : l'usage invalide est effacé puis auto-sélectionné
    expect(result.current.usages).toEqual(['Habitation']);
    expect(result.current.formData.declaredUsage).toBe('Habitation');
  });


  it('auto-sélectionne l’usage quand une seule option existe (Industrielle Durable)', () => {
    const { result } = renderCascade({ propertyCategory: 'Local commercial' });
    act(() => { result.current.handleInputChange('constructionMaterials', 'Béton armé'); });
    expect(result.current.formData.constructionNature).toBe('Durable');
    expect(result.current.usages).toEqual(['Commerce', 'Bureau']);
  });

  it('Entrepôt/Hangar (Industrielle) auto-sélectionne nature et usage uniques', () => {
    const { result } = renderCascade({ propertyCategory: 'Entrepôt/Hangar' });
    // Deux types possibles : aucun auto-choix
    expect(result.current.formData.constructionType).toBeUndefined();
    act(() => { result.current.handleInputChange('constructionType', 'Industrielle'); });
    expect(result.current.formData.constructionNature).toBe('Durable');
    expect(result.current.formData.declaredUsage).toBe('Industrie');
  });

  it('vider la catégorie réinitialise toute la cascade', () => {
    const { result } = renderCascade({ propertyCategory: 'Villa' });
    act(() => { result.current.handleInputChange('constructionMaterials', 'Béton armé'); });
    act(() => { result.current.handleInputChange('propertyCategory', undefined); });
    expect(result.current.types).toEqual([]);
    expect(result.current.formData.constructionType).toBeUndefined();
    expect(result.current.formData.constructionNature).toBeUndefined();
    expect(result.current.formData.standing).toBeUndefined();
  });
});
