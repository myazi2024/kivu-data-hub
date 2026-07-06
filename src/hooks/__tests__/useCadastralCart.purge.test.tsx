import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';

// ---- Mocks ----
vi.mock('@/lib/cookies', () => ({
  CookieManager: { getConsentStatus: () => false },
  ConsentAwareStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
}));

type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void };

const hoisted = vi.hoisted(() => {
  const state: {
    accessDeferred: { promise: Promise<any>; resolve: (v: any) => void } | null;
    getUserImpl: () => Promise<{ data: { user: { id: string } | null } }>;
    fromSpy: any;
  } = {
    accessDeferred: null,
    getUserImpl: () => Promise.resolve({ data: { user: { id: 'u1' } } }),
    fromSpy: null,
  };
  return state;
});

const makeDeferred = <T,>(): Deferred<T> => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
};

vi.mock('@/integrations/supabase/client', () => {
  const cartDraftChain = {
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
  };
  const accessChain = {
    select: () => ({
      eq: () => ({
        in: () => hoisted.accessDeferred!.promise,
      }),
    }),
  };
  const fromSpy = vi.fn((table: string) => {
    if (table === 'cadastral_service_access') return accessChain;
    return cartDraftChain;
  });
  hoisted.fromSpy = fromSpy;
  return {
    supabase: {
      from: (table: string) => fromSpy(table),
      rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
      auth: {
        getUser: () => hoisted.getUserImpl(),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
    },
  };
});

import { CadastralCartProvider, useCadastralCart, CadastralCartService } from '@/hooks/useCadastralCart';

const svc = (id: string, parcel: string): CadastralCartService => ({
  id,
  name: id,
  price: 10,
  parcel_number: parcel,
  parcel_location: 'loc',
});

interface Handle {
  add: (pn: string, sid: string) => void;
  parcels: () => ReturnType<typeof useCadastralCart>['parcels'];
}

const Probe = React.forwardRef<Handle, {}>((_, ref) => {
  const cart = useCadastralCart();
  React.useImperativeHandle(ref, () => ({
    add: (pn, sid) => cart.addServiceForParcel(pn, 'loc', svc(sid, pn)),
    parcels: () => cart.parcels,
  }), [cart]);
  return null;
});

const mount = () => {
  const ref = React.createRef<Handle>();
  render(
    <CadastralCartProvider>
      <Probe ref={ref} />
    </CadastralCartProvider>
  );
  return ref;
};

const fireCompleted = () => act(() => {
  window.dispatchEvent(new CustomEvent('cadastralPaymentCompleted'));
});

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

beforeEach(() => {
  hoisted.accessDeferred = makeDeferred();
  hoisted.getUserImpl = () => Promise.resolve({ data: { user: { id: 'u1' } } });
  hoisted.fromSpy.mockClear();
});

describe('useCadastralCart — purge post-paiement (snapshot après requête)', () => {
  it('Test 1 — parcelle ajoutée pendant la requête doit survivre', async () => {
    const ref = mount();
    act(() => ref.current!.add('P-1', 'svc-A'));

    fireCompleted();
    // Laisse getUser résoudre + .from('cadastral_service_access') être appelé
    await act(async () => { await flush(); });

    // Pendant que la requête access est en attente, on ajoute P-2
    act(() => ref.current!.add('P-2', 'svc-B'));

    // Resolve : svc-A acheté pour P-1
    await act(async () => {
      hoisted.accessDeferred.resolve({
        data: [{ parcel_number: 'P-1', service_type: 'svc-A', expires_at: null }],
        error: null,
      });
      await flush();
    });

    const final = ref.current!.parcels();
    const p2 = final.find(p => p.parcelNumber === 'P-2');
    expect(p2, 'P-2 ajoutée pendant la requête doit survivre').toBeDefined();
    expect(p2!.services.map(s => s.id)).toEqual(['svc-B']);
    expect(final.find(p => p.parcelNumber === 'P-1')).toBeUndefined();
  });

  it('Test 2 — service ajouté à une parcelle existante pendant la requête', async () => {
    const ref = mount();
    act(() => ref.current!.add('P-1', 'svc-A'));
    fireCompleted();
    await act(async () => { await flush(); });

    act(() => ref.current!.add('P-1', 'svc-B'));

    await act(async () => {
      hoisted.accessDeferred.resolve({
        data: [{ parcel_number: 'P-1', service_type: 'svc-A', expires_at: null }],
        error: null,
      });
      await flush();
    });

    const p1 = ref.current!.parcels().find(p => p.parcelNumber === 'P-1');
    expect(p1).toBeDefined();
    expect(p1!.services.map(s => s.id)).toEqual(['svc-B']);
  });

  it('Test 3 — rien acheté → panier inchangé', async () => {
    const ref = mount();
    act(() => ref.current!.add('P-1', 'svc-A'));
    const before = ref.current!.parcels();
    fireCompleted();
    await act(async () => {
      await flush();
      hoisted.accessDeferred.resolve({ data: [], error: null });
      await flush();
    });
    const after = ref.current!.parcels();
    expect(after).toBe(before);
  });

  it('Test 4 — erreur réseau ne purge rien', async () => {
    const ref = mount();
    act(() => ref.current!.add('P-1', 'svc-A'));
    fireCompleted();
    await act(async () => {
      await flush();
      hoisted.accessDeferred.resolve({ data: null, error: { message: 'boom' } });
      await flush();
    });
    const p1 = ref.current!.parcels().find(p => p.parcelNumber === 'P-1');
    expect(p1).toBeDefined();
    expect(p1!.services.map(s => s.id)).toEqual(['svc-A']);
  });

  it('Test 5 — service expiré ignoré', async () => {
    const ref = mount();
    act(() => ref.current!.add('P-1', 'svc-A'));
    fireCompleted();
    await act(async () => {
      await flush();
      hoisted.accessDeferred.resolve({
        data: [{
          parcel_number: 'P-1',
          service_type: 'svc-A',
          expires_at: new Date(Date.now() - 86400000).toISOString(),
        }],
        error: null,
      });
      await flush();
    });
    const p1 = ref.current!.parcels().find(p => p.parcelNumber === 'P-1');
    expect(p1!.services.map(s => s.id)).toEqual(['svc-A']);
  });

  it('Test 6 — utilisateur non authentifié → no-op', async () => {
    hoisted.getUserImpl = () => Promise.resolve({ data: { user: null } });
    const ref = mount();
    act(() => ref.current!.add('P-1', 'svc-A'));
    hoisted.fromSpy.mockClear();
    fireCompleted();
    await act(async () => { await flush(); });
    const accessCalls = hoisted.fromSpy.mock.calls.filter((c: any[]) => c[0] === 'cadastral_service_access');
    expect(accessCalls.length).toBe(0);
    expect(ref.current!.parcels().find(p => p.parcelNumber === 'P-1')).toBeDefined();
  });

  it('Test 7 — panier vide → pas de requête access', async () => {
    mount();
    await act(async () => { await flush(); });
    hoisted.fromSpy.mockClear();
    fireCompleted();
    await act(async () => { await flush(); });
    const accessCalls = hoisted.fromSpy.mock.calls.filter((c: any[]) => c[0] === 'cadastral_service_access');
    expect(accessCalls.length).toBe(0);
  });
});
