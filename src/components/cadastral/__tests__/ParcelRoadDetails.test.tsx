import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ParcelRoadDetails from '@/components/cadastral/ParcelRoadDetails';

describe('ParcelRoadDetails', () => {
  it('shows public road attributes by side without turning unknown into false', () => {
    render(<ParcelRoadDetails
      sides={[{ sideIndex: 1, bordersRoad: true, roadType: 'Avenue', roadName: 'Lac', roadSurface: 'asphalte', roadWidth: 8, hasStreetLighting: true, streetLampCount: 2, hasGutter: false }]}
      selectedSide={null} onSelectSide={() => {}} coordinateCount={4}
    />);
    expect(screen.getByText('Avenue · Lac')).toBeInTheDocument();
    expect(screen.getByText('Asphalte / bitume')).toBeInTheDocument();
    expect(screen.getByText('8 m')).toBeInTheDocument();
    expect(screen.getByText('Éclairage public · 2 lampadaire(s)')).toBeInTheDocument();
    expect(screen.getByText('Sans caniveau')).toBeInTheDocument();
  });

  it('keeps details readable without a parcel outline', () => {
    render(<ParcelRoadDetails sides={[{ sideIndex: 0, bordersRoad: true }]}
      selectedSide={null} onSelectSide={() => {}} coordinateCount={0} />);
    expect(screen.getByText('Éclairage non renseigné')).toBeInTheDocument();
    expect(screen.getByText('Caniveau non renseigné')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Repérer le côté 1 sur la carte' })).toBeDisabled();
  });

  it('locates a road side when a valid outline exists', () => {
    let selected: number | null = null;
    render(<ParcelRoadDetails sides={[{ sideIndex: 2, bordersRoad: true }]}
      selectedSide={null} onSelectSide={(side) => { selected = side; }} coordinateCount={4} />);
    fireEvent.click(screen.getByRole('button', { name: 'Repérer le côté 3 sur la carte' }));
    expect(selected).toBe(2);
  });
});