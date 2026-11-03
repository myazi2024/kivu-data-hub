import { describe, it, expect } from 'vitest';
import { getSecurityLevel, computeSecurityScore } from '../parcelSecurity';

describe('parcel security', () => {
  it('maps thresholds red→green', () => {
    expect(getSecurityLevel(39).level).toBe('low');
    expect(getSecurityLevel(40).level).toBe('medium');
    expect(getSecurityLevel(60).level).toBe('good');
    expect(getSecurityLevel(80).level).toBe('high');
  });
  it('excludes non-applicable criteria', () => {
    expect(computeSecurityScore([
      { weight: 20, applicable: true, done: true },
      { weight: 10, applicable: false, done: false },
      { weight: 20, applicable: true, done: false },
    ])).toBe(50);
  });
});
