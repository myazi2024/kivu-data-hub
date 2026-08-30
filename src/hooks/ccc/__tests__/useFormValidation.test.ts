import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFormValidation, type UseFormValidationParams } from '@/hooks/ccc/useFormValidation';

/**
 * Campagne de tests par catégorie de bien : chaque catégorie dispose d'un jeu
 * minimal complet (aucun champ manquant attendu) que l'on ampute ensuite pour
 * vérifier les dépendances conditionnelles.
 */

const file = () => new File(['x'], 'doc.pdf', { type: 'application/pdf' });

const baseOwner = {
  legalStatus: 'Personne physique',
  lastName: 'Kabila',
  firstName: 'Jean',
  gender: 'M',
  since: '2018-05-01',
  nationality: 'Congolaise',
} as any;

const baseParams = (): UseFormValidationParams => ({
  formData: {
    propertyTitleType: "Certificat d'enregistrement",
    parcelNumber: 'SU12345',
    province: 'Haut-Katanga',
    ville: 'Lubumbashi',
    commune: 'Kampemba',
    quartier: 'Bel-Air',
    areaSqm: 500,
    wouldSellIfOffered: false,
    hasRecentAppraisal: false,
  } as any,
  customTitleName: '',
  currentOwners: [baseOwner],
  previousOwners: [{ name: 'Mwamba', startDate: '2010-01-01', mutationType: 'Achat' } as any],
  sectionType: 'urbaine',
  permitMode: 'request',
  buildingPermits: [],
  parcelSides: [
    { name: 'Côté 1', length: '20' },
    { name: 'Côté 2', length: '25' },
    { name: 'Côté 3', length: '20' },
  ],
  taxRecords: [],
  hasMortgage: false,
  hasDispute: false,
  mortgageRecords: [],
  ownerDocFile: file(),
  titleDocFiles: [file()],
  roadSides: [],
  servitude: { hasServitude: false },
  buildingShapes: [{ heightM: 4 }],
  constructionMode: 'unique',
  additionalConstructions: [],
  soundEnvironment: 'tres_calme',
  nearbySoundSources: '',
});

/** Jeux minimaux complets, catégorie par catégorie. */
const CATEGORY_FIXTURES: Record<string, Partial<UseFormValidationParams>> = {
  Appartement: {
    formData: {
      ...baseParams().formData,
      propertyCategory: 'Appartement',
      constructionType: 'Résidentielle',
      constructionNature: 'Durable',
      constructionMaterials: 'Béton armé',
      standing: 'Moyen standing',
      declaredUsage: 'Habitation',
      constructionYear: 2015,
      apartmentNumber: 'A12',
      floorNumber: '2',
      apartmentLength: 10,
      apartmentWidth: 8,
      apartmentOrientation: 'Nord',
    } as any,
    permitMode: null,
    buildingShapes: [],
    parcelSides: [],
  },
  Villa: {
    formData: {
      ...baseParams().formData,
      propertyCategory: 'Villa',
      constructionType: 'Résidentielle',
      constructionNature: 'Durable',
      constructionMaterials: 'Béton armé',
      standing: 'Moyen standing',
      declaredUsage: 'Habitation',
      constructionYear: 2015,
    } as any,
  },
  Maison: {
    formData: {
      ...baseParams().formData,
      propertyCategory: 'Maison',
      constructionType: 'Résidentielle',
      constructionNature: 'Semi-durable',
      constructionMaterials: 'Semi-dur',
      standing: 'Économique',
      declaredUsage: 'Habitation',
      constructionYear: 2012,
    } as any,
  },
  'Local commercial': {
    formData: {
      ...baseParams().formData,
      propertyCategory: 'Local commercial',
      constructionType: 'Commerciale',
      constructionNature: 'Durable',
      constructionMaterials: 'Béton armé',
      standing: 'Moyen standing',
      declaredUsage: 'Commerce',
      constructionYear: 2019,
    } as any,
  },
  'Immeuble/Bâtiment': {
    formData: {
      ...baseParams().formData,
      propertyCategory: 'Immeuble/Bâtiment',
      constructionType: 'Commerciale',
      constructionNature: 'Durable',
      constructionMaterials: 'Béton armé',
      standing: 'Haut standing',
      declaredUsage: 'Bureau',
      constructionYear: 2020,
    } as any,
  },
  'Entrepôt/Hangar': {
    formData: {
      ...baseParams().formData,
      propertyCategory: 'Entrepôt/Hangar',
      constructionType: 'Industrielle',
      constructionNature: 'Durable',
      constructionMaterials: 'Béton armé',
      standing: 'Économique',
      declaredUsage: 'Industrie',
      constructionYear: 2016,
    } as any,
  },
  'Terrain nu': {
    formData: {
      ...baseParams().formData,
      propertyCategory: 'Terrain nu',
      constructionType: 'Terrain nu',
      constructionNature: 'Non bâti',
    } as any,
    permitMode: null,
    buildingShapes: [],
  },
};

const build = (category: string, overrides: Partial<UseFormValidationParams> = {}): UseFormValidationParams => {
  const fixture = CATEGORY_FIXTURES[category];
  const merged: UseFormValidationParams = {
    ...baseParams(),
    ...fixture,
    ...overrides,
    formData: { ...(fixture.formData as any), ...((overrides.formData as any) || {}) },
  };
  return merged;
};

const missingFor = (params: UseFormValidationParams) => {
  const { result } = renderHook(() => useFormValidation(params));
  return result.current.missingFieldsList;
};

const fields = (params: UseFormValidationParams) => missingFor(params).map(m => m.field);

describe('useFormValidation — jeu minimal complet par catégorie', () => {
  it.each(Object.keys(CATEGORY_FIXTURES))('%s : aucun champ manquant', (category) => {
    expect(fields(build(category))).toEqual([]);
  });
});

describe('useFormValidation — champs conditionnels Appartement', () => {
  it('exige n° appartement, étage et mesures', () => {
    const f = fields(build('Appartement', {
      formData: {
        apartmentNumber: undefined, floorNumber: undefined,
        apartmentLength: undefined, apartmentWidth: undefined, apartmentOrientation: undefined,
      } as any,
    }));
    expect(f).toEqual(expect.arrayContaining([
      'apartmentNumber', 'floorNumber', 'apartmentLength', 'apartmentWidth', 'apartmentOrientation',
    ]));
  });

  it("n'exige ni superficie, ni côtés, ni tracé de construction, ni autorisation de bâtir", () => {
    const f = fields(build('Appartement', {
      formData: { areaSqm: undefined } as any,
      parcelSides: [],
      buildingShapes: [],
      permitMode: null,
    }));
    expect(f).toEqual([]);
  });
});

describe('useFormValidation — champs conditionnels Terrain nu', () => {
  it("n'exige ni nature, ni usage, ni matériaux, ni standing, ni année de construction", () => {
    const f = fields(build('Terrain nu', {
      formData: {
        constructionNature: undefined, declaredUsage: undefined,
        constructionMaterials: undefined, standing: undefined, constructionYear: undefined,
      } as any,
    }));
    expect(f).toEqual([]);
  });

  it("n'exige ni tracé de construction ni autorisation de bâtir", () => {
    expect(fields(build('Terrain nu', { buildingShapes: [], permitMode: null }))).toEqual([]);
  });

  it('exige superficie et au moins 3 côtés', () => {
    const f = fields(build('Terrain nu', {
      formData: { areaSqm: undefined } as any,
      parcelSides: [{ name: 'Côté 1', length: '10' }],
    }));
    expect(f).toEqual(expect.arrayContaining(['areaSqm', 'parcelSides']));
  });

  it('en location : ni occupation ni capacité ne sont exigées', () => {
    const f = fields(build('Terrain nu', {
      formData: { isRented: true, rentalConfiguration: 'single', monthlyRentUsd: 150, rentalStartDate: '2023-01-01' } as any,
    }));
    expect(f).toEqual([]);
  });
});

describe('useFormValidation — catégories non résidentielles', () => {
  it.each(['Local commercial', 'Entrepôt/Hangar'])(
    '%s en location : capacité et occupation non bloquantes',
    (category) => {
      const f = fields(build(category, {
        formData: { isRented: true, rentalConfiguration: 'single', monthlyRentUsd: 800, rentalStartDate: '2022-06-01' } as any,
      }));
      expect(f).toEqual([]);
    },
  );

  it.each(['Villa', 'Maison', 'Immeuble/Bâtiment'])(
    '%s en location : capacité et occupation restent exigées',
    (category) => {
      const f = fields(build(category, {
        formData: { isRented: true, rentalConfiguration: 'single', monthlyRentUsd: 800, rentalStartDate: '2022-06-01' } as any,
      }));
      expect(f).toEqual(expect.arrayContaining(['isOccupied', 'hostingCapacity']));
    },
  );
});

describe('useFormValidation — configuration locative', () => {
  it.each(['Appartement', 'Local commercial', 'Entrepôt/Hangar'])(
    '%s : la configuration locative n’est pas exigée (mode mono-local implicite)',
    (category) => {
      const f = fields(build(category, {
        formData: { isRented: true, rentalConfiguration: undefined } as any,
      }));
      expect(f).not.toContain('rentalConfiguration');
    },
  );

  it.each(['Villa', 'Maison', 'Immeuble/Bâtiment'])(
    '%s : la configuration locative est exigée',
    (category) => {
      const f = fields(build(category, {
        formData: { isRented: true, rentalConfiguration: undefined } as any,
      }));
      expect(f).toContain('rentalConfiguration');
    },
  );

  it('mode multi : exige au moins 2 locaux et des saisies cohérentes', () => {
    const f = fields(build('Villa', {
      formData: { isRented: true, rentalConfiguration: 'multi', rentalUnitsCount: 1, rentalUnits: [] } as any,
    }));
    expect(f).toEqual(expect.arrayContaining(['rentalUnitsCount', 'rentalUnits']));
  });

  it('mode multi complet : aucun champ manquant', () => {
    const unit = { monthlyRentUsd: 200, isOccupied: true, hostingCapacity: 4, occupantCount: 3, rentalStartDate: '2023-02-01' };
    const f = fields(build('Villa', {
      formData: {
        isRented: true, rentalConfiguration: 'multi', rentalUnitsCount: 2,
        rentalUnits: [unit, { ...unit, isOccupied: false }],
      } as any,
    }));
    expect(f).toEqual([]);
  });

  it('occupants supérieurs à la capacité : accepté (indicateurs Analytics indépendants)', () => {
    const f = fields(build('Villa', {
      formData: {
        isRented: true, rentalConfiguration: 'single', monthlyRentUsd: 500,
        rentalStartDate: '2023-01-01', isOccupied: true, hostingCapacity: 2, occupantCount: 9,
      } as any,
    }));
    expect(f).toEqual([]);
  });

  it('date de mise en location antérieure à l’année de construction : refusée', () => {
    const f = fields(build('Villa', {
      formData: {
        isRented: true, rentalConfiguration: 'single', monthlyRentUsd: 500,
        rentalStartDate: '2001-01-01', isOccupied: false, hostingCapacity: 4,
      } as any,
    }));
    expect(f).toContain('rentalStartDate');
  });
});

describe('useFormValidation — obligations et onglet Valeur', () => {
  it("l'IRL est facultatif pour une construction en location", () => {
    const f = fields(build('Villa', {
      formData: {
        isRented: true, rentalConfiguration: 'single', monthlyRentUsd: 500,
        rentalStartDate: '2023-01-01', isOccupied: false, hostingCapacity: 4,
      } as any,
      taxRecords: [],
    }));
    expect(f).toEqual([]);
  });

  it('un IRL non rattaché à une construction est signalé', () => {
    const f = fields(build('Villa', {
      formData: {
        isRented: true, rentalConfiguration: 'single', monthlyRentUsd: 500,
        rentalStartDate: '2023-01-01', isOccupied: false, hostingCapacity: 4,
      } as any,
      taxRecords: [{ taxType: 'Impôt sur les revenus locatifs', taxYear: '2024', taxAmount: '120', paymentStatus: 'Non payé' } as any],
    }));
    expect(f).toContain('irlUnassigned');
  });

  it('un doublon de taxe est signalé', () => {
    const tax = { taxType: 'Impôt foncier', taxYear: '2024', taxAmount: '100', paymentStatus: 'Non payé' } as any;
    const f = fields(build('Villa', { taxRecords: [tax, { ...tax }] }));
    expect(f).toEqual(expect.arrayContaining(['taxDuplicate_0', 'taxDuplicate_1']));
  });

  it('hypothèque déclarée sans détails : bloquant', () => {
    const f = fields(build('Villa', { hasMortgage: true, mortgageRecords: [] }));
    expect(f).toContain('mortgageDetails');
  });

  it('vente envisagée sans prix : bloquant', () => {
    const f = fields(build('Villa', { formData: { wouldSellIfOffered: true } as any }));
    expect(f).toContain('resalePriceAmount');
  });

  it('environnement sonore non « très calme » : sources de bruit exigées', () => {
    const f = fields(build('Villa', { soundEnvironment: 'bruyant', nearbySoundSources: '' }));
    expect(f).toContain('nearbySoundSources');
  });
});

describe('useFormValidation — accessibilité des onglets', () => {
  it('un onglet Localisation incomplet bloque les onglets suivants', () => {
    const params = build('Villa', { formData: { province: undefined } as any });
    const { result } = renderHook(() => useFormValidation(params));
    expect(result.current.isTabComplete('location')).toBe(false);
    expect(result.current.isTabAccessible('history')).toBe(false);
    expect(result.current.isTabAccessible('general')).toBe(true);
  });

  it('un jeu complet rend tous les onglets accessibles et le formulaire soumettable', () => {
    const { result } = renderHook(() => useFormValidation(build('Villa')));
    expect(result.current.isTabAccessible('review')).toBe(true);
    expect(result.current.isFormValidForSubmission()).toBe(true);
  });
});
