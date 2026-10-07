import { describe, it, expect } from 'vitest';
import {
  computeMutationDuties,
  computeLateFees,
  requiresExpertiseCertificate,
  isTransferMutation,
} from '@/components/cadastral/mutation/MutationConstants';

describe('computeMutationDuties (miroir du serveur)', () => {
  it('aucun droit sous 10 000 $', () => {
    expect(computeMutationDuties(9999, 'less_than_10').total).toBe(0);
  });
  it('titre récent : 3 % + 0,5 % de commission bancaire', () => {
    const r = computeMutationDuties(20000, 'less_than_10');
    expect(r.mutationFee).toBe(600);
    expect(r.bankFee).toBe(100);
    expect(r.total).toBe(700);
  });
  it('titre de 10 ans et plus : 1,5 %, commission exemptée', () => {
    const r = computeMutationDuties(20000, '10_or_more');
    expect(r.mutationFee).toBe(300);
    expect(r.bankFee).toBe(0);
  });
});

describe('computeLateFees', () => {
  const today = new Date(2026, 0, 31);
  it('aucune pénalité pendant le délai légal de 20 jours', () => {
    expect(computeLateFees('2026-01-11', today).fee).toBe(0);
  });
  it('0,45 $ par jour après le délai', () => {
    const r = computeLateFees('2026-01-01', today); // 30 jours -> 10 jours de retard
    expect(r.days).toBe(10);
    expect(r.fee).toBe(4.5);
  });
  it('plafonné à 500 $', () => {
    const r = computeLateFees('2010-01-01', today);
    expect(r.fee).toBe(500);
    expect(r.capped).toBe(true);
  });
});

describe('types de mutation', () => {
  it("l'expropriation est un transfert sans certificat d'expertise", () => {
    expect(isTransferMutation('expropriation')).toBe(true);
    expect(requiresExpertiseCertificate('expropriation')).toBe(false);
    expect(requiresExpertiseCertificate('vente')).toBe(true);
  });
});
