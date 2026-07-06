import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';

// Mock hoisted state for the supabase client
const mockState = vi.hoisted(() => ({
  zoningRows: [] as any[],
  countResult: { count: 0 },
}));

vi.mock('@/integrations/supabase/client', () => {
  const buildQuery = (rows: any[]) => {
    const q: any = {
      select: vi.fn(() => q),
      eq: vi.fn(() => q),
      in: vi.fn(() => q),
      then: (onF: any) => Promise.resolve({ data: rows, error: null, count: mockState.countResult.count }).then(onF),
    };
    return q;
  };
  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'subdivision_zoning_rules') return buildQuery(mockState.zoningRows);
        // status flag tables (count: head)
        return buildQuery([]);
      }),
    },
  };
});

import { useParentParcelEligibility } from '../useParentParcelEligibility';

beforeEach(() => {
  mockState.zoningRows = [];
  mockState.countResult = { count: 0 };
});

const baseGeo = { ville: 'Kinshasa', commune: 'Gombe', quartier: 'Q1' };

describe('useParentParcelEligibility — parent area', () => {
  it('PARENT_TOO_SMALL when area < parent_min_area_sqm', async () => {
    mockState.zoningRows = [{
      location_name: 'Q1', section_type: 'urban',
      parent_min_area_sqm: 1000, parent_max_area_sqm: null,
      require_registered_title: false, exclude_title_types: [],
      min_title_age_years: 0, require_gps_coordinates: false, min_gps_points: 0,
      allow_if_active_dispute: true, allow_if_active_mortgage: true,
      allow_if_pending_mutation: true, allow_if_pending_subdivision: true,
    }];
    const { result } = renderHook(() => useParentParcelEligibility(
      { parcel_number: 'P-1', area_sqm: 500, gps_coordinates: [{lat:0,lng:0}] },
      baseGeo,
    ));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.eligible).toBe(false);
    expect(result.current.issues.some(i => i.code === 'PARENT_TOO_SMALL')).toBe(true);
  });

  it('PARENT_TOO_LARGE when area > parent_max_area_sqm', async () => {
    mockState.zoningRows = [{
      location_name: 'Q1', section_type: 'urban',
      parent_min_area_sqm: 100, parent_max_area_sqm: 5000,
      require_registered_title: false, exclude_title_types: [],
      min_title_age_years: 0, require_gps_coordinates: false, min_gps_points: 0,
      allow_if_active_dispute: true, allow_if_active_mortgage: true,
      allow_if_pending_mutation: true, allow_if_pending_subdivision: true,
    }];
    const { result } = renderHook(() => useParentParcelEligibility(
      { parcel_number: 'P-2', area_sqm: 12000 },
      baseGeo,
    ));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.issues.some(i => i.code === 'PARENT_TOO_LARGE')).toBe(true);
  });

  it('eligible when area within range', async () => {
    mockState.zoningRows = [{
      location_name: 'Q1', section_type: 'urban',
      parent_min_area_sqm: 500, parent_max_area_sqm: 5000,
      require_registered_title: false, exclude_title_types: [],
      min_title_age_years: 0, require_gps_coordinates: false, min_gps_points: 0,
      allow_if_active_dispute: true, allow_if_active_mortgage: true,
      allow_if_pending_mutation: true, allow_if_pending_subdivision: true,
    }];
    const { result } = renderHook(() => useParentParcelEligibility(
      { parcel_number: 'P-3', area_sqm: 2000 },
      baseGeo,
    ));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.eligible).toBe(true);
    expect(result.current.ruleApplied).toBe(true);
  });

  it('falls back to wildcard rule "*" when no specific match', async () => {
    mockState.zoningRows = [{
      location_name: '*', section_type: 'urban',
      parent_min_area_sqm: 800, parent_max_area_sqm: null,
      require_registered_title: false, exclude_title_types: [],
      min_title_age_years: 0, require_gps_coordinates: false, min_gps_points: 0,
      allow_if_active_dispute: true, allow_if_active_mortgage: true,
      allow_if_pending_mutation: true, allow_if_pending_subdivision: true,
    }];
    const { result } = renderHook(() => useParentParcelEligibility(
      { parcel_number: 'P-4', area_sqm: 600 },
      baseGeo,
    ));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.matchedLocation).toBe('*');
    expect(result.current.issues.some(i => i.code === 'PARENT_TOO_SMALL')).toBe(true);
  });
});
