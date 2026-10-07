import { describe, it, expect } from 'vitest';
import { mutationTypeParcelData } from '../mutationAnalytics';

describe('mutationTypeParcelData', () => {
  it('compte les parcelles distinctes avec libellés', () => {
    const r = mutationTypeParcelData([
      { parcel_id: 'a', mutation_type: 'vente' },
      { parcel_id: 'a', mutation_type: 'vente' },
      { parcel_id: 'b', mutation_type: 'vente' },
      { parcel_id: 'a', mutation_type: 'mise_a_jour' },
      { parcel_id: 'c', mutation_type: null },
    ]);
    expect(r).toEqual([{ name: 'Vente', value: 2 }, { name: 'Mise à jour', value: 1 }]);
  });
});
