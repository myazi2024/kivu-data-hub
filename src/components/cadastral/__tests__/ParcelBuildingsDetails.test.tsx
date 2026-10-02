import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ParcelBuildingsDetails from '../ParcelBuildingsDetails';

describe('ParcelBuildingsDetails', () => {
  it('lists sides and height and selects the corresponding outline', () => {
    const onSelectBuilding = vi.fn();
    render(<ParcelBuildingsDetails buildings={[{
      index: 0, vertices: [{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }, { lat: 1, lng: 0 }],
      heightM: 6, sides: [{ lengthM: 5, calculated: false }, { lengthM: 7.2, calculated: true }, { lengthM: null, calculated: true }],
    }]} selectedBuilding={null} onSelectBuilding={onSelectBuilding} />);
    expect(screen.getByText('Construction principale')).toBeInTheDocument();
    expect(screen.getByText('H · 6 m')).toBeInTheDocument();
    expect(screen.getByText('≈ 7,2 m')).toBeInTheDocument();
    expect(screen.getByText('Non renseigné')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Repérer la construction 1 sur la carte' }));
    expect(onSelectBuilding).toHaveBeenCalledWith(0);
  });

  it('does not show a building section for an empty parcel', () => {
    render(<ParcelBuildingsDetails buildings={[]} selectedBuilding={null} onSelectBuilding={() => {}} />);
    expect(screen.queryByRole('region', { name: 'Constructions de la parcelle' })).not.toBeInTheDocument();
  });
});