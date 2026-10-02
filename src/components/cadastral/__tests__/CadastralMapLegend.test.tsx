import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import CadastralMapLegend from '../CadastralMapLegend';

const base = {
  legend: { enabled: true, items: [{ key: 'dimensions', label: 'Dimensions parcelle', mobileLabel: 'Dimensions', enabled: true }] },
  hasRoadSides: false, hasBuildings: false, hasCalculatedSides: false,
  hasMissingHeight: false, hasSubdividedParcels: false, hasLots: false,
};

describe('CadastralMapLegend', () => {
  it('adds road and building meanings only when those details are displayed', () => {
    const { rerender } = render(<CadastralMapLegend {...base} />);
    expect(screen.getAllByText('Dimensions parcelle')).toHaveLength(1);
    expect(screen.queryByText('Emprise d’une construction déclarée')).not.toBeInTheDocument();
    rerender(<CadastralMapLegend {...base} hasRoadSides hasBuildings hasCalculatedSides hasMissingHeight />);
    expect(screen.getAllByText('Côté donnant sur une voie déclarée · numéro du côté')).toHaveLength(2);
    expect(screen.getAllByText('Emprise d’une construction déclarée')).toHaveLength(2);
    expect(screen.getAllByText('Longueur d’un côté de construction')).toHaveLength(2);
    expect(screen.getAllByText('≈ : longueur calculée depuis les coordonnées')).toHaveLength(2);
    expect(screen.getAllByText('H — : hauteur non renseignée')).toHaveLength(2);
  });

  it('respects the configured visibility of the whole legend', () => {
    const { container } = render(<CadastralMapLegend {...base} legend={{ enabled: false, items: base.legend.items }} hasBuildings />);
    expect(container).toBeEmptyDOMElement();
  });
});