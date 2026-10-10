import { describe, it, expect } from 'vitest';
import { isValidPermitNumber, normalizePermitNumber, estimatePermitStatus, permitExpiryDate } from '@/lib/buildingPermitRules';

describe('numéro d\'autorisation', () => {
  it('accepte les formats RDC', () => {
    expect(isValidPermitNumber('PC-2024-001')).toBe(true);
    expect(isValidPermitNumber(' ab/2024/00123 ')).toBe(true);
    expect(isValidPermitNumber('URB.2024.0001')).toBe(true);
  });
  it('refuse les autres', () => {
    expect(isValidPermitNumber('P-2024-001')).toBe(false);
    expect(isValidPermitNumber('PC-24-001')).toBe(false);
    expect(isValidPermitNumber('PC-2024-1')).toBe(false);
  });
  it('normalise', () => expect(normalizePermitNumber(' pc-2024-001 ')).toBe('PC-2024-001'));
});

describe('statut estimé', () => {
  const now = new Date('2026-10-10T12:00:00');
  it('valide dans la durée choisie', () => expect(estimatePermitStatus('2025-01-01', 36, now)).toBe('Valide'));
  it('expiré après la durée choisie', () => expect(estimatePermitStatus('2025-01-01', 6, now)).toBe('Expiré'));
  it('en cours si incomplet', () => expect(estimatePermitStatus('', 36, now)).toBe('En cours'));
  it('expiration sur la durée choisie', () =>
    expect(permitExpiryDate('2024-01-15', 24)?.toISOString().slice(0, 10)).toBe('2026-01-15'));
});
