import { describe, expect, it } from 'vitest';
import {
  LAND_DISTRICT_SUGGESTIONS,
  buildDistrictColors,
  matchAreaToDistrict,
  matchCommuneToDistrict,
  normalizeGeoName,
} from '@/lib/landDistrictMapping';

describe('landDistrictMapping', () => {
  it('normalise accents et séparateurs', () => {
    expect(normalizeGeoName('Masi-Manimba')).toBe(normalizeGeoName('Masimanimba'));
    expect(normalizeGeoName('Équateur')).toBe('equateur');
  });
  it('associe un territoire égal à une circonscription', () => {
    expect(matchAreaToDistrict('Aru').district).toBe('Aru');
    expect(matchAreaToDistrict('Beni Ville').district).toBe('Beni-Ville');
  });
  it('laisse figées les villes et territoires découpés', () => {
    expect(matchAreaToDistrict('Kinshasa').district).toBeNull();
    expect(matchAreaToDistrict('Goma').district).toBeNull();
    expect(matchAreaToDistrict('Kalehe').district).toBeNull();
  });
  it('attribue une couleur unique par circonscription', () => {
    const colors = buildDistrictColors(['Aru', 'Buta', 'Aru', 'Boma']);
    expect(colors.size).toBe(3);
    expect(new Set(colors.values()).size).toBe(3);
  });
  it('associe une commune à une circonscription de la même province', () => {
    expect(matchCommuneToDistrict("N'djili", 'Kinshasa').district).toBe("N'Djili");
    expect(matchCommuneToDistrict('Karisimbi', 'Goma').district).toBe('Karisimbi');
  });
  it('ne transforme pas une suggestion non validée en limite', () => {
    expect(LAND_DISTRICT_SUGGESTIONS.some((item) => !item.validated)).toBe(true);
    const match = matchCommuneToDistrict('Ruashi', 'Lubumbashi');
    expect(match.district).toBeNull();
    expect(match.isSuggested).toBe(true);
  });
  it('ne confond pas une commune avec une circonscription d’une autre province', () => {
    expect(matchCommuneToDistrict('Gombe', 'Lubumbashi').district).toBeNull();
  });
});
