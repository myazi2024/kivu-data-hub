import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
    expect(screen.getByText('Côté donnant sur une voie déclarée · numéro du côté')).toBeInTheDocument();
    expect(screen.getByText('Emprise d’une construction déclarée')).toBeInTheDocument();
    expect(screen.getByText('Longueur d’un côté de construction')).toBeInTheDocument();
    expect(screen.getByText('≈ : longueur calculée depuis les coordonnées')).toBeInTheDocument();
    expect(screen.getByText('H — : hauteur non renseignée')).toBeInTheDocument();
  });

  it('respects the configured visibility of the whole legend', () => {
    const { container } = render(<CadastralMapLegend {...base} legend={{ enabled: false, items: base.legend.items }} hasBuildings />);
    expect(container).toBeEmptyDOMElement();
  });
});