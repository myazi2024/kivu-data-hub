import { describe, expect, it } from 'vitest';
import { getParcelBuildings } from '../parcelBuildings';

const vertices = [
  { lat: -1.6794, lng: 29.2273 },
  { lat: -1.6794, lng: 29.2274 },
  { lat: -1.6795, lng: 29.2274 },
];

describe('getParcelBuildings', () => {
  it('uses declared side lengths and height, calculating only missing side lengths', () => {
    const [building] = getParcelBuildings([{ vertices, sides: [{ length: '12' }, { length: null }], heightM: 9, linkedIndex: 1 }]);
    expect(building.index).toBe(1);
    expect(building.heightM).toBe(9);
    expect(building.sides[0]).toEqual({ lengthM: 12, calculated: false });
    expect(building.sides[1].calculated).toBe(true);
    expect(building.sides[1].lengthM).toBeGreaterThan(0);
  });

  it('does not invent a height or a footprint for absent or malformed data', () => {
    expect(getParcelBuildings(null)).toEqual([]);
    expect(getParcelBuildings([{ vertices: [{ lat: 0, lng: 0 }] }])).toEqual([]);
    expect(getParcelBuildings([{ vertices: [{ lat: 0, lng: 0 }, { lat: 'invalid', lng: 1 }, { lat: 1, lng: 1 }] }])).toEqual([]);
    expect(getParcelBuildings([{ vertices, heightM: null }])[0].heightM).toBeNull();
  });
});