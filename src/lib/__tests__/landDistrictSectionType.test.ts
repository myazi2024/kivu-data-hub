import { describe, it, expect } from 'vitest';
import {
  getSectionTypeForLandDistrict,
  landDistrictSectionType,
  landDistrictsData,
} from '@/lib/geographicData';

describe('getSectionTypeForLandDistrict', () => {
  it('classe les circonscriptions urbaines', () => {
    expect(getSectionTypeForLandDistrict('Gombe')).toBe('urbaine');
    expect(getSectionTypeForLandDistrict('Lubumbashi-Plateau')).toBe('urbaine');
    expect(getSectionTypeForLandDistrict('Beni-Ville')).toBe('urbaine');
  });

  it('classe les circonscriptions rurales', () => {
    expect(getSectionTypeForLandDistrict('Maluku')).toBe('rurale');
    expect(getSectionTypeForLandDistrict("Kasenga/M'Pweto")).toBe('rurale');
    expect(getSectionTypeForLandDistrict('Beni-Territoire')).toBe('rurale');
  });

  it('tolère accents, casse et séparateurs', () => {
    expect(getSectionTypeForLandDistrict('  gombe ')).toBe('urbaine');
    expect(getSectionTypeForLandDistrict('mbanza ngungu')).toBe('rurale');
  });

  it('renvoie une chaîne vide pour une circonscription inconnue', () => {
    expect(getSectionTypeForLandDistrict('')).toBe('');
    expect(getSectionTypeForLandDistrict('Circonscription inventée')).toBe('');
  });

  it('couvre toutes les circonscriptions répertoriées', () => {
    const all = Object.values(landDistrictsData).flat();
    expect(all.every(d => landDistrictSectionType[d] === 'urbaine' || landDistrictSectionType[d] === 'rurale')).toBe(true);
  });
});
