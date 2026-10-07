import { describe, it, expect } from 'vitest';
import {
  flattenConstructions, constructionStatusData, rentalUnitsOccupancyData,
  boundaryKindData, roadAccessData, entrancesData, operationalCapacityData,
  flattenPropertyCategoryRecords, propertyCategoryData, permitStatusData,
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
  it('catégories : ordre CCC, principale, supplémentaires et terrain nu', () => {
    const records = [
      parcel,
      { property_category: 'Terrain nu' },
      { property_category: 'Appartement', additional_constructions: [{ propertyCategory: 'Local commercial' }] },
    ];
    expect(propertyCategoryData(records)).toEqual([
      { name: 'Appartement', value: 1 },
      { name: 'Villa', value: 1 },
      { name: 'Maison', value: 0 },
      { name: 'Maison basse', value: 1 },
      { name: 'Local commercial', value: 1 },
      { name: 'Immeuble/Bâtiment', value: 0 },
      { name: 'Entrepôt/Hangar', value: 0 },
      { name: 'Terrain nu', value: 1 },
    ]);
    expect(flattenPropertyCategoryRecords(records)).toHaveLength(5);
  });
  it('autorisations : par construction, terrain nu exclu, zéros conservés', () => {
    expect(permitStatusData([
      { property_category: 'Villa', building_permits: [{ permitType: 'regularization' }, { permitType: 'construction' }] },
      { property_category: 'Maison', building_permits: [{ permitType: 'regularization' }] },
      { property_category: 'Terrain nu' },
    ])).toEqual([
      { name: 'Avec autorisation de bâtir', value: 1 },
      { name: 'Avec autorisation de régularisation', value: 1 },
      { name: 'Sans autorisation de bâtir', value: 0 },
    ]);
  });
});
