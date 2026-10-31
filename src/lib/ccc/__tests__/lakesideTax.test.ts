import { describe, it, expect } from 'vitest';
import { getAvailableTaxTypes, LAKESIDE_TAX_TYPE } from '../lakesideTax';
import { getLandDistrictsForProvince, getSectionTypeForLandDistrict } from '@/lib/geographicData';
import { getCategoriesForConstructionType } from '../propertyCategories';

describe('taxe des 10 mètres de rive', () => {
  it("s'affiche si la parcelle est au bord du lac", () => {
    expect(getAvailableTaxTypes({ hasRental: false, isLakeside: true })).toContain(LAKESIDE_TAX_TYPE);
  });
  it("ne s'affiche pas sinon", () => {
    expect(getAvailableTaxTypes({ hasRental: false, isLakeside: false })).not.toContain(LAKESIDE_TAX_TYPE);
    expect(getAvailableTaxTypes({ hasRental: false })).not.toContain(LAKESIDE_TAX_TYPE);
  });
});

describe('circonscriptions filtrées par section', () => {
  it("n'affiche aucune circonscription de l'autre section", () => {
    const province = 'Nord-Kivu';
    const urban = getLandDistrictsForProvince(province, 'urbaine');
    const rural = getLandDistrictsForProvince(province, 'rurale');
    expect(urban.every(d => getSectionTypeForLandDistrict(d) !== 'rurale')).toBe(true);
    expect(rural.every(d => getSectionTypeForLandDistrict(d) !== 'urbaine')).toBe(true);
    expect(urban.length + rural.length).toBeGreaterThan(0);
  });
});

describe('type de construction → catégories', () => {
  it('Industrielle propose Immeuble/Bâtiment et Entrepôt/Hangar', () => {
    expect(getCategoriesForConstructionType('Industrielle')).toEqual(['Immeuble/Bâtiment', 'Entrepôt/Hangar']);
  });
  it('Terrain nu fixe la catégorie Terrain nu', () => {
    expect(getCategoriesForConstructionType('Terrain nu')).toEqual(['Terrain nu']);
  });
});
