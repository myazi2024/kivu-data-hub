import { describe, expect, it } from 'vitest';
import { geographicData, landDistrictsData } from '@/lib/geographicData';
import {
  LAND_DISTRICTS_BY_PROVINCE,
  RURAL_TERRITORIES_BY_PROVINCE,
  landDistrictsFor,
} from '../../../supabase/functions/_shared/test-mode-generators/geoReference';

describe('référence géographique du mode test', () => {
  it('reprend exactement les circonscriptions foncières de l’application', () => {
    expect(LAND_DISTRICTS_BY_PROVINCE).toEqual(landDistrictsData);
  });

  it('reprend les territoires de chaque province', () => {
    for (const [province, data] of Object.entries(geographicData)) {
      expect(Object.keys(RURAL_TERRITORIES_BY_PROVINCE[province] ?? {})).toEqual(Object.keys(data.territoires));
    }
  });

  it('retrouve les circonscriptions malgré les variantes d’orthographe des provinces', () => {
    for (const p of ['Haut-Uélé', 'Bas-Uélé', 'Mai-Ndombe', 'Kasaï-Oriental', 'Équateur']) {
      expect(landDistrictsFor(p).length).toBeGreaterThan(0);
    }
  });
});
