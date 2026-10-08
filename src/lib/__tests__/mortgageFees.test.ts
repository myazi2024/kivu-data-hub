import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MORTGAGE_CANCELLATION_FEES,
  normalizeMortgageFees,
  calculateMortgageFees,
} from '@/lib/mortgageFees';

describe('normalizeMortgageFees', () => {
  it('retourne le barème par défaut si la valeur n\'est pas un tableau', () => {
    expect(normalizeMortgageFees(null)).toEqual(DEFAULT_MORTGAGE_CANCELLATION_FEES);
    expect(normalizeMortgageFees('x')).toEqual(DEFAULT_MORTGAGE_CANCELLATION_FEES);
  });

  it('retourne le barème par défaut si le tableau est vide après filtrage', () => {
    expect(normalizeMortgageFees([])).toEqual(DEFAULT_MORTGAGE_CANCELLATION_FEES);
    expect(normalizeMortgageFees([{ id: '', name: '', amount_usd: -1 }])).toEqual(DEFAULT_MORTGAGE_CANCELLATION_FEES);
  });

  it('conserve les frais valides et ignore les entrées invalides', () => {
    const fees = normalizeMortgageFees([
      { id: 'a', name: 'Frais A', amount_usd: 10, is_mandatory: true },
      { id: 'b', name: 'Frais B', amount_usd: 'abc' },
      null,
    ]);
    expect(fees).toHaveLength(1);
    expect(fees[0].id).toBe('a');
  });
});

describe('calculateMortgageFees', () => {
  it('additionne tous les frais obligatoires même sans sélection', () => {
    // Barème par défaut : 50 + 100 + 35 + 15 + 25 = 225
    expect(calculateMortgageFees(DEFAULT_MORTGAGE_CANCELLATION_FEES, [])).toBe(225);
  });

  it('ajoute les frais optionnels sélectionnés', () => {
    expect(calculateMortgageFees(DEFAULT_MORTGAGE_CANCELLATION_FEES, ['verification'])).toBe(245);
  });

  it('ignore les identifiants inconnus', () => {
    expect(calculateMortgageFees(DEFAULT_MORTGAGE_CANCELLATION_FEES, ['inconnu'])).toBe(225);
  });

  it('arrondit à deux décimales', () => {
    const fees = [
      { id: 'a', name: 'A', amount_usd: 10.005, is_mandatory: true },
      { id: 'b', name: 'B', amount_usd: 0.005, is_mandatory: true },
    ];
    expect(calculateMortgageFees(fees, [])).toBe(10.01);
  });
});
