import { describe, expect, it } from 'vitest';
import { applyFilters, getSectionType, matchesLocation, defaultFilter } from '@/utils/analyticsHelpers';

describe('filtres Analytics alignés sur le CCC', () => {
  it('déduit la zone du préfixe du numéro de parcelle', () => {
    expect(getSectionType({ parcel_number: 'SU/123' })).toBe('urbaine');
    expect(getSectionType({ parcel_number: 'sr-45' })).toBe('rurale');
    expect(getSectionType({ parcel_number: 'X1' })).toBeNull();
  });
  it('compare les lieux sans tenir compte des accents ni de la casse', () => {
    expect(matchesLocation({ province: 'Equateur' }, { ...defaultFilter, province: 'Équateur' })).toBe(true);
    expect(matchesLocation({ land_district: 'Beni Ville' }, { ...defaultFilter, landDistrict: 'Beni-Ville' })).toBe(true);
  });
  it('exclut les enregistrements sans date quand une période est choisie', () => {
    const rows = [{ created_at: '2025-03-01' }, { created_at: null }];
    expect(applyFilters(rows, { ...defaultFilter, year: 2025 })).toHaveLength(1);
    expect(applyFilters(rows, defaultFilter)).toHaveLength(2);
  });
});
