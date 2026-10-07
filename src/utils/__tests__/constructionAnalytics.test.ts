import { describe, it, expect } from 'vitest';
import {
  flattenConstructions, constructionStatusData, rentalUnitsOccupancyData,
  boundaryKindData, roadAccessData, entrancesData, operationalCapacityData,
} from '../constructionAnalytics';

describe('constructionAnalytics', () => {
  const parcel = {
    property_category: 'Maison basse', construction_status: 'in_progress', is_rented: true,
    rental_configuration: 'multi',
    rental_units: [{ isOccupied: false }, { isOccupied: true, occupiedBy: 'owner' }, { isOccupied: true }],
    additional_constructions: [{ propertyCategory: 'Villa', constructionStatus: 'completed', operationalCapacity: 10, operationalCapacityUnit: 'lits' }],
    road_sides: [
      { boundaryKind: 'mur_mitoyen', hasRoad: false },
      { boundaryKind: 'limite', hasRoad: true, hasEntrance: true },
      { boundaryKind: 'mur', hasRoad: false },
    ],
  };

  it('aplatit principale + supplémentaires, ignore terrain nu', () => {
    expect(flattenConstructions([parcel, { property_category: 'Terrain nu' }])).toHaveLength(2);
  });
  it('état de construction', () => {
    const d = constructionStatusData(flattenConstructions([parcel]));
    expect(d).toEqual(expect.arrayContaining([{ name: 'En cours', value: 1 }, { name: 'Achevée', value: 1 }]));
  });
  it('locaux : vacant / propriétaire / locataire', () => {
    const d = rentalUnitsOccupancyData(flattenConstructions([parcel]));
    expect(d.map(x => x.name).sort()).toEqual(['Occupé par le propriétaire', 'Occupé par un locataire', 'Vacant']);
  });
  it('limites, routes et entrées', () => {
    expect(boundaryKindData([parcel]).map(d => d.name).sort()).toEqual(['Limite (sans mur)', 'Mur', 'Mur mitoyen']);
    expect(roadAccessData([parcel])).toEqual([{ name: '1 côté sur route', value: 1 }]);
    expect(entrancesData([parcel])).toEqual([{ name: '1 entrée', value: 1 }]);
  });
  it('capacité par unité', () => {
    expect(operationalCapacityData(flattenConstructions([parcel]))).toEqual([{ name: 'lits', value: 10 }]);
  });
});
