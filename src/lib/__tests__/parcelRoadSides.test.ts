import { describe, expect, it } from 'vitest';
import { getParcelRoadSides, sideNumber } from '@/lib/parcelRoadSides';

describe('parcel road sides', () => {
  it('keeps declared road sides and their original coordinate indexes', () => {
    const sides = getParcelRoadSides([
      { sideIndex: 0, hasRoad: false, roadName: 'Non' },
      { sideIndex: 1, hasRoad: true, roadName: 'Avenue A' },
      { sideIndex: 2, bordersRoad: true, roadSurface: 'terre' },
      { sideIndex: 3, borderType: 'route', hasGutter: false },
    ]);
    expect(sides.map((side) => sideNumber(side, 0))).toEqual([2, 3, 4]);
  });

  it('uses source array position for legacy entries without sideIndex', () => {
    expect(getParcelRoadSides([{ hasRoad: false }, { bordersRoad: true }])[0]?.sideIndex).toBe(1);
  });

  it('does not interpret absent data as a road', () => {
    expect(getParcelRoadSides(null)).toEqual([]);
    expect(getParcelRoadSides([{ hasGutter: true }, null, { hasRoad: false, bordersRoad: true }])).toEqual([]);
  });
});