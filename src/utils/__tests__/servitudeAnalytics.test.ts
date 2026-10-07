import { describe, it, expect } from 'vitest';
import { hasDeclaredServitude, encumberedDistribution } from '../servitudeAnalytics';

describe('servitudes', () => {
  it('ne compte que les servitudes réellement déclarées', () => {
    expect(hasDeclaredServitude({ servitude_data: { hasServitude: true, width: 3 } })).toBe(true);
    expect(hasDeclaredServitude({ servitude_data: { hasServitude: false } })).toBe(false);
    expect(hasDeclaredServitude({ servitude_data: null })).toBe(false);
    expect(encumberedDistribution([
      { servitude_data: { hasServitude: true } }, { servitude_data: { hasServitude: false } }, {},
    ])).toEqual([{ name: 'Grevées', value: 1 }, { name: 'Libres', value: 2 }]);
  });
});
