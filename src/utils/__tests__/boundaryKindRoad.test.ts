import { describe, it, expect } from 'vitest';
import { boundaryKindImpliesRoad, boundaryKindLabel } from '@/components/cadastral/ParcelSidesDimensionsPanel';

describe('nature de la limite et route', () => {
  it('Mur et Limite (sans mur) impliquent une route', () => {
    expect(boundaryKindImpliesRoad('mur')).toBe(true);
    expect(boundaryKindImpliesRoad('limite')).toBe(true);
  });
  it('les choix mitoyens excluent la route', () => {
    expect(boundaryKindImpliesRoad('mur_mitoyen')).toBe(false);
    expect(boundaryKindImpliesRoad('limite_mitoyenne')).toBe(false);
  });
  it('libellé de la limite mitoyenne', () => {
    expect(boundaryKindLabel('limite_mitoyenne')).toBe('Limite (sans mur) mitoyenne');
  });
});
