import { describe, expect, it } from 'vitest';
import { getLandDistrictAnchor } from '@/lib/geographicData';

describe('getLandDistrictAnchor', () => {
  it('Goma est calquée sur la commune, pas la ville', () => {
    expect(getLandDistrictAnchor('Nord-Kivu', 'Goma')).toMatchObject({ level: 'commune', ville: 'Goma', commune: 'Goma' });
  });
  it('Karisimbi → commune', () => {
    expect(getLandDistrictAnchor('Nord-Kivu', 'Karisimbi')).toMatchObject({ level: 'commune', commune: 'Karisimbi' });
  });
  it('Beni-Ville → ville', () => {
    expect(getLandDistrictAnchor('Nord-Kivu', 'Beni-Ville')).toMatchObject({ level: 'ville', ville: 'Beni', partial: false });
  });
  it('Rutshuru → territoire', () => {
    expect(getLandDistrictAnchor('Nord-Kivu', 'Rutshuru')).toMatchObject({ level: 'territoire', territoire: 'Rutshuru' });
  });
  it('Kalehe-Nord → territoire partiel', () => {
    expect(getLandDistrictAnchor('Sud-Kivu', 'Kalehe-Nord')).toMatchObject({ level: 'territoire', territoire: 'Kalehe', partial: true });
  });
  it('nom inconnu → rien', () => {
    expect(getLandDistrictAnchor('Nord-Kivu', 'Kyondo').level).toBeNull();
    expect(getLandDistrictAnchor('Nord-Kivu', 'Inexistant').level).toBeNull();
  });
});
