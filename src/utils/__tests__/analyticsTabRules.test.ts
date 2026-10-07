import { describe, it, expect } from 'vitest';
import {
  isDisputeResolved, openDisputeAvgAgeDays, taxStatusGroup, mortgageStatusGroup,
  isSubdivisionInProgress, bucketHalfOpen, meanPositive, latestApprovedContributionByParcel,
  unitRentUsd, isFilledBoundaryEntry, orderByLabels,
} from '../analyticsTabRules';

describe('analyticsTabRules', () => {
  it('litiges : statuts FR et EN reconnus, ancienneté des seuls litiges en cours', () => {
    expect(isDisputeResolved('resolu')).toBe(true);
    expect(isDisputeResolved('leve')).toBe(true);
    expect(isDisputeResolved('en_cours')).toBe(false);
    const now = new Date('2026-01-11').getTime();
    expect(openDisputeAvgAgeDays([
      { current_status: 'en_cours', dispute_start_date: '2026-01-01' },
      { current_status: 'resolu', dispute_start_date: '2000-01-01' },
    ], now)).toBe(10);
  });

  it('taxes : en retard compté comme impayé', () => {
    expect(taxStatusGroup('overdue')).toBe('unpaid');
    expect(taxStatusGroup('pending')).toBe('unpaid');
    expect(taxStatusGroup('paid')).toBe('paid');
  });

  it('hypothèques et lotissement', () => {
    expect(mortgageStatusGroup('Active')).toBe('active');
    expect(mortgageStatusGroup('Soldée')).toBe('paid');
    expect(isSubdivisionInProgress('awaiting_payment')).toBe(true);
    expect(isSubdivisionInProgress('approved')).toBe(false);
  });

  it('tranches sans trou et moyenne des valeurs renseignées', () => {
    const b = [{ name: 'a', min: 0, max: 500 }, { name: 'b', min: 500, max: 1000 }];
    expect(bucketHalfOpen([500.5, 499.9, 0], b)).toEqual([{ name: 'a', value: 1 }, { name: 'b', value: 1 }]);
    expect(meanPositive([12, 0, null, 24])).toBe(18);
  });

  it('une contribution approuvée la plus récente par parcelle', () => {
    const m = latestApprovedContributionByParcel([
      { parcel_number: 'P1', status: 'approved', created_at: '2025-01-01', id: 'old' } as any,
      { parcel_number: 'P1', status: 'approved', created_at: '2026-01-01', id: 'new' } as any,
      { parcel_number: 'P1', status: 'pending', created_at: '2027-01-01', id: 'pending' } as any,
      { parcel_number: 'P2', status: 'rejected', created_at: '2026-01-01' } as any,
    ]);
    expect(m.size).toBe(1);
    expect((m.get('P1') as any).id).toBe('new');
  });

  it('loyer : locaux vacants ou occupés par le propriétaire exclus', () => {
    expect(unitRentUsd({ is_occupied: true, occupied_by: 'tenant', monthly_rent_usd: 100 })).toBe(100);
    expect(unitRentUsd({ is_occupied: false, monthly_rent_usd: 100 })).toBe(0);
    expect(unitRentUsd({ isOccupied: true, occupiedBy: 'owner', monthly_rent_usd: 100 })).toBe(0);
  });

  it('bornage : entrée vide ignorée ; ordre des libellés', () => {
    expect(isFilledBoundaryEntry({})).toBe(false);
    expect(isFilledBoundaryEntry({ survey_date: '2020-01-01' })).toBe(true);
    expect(orderByLabels([{ name: 'b' }, { name: 'x' }, { name: 'a' }], ['a', 'b']).map(r => r.name)).toEqual(['a', 'b', 'x']);
  });
});
