import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CCCIntroDialog from '../CCCIntroDialog';

function textOf(parcel: string) {
  render(<CCCIntroDialog open onOpenChange={() => {}} onContinue={() => {}} parcelNumber={parcel} />);
  const card = screen.getByText('À propos de ce service').closest('div');
  const p = card?.parentElement?.querySelector('p');
  return (p?.textContent || '').replace(/\s+/g, ' ').trim();
}

describe('À propos de ce service', () => {
  it('avec un numéro recherché', () => {
    const t = textOf('355432');
    console.log('WITH:', t);
    expect(t).toContain('vérification poussée');
    expect(t).toContain('355432');
    expect(t).toContain('n\'a pas eu de correspondance, c\'est probablement');
    expect(t).toContain('méthodologie différente');
    expect(t).toContain('auprès du cadastre numérique');
    expect(t).toContain('BIC pourra l\'ajouter au registre national');
  });
  it('sans numéro recherché', () => {
    const t = textOf('   ');
    console.log('EMPTY:', t);
    expect(t).toContain('Si aucune correspondance n\'a été trouvée pour votre parcelle, c\'est probablement');
    expect(t).not.toContain('«');
  });
});
