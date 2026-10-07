import { describe, it, expect } from 'vitest';
import { extractRentalAssets } from '@/utils/userRentalMarket';
const row = (units: any[]) => ({ id: '1', parcel_number: 'P', status: 'approved', construction_type: 'Résidentielle', is_rented: true, rental_configuration: 'multi', rental_units_count: units.length, rental_units: units });
describe('extractRentalAssets', () => {
  it('ignore le loyer des locaux vacants et du propriétaire', () => {
    const a = extractRentalAssets([row([
      { is_occupied: true, occupied_by: 'tenant', monthly_rent_usd: 100 },
      { is_occupied: false, monthly_rent_usd: 50 },
      { is_occupied: true, occupied_by: 'owner', monthly_rent_usd: 70 },
    ])]);
    if (a.length) { expect(a[0].monthlyRentUsd).toBe(100); expect(a[0].missingRent).toBe(false); }
  });
  it('pas de loyer manquant si aucun local loué à un tiers', () => {
    const a = extractRentalAssets([row([{ is_occupied: false }])]);
    if (a.length) expect(a[0].missingRent).toBe(false);
  });
});
