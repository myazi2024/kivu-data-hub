import { describe, it, expect } from 'vitest';
import {
  isConstructionRented,
  isRentalEligible,
  isSingleUnitRentalCategory,
  isNonResidentialCategory,
  deduceRealUsage,
} from '@/utils/rentalStatus';
import { CATEGORIES } from './cccPredicates.test';

/**
 * Matrice de référence : mono-local (sélecteur de mode locatif masqué) et
 * capacité d'accueil (bloc occupation affiché / validé).
 */
const MATRIX: Record<string, { singleUnit: boolean; capacity: boolean }> = {
  Appartement: { singleUnit: true, capacity: true },
  Villa: { singleUnit: false, capacity: true },
  Maison: { singleUnit: false, capacity: true },
  'Local commercial': { singleUnit: true, capacity: false },
  'Immeuble/Bâtiment': { singleUnit: false, capacity: true },
  'Entrepôt/Hangar': { singleUnit: true, capacity: false },
  'Terrain nu': { singleUnit: false, capacity: false },
};

describe('rentalStatus — matrice catégories', () => {
  it.each(CATEGORIES)('isSingleUnitRentalCategory(%s)', (cat) => {
    expect(isSingleUnitRentalCategory(cat)).toBe(MATRIX[cat].singleUnit);
  });

  it.each(CATEGORIES)('isNonResidentialCategory(%s)', (cat) => {
    // Terrain nu est exclu par un prédicat dédié, pas par isNonResidentialCategory
    const expected = cat === 'Local commercial' || cat === 'Entrepôt/Hangar';
    expect(isNonResidentialCategory(cat)).toBe(expected);
  });

  it('les espaces superflus ne cassent pas la correspondance', () => {
    expect(isSingleUnitRentalCategory('  Appartement ')).toBe(true);
    expect(isNonResidentialCategory(' Entrepôt/Hangar ')).toBe(true);
  });
});

describe('rentalStatus — éligibilité locative', () => {
  it.each([
    ['Résidentielle', 'Durable', true],
    ['Commerciale', 'Semi-durable', true],
    ['Industrielle', 'Durable', true],
    ['Terrain nu', 'Non bâti', true],
    ['Agricole', 'Non bâti', true],
    ['Résidentielle', 'Précaire', false],
    ['Agricole', 'Durable', false],
  ] as const)('isRentalEligible(%s, %s) = %s', (type, nature, expected) => {
    expect(isRentalEligible(type, nature)).toBe(expected);
  });

  it('sans type ou sans nature, aucune éligibilité', () => {
    expect(isRentalEligible(undefined, 'Durable')).toBe(false);
    expect(isRentalEligible('Résidentielle', null)).toBe(false);
  });
});

describe('rentalStatus — statut de location', () => {
  it('reconnaît les deux conventions de nommage', () => {
    expect(isConstructionRented({ isRented: true })).toBe(true);
    expect(isConstructionRented({ is_rented: true })).toBe(true);
    expect(isConstructionRented({ isRented: false })).toBe(false);
  });

  it('rétro-compatibilité : declaredUsage « Location »', () => {
    expect(isConstructionRented({ declaredUsage: 'Location' })).toBe(true);
    expect(isConstructionRented({ declared_usage: 'Location' })).toBe(true);
    expect(isConstructionRented({ declaredUsage: 'Habitation' })).toBe(false);
  });

  it('null / undefined ne sont pas en location', () => {
    expect(isConstructionRented(null)).toBe(false);
    expect(isConstructionRented(undefined)).toBe(false);
  });

  it('deduceRealUsage mappe le type vers un usage réel', () => {
    expect(deduceRealUsage('Commerciale')).toBe('Commerce');
    expect(deduceRealUsage('Industrielle')).toBe('Industrie');
    expect(deduceRealUsage('Agricole')).toBe('Agriculture');
    expect(deduceRealUsage('Résidentielle')).toBe('Habitation');
    expect(deduceRealUsage(undefined)).toBe('Habitation');
  });
});
