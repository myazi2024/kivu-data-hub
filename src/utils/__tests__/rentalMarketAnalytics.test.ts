import { describe, it, expect } from 'vitest';
import {
  median, monthlyRent, rentalYield, builtArea, heightClass, ageClass, areaClass,
  valuationStatus, permitSplit, topInvestments, saleRentByClass, AREA_CLASSES,
} from '../rentalMarketAnalytics';

describe('rentalMarketAnalytics', () => {
  it('médiane', () => { expect(median([3, 1, 2])).toBe(2); expect(median([1, 2, 3, 4])).toBe(2.5); expect(median([])).toBe(0); });
  it('loyer : exclut vacants et propriétaire', () => {
    expect(monthlyRent({ is_rented: true, rental_units: [
      { monthly_rent_usd: 100, isOccupied: true }, { monthly_rent_usd: 500, isOccupied: false },
      { monthly_rent_usd: 300, isOccupied: true, occupiedBy: 'owner' },
    ] })).toBe(100);
    expect(monthlyRent({ is_rented: false, monthly_rent_usd: 200 })).toBeNull();
  });
  it('rendement seulement avec prix et loyer', () => {
    expect(rentalYield({ is_rented: true, monthly_rent_usd: 500, resale_price_usd: 60000 })).toBeCloseTo(10);
    expect(rentalYield({ is_rented: true, monthly_rent_usd: 500 })).toBeNull();
  });
  it('surface bâtie = somme des formes', () => {
    expect(builtArea({ building_shapes: [{ areaSqm: 80 }, { areaSqm: 20 }] })).toBe(100);
    expect(builtArea({})).toBeNull();
  });
  it('classes', () => {
    expect(areaClass({ area_sqm: 99 })).toBe(0); expect(areaClass({ area_sqm: 1000 })).toBe(4);
    expect(heightClass({ property_category: 'Villa', floor_number: '0' })).toBe(0);
    expect(heightClass({ property_category: 'Villa', floor_number: '6' })).toBe(4);
    expect(heightClass({ property_category: 'Terrain nu', floor_number: '1' })).toBeNull();
    expect(ageClass({ construction_year: 2020 }, 2026)).toBe(1);
    expect(ageClass({ construction_year: 2030 }, 2026)).toBeNull();
  });
  it('vente/location par classe ignore les biens sans donnée', () => {
    const d = saleRentByClass([{ area_sqm: 50, resale_price_usd: 1000 }, { area_sqm: 50 }], AREA_CLASSES, areaClass);
    expect(d).toEqual([{ name: '< 100 m²', vente: 1000, location: 0 }]);
  });
  it('sur/sous-évaluation avec au moins 3 comparables', () => {
    const base = { commune: 'Gombe', property_category: 'Villa', area_sqm: 100 };
    const d = valuationStatus([
      { ...base, resale_price_usd: 100000 }, { ...base, resale_price_usd: 100000 },
      { ...base, resale_price_usd: 200000 }, { ...base, resale_price_usd: 50000 },
    ]);
    expect(d).toEqual(expect.arrayContaining([{ name: 'Surévalués', value: 1 }, { name: 'Sous-évalués', value: 1 }]));
    expect(valuationStatus([{ ...base, resale_price_usd: 1 }])).toEqual([]);
  });
  it('autorisation de bâtir hors terrain nu', () => {
    expect(permitSplit([
      { property_category: 'Villa', building_permits: [{ permitType: 'construction' }] },
      { property_category: 'Maison', building_permits: [{ permitType: 'regularization' }] },
      { property_category: 'Terrain nu' },
    ])).toEqual([{ name: 'Avec autorisation de bâtir', value: 1 }, { name: 'Sans autorisation de bâtir', value: 1 }]);
  });
  it('top investissements trié par rendement', () => {
    const t = topInvestments([
      { commune: 'A', property_category: 'Villa', is_rented: true, monthly_rent_usd: 100, resale_price_usd: 12000 },
      { commune: 'B', property_category: 'Villa', is_rented: true, monthly_rent_usd: 100, resale_price_usd: 6000 },
    ]);
    expect(t[0].localisation).toBe('B'); expect(t[0].rendement).toBe(20);
  });
});
