import { describe, expect, it } from 'vitest';
import { buildDistrictColors, matchAreaToDistrict, normalizeGeoName } from '@/lib/landDistrictMapping';

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
});
