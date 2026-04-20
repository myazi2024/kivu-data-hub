import { useCallback, useEffect, useState } from 'react';
import { CookieManager, ConsentAwareStorage } from '@/lib/cookies';

/**
 * Code de remise mémorisé par parcelle dans le panier.
 * Persiste en localStorage (consent-aware), TTL aligné sur le panier (24h).
 */
export interface CartDiscountEntry {
  code: string;
  amount: number;
  reseller_id: string | null;
  code_id: string;
  appliedAt: number;
}

const STORAGE_KEY = 'bic-cart-discounts';
const TTL_MS = 24 * 60 * 60 * 1000;

type DiscountMap = Record<string, CartDiscountEntry>;

const loadFromStorage = (): DiscountMap => {
  try {
    const consent = CookieManager.getConsentStatus();
    if (consent === false) return {};
    const raw = ConsentAwareStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { savedAt?: number; map?: DiscountMap };
    if (!parsed.map || !parsed.savedAt || Date.now() - parsed.savedAt > TTL_MS) {
      ConsentAwareStorage.removeItem(STORAGE_KEY);
      return {};
    }
    return parsed.map;
  } catch {
    return {};
  }
};

const saveToStorage = (map: DiscountMap) => {
  try {
    const consent = CookieManager.getConsentStatus();
    if (consent === false) return;
    ConsentAwareStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ map, savedAt: Date.now() })
    );
  } catch {
    /* noop */
  }
};

/**
 * Hook léger : code promo par parcelle, partagé entre drawer panier et CadastralBillingPanel.
 * Synchronisation cross-tab via `storage` event.
 */
export const useCartDiscounts = () => {
  const [map, setMap] = useState<DiscountMap>(() => loadFromStorage());

  // Persistance
  useEffect(() => {
    saveToStorage(map);
  }, [map]);

  // Sync cross-tab + même fenêtre via custom event
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setMap(loadFromStorage());
    };
    const onLocal = () => setMap(loadFromStorage());
    window.addEventListener('storage', onStorage);
    window.addEventListener('cartDiscountsUpdated', onLocal);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('cartDiscountsUpdated', onLocal);
    };
  }, []);

  const set = useCallback((parcelNumber: string, entry: Omit<CartDiscountEntry, 'appliedAt'>) => {
    setMap((prev) => {
      const next = { ...prev, [parcelNumber]: { ...entry, appliedAt: Date.now() } };
      saveToStorage(next);
      window.dispatchEvent(new CustomEvent('cartDiscountsUpdated'));
      return next;
    });
  }, []);

  const clear = useCallback((parcelNumber: string) => {
    setMap((prev) => {
      if (!prev[parcelNumber]) return prev;
      const { [parcelNumber]: _, ...rest } = prev;
      saveToStorage(rest);
      window.dispatchEvent(new CustomEvent('cartDiscountsUpdated'));
      return rest;
    });
  }, []);

  const get = useCallback((parcelNumber: string) => map[parcelNumber] || null, [map]);

  return { map, get, set, clear };
};
