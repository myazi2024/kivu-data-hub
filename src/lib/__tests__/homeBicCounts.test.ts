import { describe, expect, it } from 'vitest';
import { displayHomeCount, validCount } from '../homeBicCounts';

describe('BIC homepage counts', () => {
  it('uses configured values until the real count exceeds 10,000', () => {
    expect(displayHomeCount(10_000, 5400, 1)).toBe(5400);
    expect(displayHomeCount(10_001, 5400, 1)).toBe(10_001);
  });
  it('falls back safely when counts are unavailable or invalid', () => {
    expect(displayHomeCount(null, 500, 1)).toBe(500);
    expect(displayHomeCount(-1, -20, 1)).toBe(1);
    expect(validCount(1.5)).toBeNull();
    expect(validCount('10001')).toBeNull();
  });
});