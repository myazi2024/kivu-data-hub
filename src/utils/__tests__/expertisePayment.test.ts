import { describe, it, expect } from 'vitest';
import { isValidDrcMobileNumber } from '@/utils/expertisePaymentHelper';
import { certificateDaysRemaining } from '@/hooks/useExpertiseCertificateAccess';

describe('isValidDrcMobileNumber', () => {
  it('accepte les formats RDC', () => {
    expect(isValidDrcMobileNumber('+243 812 345 678')).toBe(true);
    expect(isValidDrcMobileNumber('0991234567')).toBe(true);
  });
  it('refuse les numéros invalides', () => {
    expect(isValidDrcMobileNumber('12345')).toBe(false);
    expect(isValidDrcMobileNumber('+33612345678')).toBe(false);
  });
});

describe('certificateDaysRemaining', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  it('compte les jours restants', () => {
    expect(certificateDaysRemaining('2026-01-11T00:00:00Z', now)).toBe(10);
  });
  it('renvoie 0 si expiré ou date invalide', () => {
    expect(certificateDaysRemaining('2025-12-01T00:00:00Z', now)).toBe(0);
    expect(certificateDaysRemaining('pas-une-date', now)).toBe(0);
  });
});
