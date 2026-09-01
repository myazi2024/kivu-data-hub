import { describe, it, expect } from 'vitest';
import { getShapeForConstructionIndex, withShapeHeight, withoutShapeHeights } from '@/utils/buildingShapes';

const shapes = [
  { id: 'a', linkedIndex: 0, heightM: 3 },
  { id: 'b', linkedIndex: 1 },
  { id: 'c', linkedIndex: 2, heightM: 4.5 },
];

describe('getShapeForConstructionIndex', () => {
  it('retourne la forme liée à chaque construction (0 = principale, 1+ = additionnelles)', () => {
    expect(getShapeForConstructionIndex(shapes, 0)?.id).toBe('a');
    expect(getShapeForConstructionIndex(shapes, 1)?.id).toBe('b');
    expect(getShapeForConstructionIndex(shapes, 2)?.id).toBe('c');
  });

  it('retourne undefined quand aucune forme n\'est liée', () => {
    expect(getShapeForConstructionIndex(shapes, 3)).toBeUndefined();
    expect(getShapeForConstructionIndex([], 0)).toBeUndefined();
  });

  it('une forme sans linkedIndex est traitée comme la construction principale', () => {
    expect(getShapeForConstructionIndex([{ id: 'solo' }], 0)?.id).toBe('solo');
    expect(getShapeForConstructionIndex([{ id: 'solo' }], 1)).toBeUndefined();
  });
});

describe('withShapeHeight', () => {
  it('met à jour la hauteur de la seule forme ciblée', () => {
    const updated = withShapeHeight(shapes, 'b', 3.2);
    expect(updated[0].heightM).toBe(3);
    expect(updated[1].heightM).toBe(3.2);
    expect(updated[2].heightM).toBe(4.5);
  });

  it('efface la hauteur avec undefined', () => {
    const updated = withShapeHeight(shapes, 'a', undefined);
    expect(updated[0].heightM).toBeUndefined();
  });
});

describe('withoutShapeHeights', () => {
  it('purge toutes les hauteurs (bien devenu non bâti)', () => {
    const purged = withoutShapeHeights(shapes);
    expect(purged.every((s) => s.heightM == null)).toBe(true);
    expect(purged.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });
});
