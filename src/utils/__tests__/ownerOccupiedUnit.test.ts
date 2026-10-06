import { describe, it, expect } from 'vitest';
import { isOwnerOccupiedUnit, hasTenantRentalIncome, normalizeRentalUnitFromDb } from '@/utils/rentalStatus';
import { computeMonthlyRentTotal, rentalDateLabel } from '@/components/cadastral/RentalConfigurationFields';

describe('locaux occupés par le propriétaire', () => {
  it('reconnaît camelCase et snake_case', () => {
    expect(isOwnerOccupiedUnit({ isOccupied: true, occupiedBy: 'owner' })).toBe(true);
    expect(isOwnerOccupiedUnit({ is_occupied: true, occupied_by: 'owner' })).toBe(true);
    expect(isOwnerOccupiedUnit({ isOccupied: false, occupiedBy: 'owner' })).toBe(false);
    expect(isOwnerOccupiedUnit({ isOccupied: true, occupiedBy: 'tenant' })).toBe(false);
  });

  it("une construction dont tous les locaux sont au propriétaire n'a pas de revenu locatif", () => {
    const owner = { isOccupied: true, occupiedBy: 'owner' };
    expect(hasTenantRentalIncome({ isRented: true, rentalConfiguration: 'multi', rentalUnits: [owner, owner] })).toBe(false);
    expect(hasTenantRentalIncome({ isRented: true, rentalConfiguration: 'multi', rentalUnits: [owner, { isOccupied: false }] })).toBe(true);
    expect(hasTenantRentalIncome({ isRented: false })).toBe(false);
  });

  it('convertit un local enregistré vers le formulaire', () => {
    const u = normalizeRentalUnitFromDb({ is_occupied: true, occupied_by: 'owner', monthly_rent_usd: null, hosting_capacity: '4' });
    expect(u).toMatchObject({ isOccupied: true, occupiedBy: 'owner', hostingCapacity: 4, monthlyRentUsd: undefined });
  });

  it("adapte le libellé de date à l'occupation", () => {
    expect(rentalDateLabel(true)).toBe('Occupé par le locataire actuel depuis');
    expect(rentalDateLabel(false)).toBe('Inoccupé depuis');
    expect(rentalDateLabel(undefined)).toBe('En location depuis');
  });

  it('exclut défensivement le loyer résiduel du propriétaire des totaux', () => {
    expect(computeMonthlyRentTotal({
      rentalConfiguration: 'multi',
      rentalUnits: [
        { isOccupied: true, occupiedBy: 'owner', monthlyRentUsd: 900 },
        { isOccupied: true, occupiedBy: 'tenant', monthlyRentUsd: 250 },
        { isOccupied: false, monthlyRentUsd: 175 },
      ],
    })).toBe(425);
  });
});

import { isVacantUnit, isRentExemptUnit } from '@/utils/rentalStatus';
import { sideBoundaryKind } from '@/components/cadastral/ParcelSidesDimensionsPanel';
describe('locaux vacants et limite', () => {
  it('local vacant exempt de loyer', () => {
    expect(isVacantUnit({ isOccupied: false })).toBe(true);
    expect(isRentExemptUnit({ is_occupied: false })).toBe(true);
    expect(isRentExemptUnit({ isOccupied: true, occupiedBy: 'tenant' })).toBe(false);
  });
  it('relit le choix Limite (sans mur)', () => {
    expect(sideBoundaryKind({ boundaryKind: 'limite', hasWall: false } as any)).toBe('limite');
  });
});
