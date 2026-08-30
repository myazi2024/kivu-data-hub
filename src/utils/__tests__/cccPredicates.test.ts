import { describe, it, expect } from 'vitest';
import {
  isUnbuiltLand,
  isTerrainNuCategory,
  hasSuSrReference,
  computeParcelNumberRequired,
} from '@/utils/cccPredicates';

/** Matrice de référence des catégories de bien du formulaire CCC. */
export const CATEGORIES = [
  'Appartement',
  'Villa',
  'Maison',
  'Local commercial',
  'Immeuble/Bâtiment',
  'Entrepôt/Hangar',
  'Terrain nu',
] as const;

const EXPECTED_TERRAIN_NU: Record<string, boolean> = {
  Appartement: false,
  Villa: false,
  Maison: false,
  'Local commercial': false,
  'Immeuble/Bâtiment': false,
  'Entrepôt/Hangar': false,
  'Terrain nu': true,
};

describe('cccPredicates — matrice catégories', () => {
  it.each(CATEGORIES)('isTerrainNuCategory(%s)', (cat) => {
    expect(isTerrainNuCategory({ propertyCategory: cat })).toBe(EXPECTED_TERRAIN_NU[cat]);
  });

  it.each(CATEGORIES)('isUnbuiltLand(%s) sans nature', (cat) => {
    expect(isUnbuiltLand({ propertyCategory: cat })).toBe(EXPECTED_TERRAIN_NU[cat]);
  });

  it('nature « Non bâti » rend un bien non bâti quelle que soit la catégorie', () => {
    expect(isUnbuiltLand({ propertyCategory: 'Entrepôt/Hangar', constructionNature: 'Non bâti' })).toBe(true);
  });

  it('un terrain agricole non bâti est non bâti mais pas « Terrain nu »', () => {
    const data = { propertyCategory: 'Entrepôt/Hangar', constructionType: 'Agricole', constructionNature: 'Non bâti' };
    expect(isUnbuiltLand(data)).toBe(true);
    expect(isTerrainNuCategory(data)).toBe(false);
  });

  it('null / undefined ne déclenchent aucun prédicat', () => {
    expect(isUnbuiltLand(null)).toBe(false);
    expect(isUnbuiltLand(undefined)).toBe(false);
    expect(isTerrainNuCategory(null)).toBe(false);
  });
});

describe('cccPredicates — référence SU/SR et n° de parcelle', () => {
  it('détecte un préfixe SU/SR littéral', () => {
    expect(hasSuSrReference('SU 12345')).toBe(true);
    expect(hasSuSrReference('SR12345')).toBe(true);
    expect(hasSuSrReference('12345')).toBe(false);
  });

  it("l'origine « parcel » de la recherche vaut référence SU/SR", () => {
    expect(hasSuSrReference('12345', 'parcel', '12345')).toBe(true);
    expect(hasSuSrReference('12345', 'title', 'ABC')).toBe(false);
  });

  it('« Fiche parcellaire » n’exige le n° SU/SR que s’il est connu', () => {
    expect(computeParcelNumberRequired('Fiche parcellaire', false)).toBe(false);
    expect(computeParcelNumberRequired('Fiche parcellaire', true)).toBe(true);
    expect(computeParcelNumberRequired("Certificat d'enregistrement", false)).toBe(true);
  });
});
