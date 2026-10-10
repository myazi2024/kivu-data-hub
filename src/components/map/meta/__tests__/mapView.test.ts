import { describe, expect, it } from 'vitest';
import { resolveMapView } from '../mapView';

const base = {
  projectionActive: false,
  landDistrictSelected: false,
  provinceSelected: false,
  sectionType: 'all',
};

describe('resolveMapView', () => {
  it('affiche les circonscriptions par défaut', () => {
    expect(resolveMapView(base)).toBe('districts');
  });

  it('reste sur les circonscriptions quand seule une province est filtrée', () => {
    expect(resolveMapView({ ...base, provinceSelected: true })).toBe('districts');
  });

  it('garde la vue circonscriptions quand une circonscription est sélectionnée, même avec un ancrage commune', () => {
    expect(
      resolveMapView({
        ...base,
        landDistrictSelected: true,
        ville: 'Kinshasa',
        commune: 'Ngaliema',
        sectionType: 'urbaine',
      }),
    ).toBe('districts');
  });

  it('donne la priorité au mode visuel (carte des provinces)', () => {
    expect(resolveMapView({ ...base, projectionActive: true, landDistrictSelected: true })).toBe('provinces');
  });

  it('passe aux territoires en zone rurale', () => {
    expect(resolveMapView({ ...base, sectionType: 'rurale' })).toBe('territoires');
  });

  it('passe aux territoires quand un territoire de la province choisie est filtré', () => {
    expect(resolveMapView({ ...base, territoire: 'Mwenga', provinceSelected: true })).toBe('territoires');
  });

  it('passe aux quartiers quand la ville et la commune sont filtrées', () => {
    expect(resolveMapView({ ...base, ville: 'Goma', commune: 'Karisimbi' })).toBe('quartiers');
  });

  it('passe aux communes quand seule la ville est filtrée', () => {
    expect(resolveMapView({ ...base, ville: 'Goma' })).toBe('communes');
  });

  it('revient aux circonscriptions quand le filtre est retiré', () => {
    expect(resolveMapView({ ...base, landDistrictSelected: false })).toBe('districts');
  });
});
