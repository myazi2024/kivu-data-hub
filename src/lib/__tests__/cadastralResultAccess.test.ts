import { describe, it, expect } from 'vitest';
import {
  normalizeAccess, isSectionOpen, hasAnyOpenSection, activeServices, sectionNumber,
} from '../cadastralResultAccess';

const NOW = new Date('2026-10-07T12:00:00Z').getTime();

describe('cadastralResultAccess', () => {
  it('ferme tout sans achat, même si le format est invalide', () => {
    const a = normalizeAccess(null);
    expect(hasAnyOpenSection(a, NOW)).toBe(false);
    expect(isSectionOpen(normalizeAccess({ services: ['history'] }), 'history', NOW)).toBe(false);
  });

  it('ouvre seulement les rubriques des services achetés', () => {
    const a = normalizeAccess({ free_access: false, services: { history: null } });
    expect(isSectionOpen(a, 'history', NOW)).toBe(true);
    expect(isSectionOpen(a, 'owner', NOW)).toBe(false);
    expect(isSectionOpen(a, 'disputes', NOW)).toBe(false);
  });

  it('localisation ouverte par information ou location_history', () => {
    expect(isSectionOpen(normalizeAccess({ services: { information: null } }), 'location', NOW)).toBe(true);
    expect(isSectionOpen(normalizeAccess({ services: { location_history: null } }), 'location', NOW)).toBe(true);
    expect(isSectionOpen(normalizeAccess({ services: { location_history: null } }), 'owner', NOW)).toBe(false);
  });

  it('accès expiré = rubrique fermée', () => {
    const a = normalizeAccess({ services: { obligations: '2026-10-01T00:00:00Z', history: '2027-01-01T00:00:00Z' } });
    expect(isSectionOpen(a, 'obligations', NOW)).toBe(false);
    expect(isSectionOpen(a, 'history', NOW)).toBe(true);
    expect(activeServices(a, NOW)).toEqual(['history']);
  });

  it('accès libre (mode test) ouvre tout', () => {
    expect(isSectionOpen(normalizeAccess({ free_access: true, services: {} }), 'disputes', NOW)).toBe(true);
  });

  it('numérotation fixe', () => {
    expect(sectionNumber('identification')).toBe(1);
    expect(sectionNumber('disputes')).toBe(7);
  });
});
