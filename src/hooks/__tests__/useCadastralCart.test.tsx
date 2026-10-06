import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/lib/cookies', () => ({
  CookieManager: { getConsentStatus: () => false },
  ConsentAwareStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  },
}));

import { CadastralCartProvider, useCadastralCart } from '../useCadastralCart';

const wrapper = ({ children }: { children: React.ReactNode }) => <CadastralCartProvider>{children}</CadastralCartProvider>;
const svc = (id: string, price = 10, pn = 'P1') => ({ id, name: id, price, parcel_number: pn, parcel_location: 'Lubumbashi' });

describe('useCadastralCart', () => {
  it('retire uniquement les services payés et garde les autres', () => {
    const { result } = renderHook(() => useCadastralCart(), { wrapper });
    act(() => {
      result.current.addServiceForParcel('P1', 'Lubumbashi', svc('a'));
      result.current.addServiceForParcel('P1', 'Lubumbashi', svc('b'));
    });
    act(() => result.current.removeServicesForParcel('P1', ['a']));
    expect(result.current.parcels[0].services.map(s => s.id)).toEqual(['b']);
    act(() => result.current.removeServicesForParcel('P1', ['b']));
    expect(result.current.parcels).toHaveLength(0);
  });

  it('aligne prix, noms et catégories sur le catalogue et retire les services disparus', () => {
    const { result } = renderHook(() => useCadastralCart(), { wrapper });
    act(() => {
      result.current.addServiceForParcel('P1', 'L', svc('a', 10));
      result.current.addServiceForParcel('P2', 'L', svc('b', 5, 'P2'));
    });
    act(() => result.current.syncWithCatalog([{ id: 'a', name: 'A', price: 12, category: 'fiscal' }]));
    expect(result.current.parcels).toHaveLength(1);
    expect(result.current.parcels[0].services[0]).toMatchObject({ id: 'a', name: 'A', price: 12, category: 'fiscal' });
    expect(result.current.getTotalAcrossParcels()).toBe(12);
  });

  it('mémorise les services disponibles d’une parcelle présente dans le panier seulement', () => {
    const { result } = renderHook(() => useCadastralCart(), { wrapper });
    act(() => result.current.setParcelAvailability('P1', ['x']));
    expect(result.current.parcels).toHaveLength(0);
    act(() => result.current.addServiceForParcel('P1', 'L', svc('a')));
    act(() => result.current.setParcelAvailability('P1', ['b', 'a']));
    expect(result.current.parcels[0].availableServiceIds).toEqual(['a', 'b']);
  });

  it('ignore les doublons', () => {
    const { result } = renderHook(() => useCadastralCart(), { wrapper });
    act(() => {
      result.current.addServiceForParcel('P1', 'L', svc('a'));
      result.current.addServiceForParcel('P1', 'L', svc('a'));
    });
    expect(result.current.parcels[0].services).toHaveLength(1);
  });
});
