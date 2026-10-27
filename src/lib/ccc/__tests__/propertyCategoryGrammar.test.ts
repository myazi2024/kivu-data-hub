import { describe, it, expect } from 'vitest';
import { rentalQuestion, occupiedQuestion, rentalModeQuestion } from '../propertyCategoryGrammar';

describe('propertyCategoryGrammar', () => {
  it('féminin', () => {
    expect(rentalQuestion('Maison')).toBe('Cette maison, dans son intégralité ou en partie, est-elle proposée à la location ?');
    expect(occupiedQuestion('Villa')).toBe('Votre villa est-elle habitée ?');
  });
  it('masculin avec cet', () => {
    expect(rentalQuestion('Immeuble/Bâtiment')).toBe('Cet immeuble, dans son intégralité ou en partie, est-il proposé à la location ?');
    expect(rentalModeQuestion('Entrepôt/Hangar')).toBe('Comment cet entrepôt est-il proposé à la location ?');
  });
  it('appartement sans « en partie »', () => {
    expect(rentalQuestion('Appartement')).toBe('Cet appartement est-il proposé à la location ?');
  });
  it('catégorie vide', () => {
    expect(rentalQuestion(undefined)).toBe('Ce bien, dans son intégralité ou en partie, est-il proposé à la location ?');
  });
});
