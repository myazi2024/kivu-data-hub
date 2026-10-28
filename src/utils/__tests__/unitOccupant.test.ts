import { describe, it, expect } from 'vitest';
import { deriveUnitOccupant, normalizeRentalUnitFromDb, isOutOfRentalUnit } from '@/utils/rentalStatus';

describe('deriveUnitOccupant', () => {
  it('proposé + occupé → locataire', () => expect(deriveUnitOccupant(true, true)).toBe('tenant'));
  it('non proposé + occupé → bailleur', () => expect(deriveUnitOccupant(false, true)).toBe('owner'));
  it('proposé + vacant → aucun', () => expect(deriveUnitOccupant(true, false)).toBeUndefined());
  it('non proposé + vacant → aucun, hors location', () => {
    expect(deriveUnitOccupant(false, false)).toBeUndefined();
    expect(isOutOfRentalUnit({ isOfferedForRent: false, isOccupied: false })).toBe(true);
  });
});

describe('anciens enregistrements', () => {
  it('reconstitue la réponse « proposé à la location »', () => {
    expect(normalizeRentalUnitFromDb({ is_occupied: true, occupied_by: 'tenant' }).isOfferedForRent).toBe(true);
    expect(normalizeRentalUnitFromDb({ is_occupied: true, occupied_by: 'owner' }).isOfferedForRent).toBe(false);
    expect(normalizeRentalUnitFromDb({ is_occupied: false }).isOfferedForRent).toBe(true);
    expect(normalizeRentalUnitFromDb({ is_offered_for_rent: false, is_occupied: false }).isOfferedForRent).toBe(false);
  });
});
