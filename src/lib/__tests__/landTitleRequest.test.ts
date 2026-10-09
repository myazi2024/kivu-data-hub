import { describe, it, expect } from 'vitest';
import { mapLandTitleTypeKey } from '@/lib/landTitleTypeKey';
import { validatePhone } from '@/hooks/useLandTitleRequest';

describe('mapLandTitleTypeKey (miroir serveur)', () => {
  it.each([
    ["Certificat d'enregistrement", 'certificat_enregistrement'],
    ['Concession perpétuelle', 'concession_perpetuelle'],
    ['Bail emphytéotique agricole (18-99 ans)', 'bail_emphyteotique'],
    ["Permis d'occupation urbain", 'permis_occupation'],
    ["Autorisation d'occupation provisoire", 'autorisation_occupation'],
    ['Bail location', 'location'],
    ['Bail foncier', 'concession_ordinaire'],
    ['Concession ordinaire', 'concession_ordinaire'],
  ])('%s → %s', (label, key) => expect(mapLandTitleTypeKey(label)).toBe(key));
  it('défaut si vide', () => expect(mapLandTitleTypeKey(null)).toBe('concession_ordinaire'));
});

describe('validatePhone (même règle que le serveur)', () => {
  it('accepte les formats RDC', () => {
    expect(validatePhone('+243 812345678')).toBe(true);
    expect(validatePhone('243812345678')).toBe(true);
    expect(validatePhone('+243 (81) 234-5678')).toBe(true);
  });
  it('refuse les autres', () => {
    expect(validatePhone('0812345678')).toBe(false);
    expect(validatePhone('+24381234567')).toBe(false);
  });
});
