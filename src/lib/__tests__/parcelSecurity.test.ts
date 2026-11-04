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

import { getParcelAlerts, getQuickAction, sortParcels } from '../parcelSecurity';
describe('alerts, quick links, sort', () => {
  const c = (key: string, done: boolean, applicable = true) => ({ key, label: key, done, applicable });
  it('lists critical alerts first and ignores done/non-applicable', () => {
    const a = getParcelAlerts([c('expertise', false), c('no_dispute', false), c('no_mortgage', true), c('no_arrears', false, false)]);
    expect(a.map((x) => x.key)).toEqual(['no_dispute', 'expertise']);
  });
  it('maps tax to the map service and history to a correction', () => {
    expect(getQuickAction('tax_current')?.kind).toBe('map');
    expect(getQuickAction('ownership_history')?.kind).toBe('edit');
    expect(getQuickAction('unknown')).toBeNull();
  });
  it('sorts weakest first and filters parcels with alerts', () => {
    const l = [
      { parcel_number: 'A', security_score: 70, owner_linked_at: null, alerts: 0 },
      { parcel_number: 'B', security_score: 20, owner_linked_at: null, alerts: 2 },
    ];
    expect(sortParcels(l, 'score_asc').map((p) => p.parcel_number)).toEqual(['B', 'A']);
    expect(sortParcels(l, 'score_asc', true).map((p) => p.parcel_number)).toEqual(['B']);
  });
});
