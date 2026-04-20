import { useCallback, useEffect, useRef, useState } from 'react';
import { CookieManager, ConsentAwareStorage } from '@/lib/cookies';
import { supabase } from '@/integrations/supabase/client';

/**
 * Code de remise mémorisé par parcelle dans le panier.
 * Persiste en localStorage (consent-aware), TTL aligné sur le panier (24h).
 * P5 : également synchronisé sur Supabase pour les utilisateurs connectés.
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
 * Synchronisation cross-tab via `storage` event + sync Supabase pour utilisateurs connectés.
 */
export const useCartDiscounts = () => {
  const [map, setMap] = useState<DiscountMap>(() => loadFromStorage());
  const [userId, setUserId] = useState<string | null>(null);
  const skipNextPush = useRef(true); // évite de pousser au mount avant pull

  // Persistance locale
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

  // Suivi auth
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Pull au login : merge distant si plus récent
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('cadastral_cart_drafts')
          .select('discounts_data, updated_at')
          .eq('user_id', userId)
          .maybeSingle();
        if (cancelled || error || !data) return;
        const remote = data.discounts_data as unknown as DiscountMap | null;
        if (!remote || typeof remote !== 'object') return;
        const localRaw = ConsentAwareStorage.getItem(STORAGE_KEY);
        const localAt = localRaw ? (JSON.parse(localRaw).savedAt || 0) : 0;
        const remoteAt = new Date(data.updated_at).getTime();
        const localEmpty = Object.keys(map).length === 0;
        if (remoteAt > localAt || localEmpty) {
          skipNextPush.current = true;
          setMap(remote);
        }
      } catch (e) {
        console.error('Cart discounts pull failed:', e);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Push debounced 800ms
  useEffect(() => {
    if (!userId) return;
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      try {
        await supabase.rpc('upsert_cadastral_cart_draft', {
          _cart_data: null as any,
          _discounts_data: map as any,
        });
      } catch (e) {
        console.error('Cart discounts push failed:', e);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [map, userId]);

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
