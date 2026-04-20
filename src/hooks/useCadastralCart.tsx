import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback, useMemo } from 'react';
import { CookieManager, ConsentAwareStorage } from '@/lib/cookies';
import { supabase } from '@/integrations/supabase/client';

export interface CadastralCartService {
  id: string;
  name: string;
  price: number;
  description?: string;
  parcel_number: string;
  parcel_location: string;
  /** Optionnel : catégorie du service (consultation/fiscal/juridique). */
  category?: string;
}

/**
 * Représente un groupe de services pour une parcelle donnée.
 * Le panier multi-parcelles est une collection de tels groupes.
 */
export interface CadastralCartParcel {
  parcelNumber: string;
  parcelLocation: string;
  services: CadastralCartService[];
  /** Timestamp d'ajout (ms epoch) — sert au tri stable du drawer. */
  addedAt: number;
}

interface CadastralCartContextType {
  // ===== API multi-parcelles (Phase 1) =====
  parcels: CadastralCartParcel[];
  addServiceForParcel: (parcelNumber: string, parcelLocation: string, service: CadastralCartService) => void;
  removeServiceForParcel: (parcelNumber: string, serviceId: string) => void;
  clearParcel: (parcelNumber: string) => void;
  getParcelCount: () => number;
  getTotalAcrossParcels: () => number;

  // ===== API mono-parcelle rétro-compatible (proxy sur la parcelle active) =====
  selectedServices: CadastralCartService[];
  addService: (service: CadastralCartService) => void;
  addServices: (services: CadastralCartService[]) => void;
  removeService: (serviceId: string) => void;
  clearServices: () => void;
  resetCart: () => void;
  getTotalAmount: () => number;
  getServiceCount: () => number;
  isSelected: (serviceId: string) => boolean;
  toggleService: (service: CadastralCartService) => void;
  updateServicePrices: (updates: { id: string; price: number }[]) => void;
  parcelNumber: string | null;
  setParcelNumber: (parcelNumber: string) => void;
}

const CadastralCartContext = createContext<CadastralCartContextType | undefined>(undefined);

const STORAGE_KEY = 'bic-cadastral-cart';
const CART_TTL_MS = 24 * 60 * 60 * 1000;

export const CadastralCartProvider = ({ children }: { children: ReactNode }) => {
  const [parcelsMap, setParcelsMap] = useState<Record<string, CadastralCartParcel>>({});
  const [activeParcelNumber, setActiveParcelNumber] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // ---------- Hydratation depuis storage (avec migration silencieuse v1 → v2) ----------
  useEffect(() => {
    const consent = CookieManager.getConsentStatus();
    if (consent === false) {
      setHydrated(true);
      return;
    }

    try {
      const saved = ConsentAwareStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setHydrated(true);
        return;
      }
      const parsed = JSON.parse(saved);
      const savedAt = parsed.savedAt || 0;
      if (Date.now() - savedAt > CART_TTL_MS) {
        ConsentAwareStorage.removeItem(STORAGE_KEY);
        setHydrated(true);
        return;
      }

      // v2/v3 : { parcelsMap, activeParcelNumber, savedAt }
      if (parsed.parcelsMap && typeof parsed.parcelsMap === 'object') {
        // Migration v2 → v3 : ajout de addedAt si absent
        const now = Date.now();
        const migrated: Record<string, CadastralCartParcel> = {};
        Object.entries(parsed.parcelsMap as Record<string, any>).forEach(([pn, p], idx) => {
          migrated[pn] = {
            parcelNumber: p.parcelNumber ?? pn,
            parcelLocation: p.parcelLocation ?? '',
            services: p.services ?? [],
            addedAt: typeof p.addedAt === 'number' ? p.addedAt : now - (1000 - idx),
          };
        });
        setParcelsMap(migrated);
        setActiveParcelNumber(parsed.activeParcelNumber || null);
        setHydrated(true);
        return;
      }

      // v1 : { services: [...], parcelNumber, savedAt } → migration
      const legacyServices: CadastralCartService[] = parsed.services || [];
      const legacyParcel: string | null = parsed.parcelNumber || null;
      if (legacyParcel && legacyServices.length > 0) {
        const location = legacyServices[0]?.parcel_location || '';
        setParcelsMap({
          [legacyParcel]: { parcelNumber: legacyParcel, parcelLocation: location, services: legacyServices, addedAt: Date.now() },
        });
        setActiveParcelNumber(legacyParcel);
      } else if (legacyParcel) {
        setActiveParcelNumber(legacyParcel);
      }
      setHydrated(true);
    } catch (error) {
      console.error('Error loading cadastral cart:', error);
      setHydrated(true);
    }
  }, []);

  // ---------- Persistance (debounced 300ms) ----------
  useEffect(() => {
    const consent = CookieManager.getConsentStatus();
    if (consent === false) return;

    const timer = setTimeout(() => {
      const data = JSON.stringify({
        parcelsMap,
        activeParcelNumber,
        savedAt: Date.now(),
      });
      ConsentAwareStorage.setItem(STORAGE_KEY, data);
    }, 300);

    return () => clearTimeout(timer);
  }, [parcelsMap, activeParcelNumber]);

  // ---------- P5 : Sync Supabase pour utilisateurs connectés ----------
  // Suit l'auth (login/logout), tire le panier distant au login (merge "le plus récent gagne"),
  // et pousse les modifs locales en debounce 800ms.
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

  // Pull au login : merge distant si plus récent que local
  useEffect(() => {
    if (!hydrated || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('cadastral_cart_drafts')
          .select('cart_data, updated_at')
          .eq('user_id', userId)
          .maybeSingle();
        if (cancelled || error || !data) return;
        const remote = data.cart_data as any;
        if (!remote || typeof remote !== 'object' || !remote.parcelsMap) return;
        const remoteAt = new Date(data.updated_at).getTime();
        const localRaw = ConsentAwareStorage.getItem(STORAGE_KEY);
        const localAt = localRaw ? (JSON.parse(localRaw).savedAt || 0) : 0;
        // Préfère le plus récent ; si local vide, on prend toujours le distant
        const localEmpty = Object.keys(parcelsMap).length === 0;
        if (remoteAt > localAt || localEmpty) {
          const migrated: Record<string, CadastralCartParcel> = {};
          Object.entries(remote.parcelsMap as Record<string, any>).forEach(([pn, p]) => {
            migrated[pn] = {
              parcelNumber: p.parcelNumber ?? pn,
              parcelLocation: p.parcelLocation ?? '',
              services: p.services ?? [],
              addedAt: typeof p.addedAt === 'number' ? p.addedAt : Date.now(),
            };
          });
          setParcelsMap(migrated);
          if (remote.activeParcelNumber) setActiveParcelNumber(remote.activeParcelNumber);
        }
      } catch (e) {
        console.error('Cart remote pull failed:', e);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, hydrated]);

  // Push debounced 800ms vers Supabase via RPC unifiée (évite race avec discounts)
  useEffect(() => {
    if (!hydrated || !userId) return;
    const timer = setTimeout(async () => {
      try {
        await supabase.rpc('upsert_cadastral_cart_draft', {
          _cart_data: { parcelsMap, activeParcelNumber } as any,
          _discounts_data: null as any,
        });
      } catch (e) {
        console.error('Cart remote push failed:', e);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [parcelsMap, activeParcelNumber, userId, hydrated]);

  // ---------- Purge post-paiement (P6) ----------
  // Listener stable (pas de dépendance) — utilise une ref pour lire le dernier parcelsMap.
  // Évite la fenêtre de course où un événement serait perdu entre remove/addEventListener.
  const parcelsMapRef = useRef(parcelsMap);
  useEffect(() => { parcelsMapRef.current = parcelsMap; }, [parcelsMap]);

  useEffect(() => {
    const handler = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) return;
      const snapshot = Object.values(parcelsMapRef.current);
      if (snapshot.length === 0) return;
      try {
        const { data, error } = await supabase
          .from('cadastral_service_access')
          .select('parcel_number, service_type, expires_at')
          .eq('user_id', userId)
          .in('parcel_number', snapshot.map(p => p.parcelNumber));
        if (error || !data) return;
        const ownedByParcel = new Map<string, Set<string>>();
        for (const row of data) {
          if (row.expires_at && new Date(row.expires_at) <= new Date()) continue;
          if (!ownedByParcel.has(row.parcel_number)) ownedByParcel.set(row.parcel_number, new Set());
          ownedByParcel.get(row.parcel_number)!.add(row.service_type);
        }
        setParcelsMap(prev => {
          const next: Record<string, CadastralCartParcel> = {};
          let changed = false;
          for (const [pn, p] of Object.entries(prev)) {
            const owned = ownedByParcel.get(pn);
            if (!owned || owned.size === 0) { next[pn] = p; continue; }
            const remaining = p.services.filter(s => !owned.has(s.id));
            if (remaining.length === p.services.length) { next[pn] = p; continue; }
            changed = true;
            if (remaining.length > 0) next[pn] = { ...p, services: remaining };
          }
          return changed ? next : prev;
        });
      } catch (e) {
        console.error('Cart purge after payment failed:', e);
      }
    };
    window.addEventListener('cadastralPaymentCompleted', handler);
    return () => window.removeEventListener('cadastralPaymentCompleted', handler);
  }, []);


  // ---------- API multi-parcelles ----------
  const addServiceForParcel = useCallback((parcelNumber: string, parcelLocation: string, service: CadastralCartService) => {
    setParcelsMap(prev => {
      const existing = prev[parcelNumber];
      if (existing && existing.services.some(s => s.id === service.id)) return prev;
      const updated: CadastralCartParcel = existing
        ? { ...existing, parcelLocation: existing.parcelLocation || parcelLocation, services: [...existing.services, service] }
        : { parcelNumber, parcelLocation, services: [service], addedAt: Date.now() };
      return { ...prev, [parcelNumber]: updated };
    });
  }, []);

  const removeServiceForParcel = useCallback((parcelNumber: string, serviceId: string) => {
    setParcelsMap(prev => {
      const existing = prev[parcelNumber];
      if (!existing) return prev;
      const services = existing.services.filter(s => s.id !== serviceId);
      if (services.length === 0) {
        const { [parcelNumber]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [parcelNumber]: { ...existing, services } };
    });
  }, []);

  const clearParcel = useCallback((parcelNumber: string) => {
    setParcelsMap(prev => {
      if (!prev[parcelNumber]) return prev;
      const { [parcelNumber]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const parcels = useMemo<CadastralCartParcel[]>(
    () => Object.values(parcelsMap).sort((a, b) => a.addedAt - b.addedAt),
    [parcelsMap]
  );
  const getParcelCount = useCallback(() => parcels.length, [parcels]);
  const getTotalAcrossParcels = useCallback(
    () => parcels.reduce((sum, p) => sum + p.services.reduce((s, sv) => s + sv.price, 0), 0),
    [parcels]
  );

  // ---------- API mono-parcelle (proxy "parcelle active") ----------
  const activeServices = useMemo<CadastralCartService[]>(() => {
    if (!activeParcelNumber) return [];
    return parcelsMap[activeParcelNumber]?.services ?? [];
  }, [activeParcelNumber, parcelsMap]);

  const setParcelNumber = useCallback((newParcelNumber: string) => {
    setActiveParcelNumber(newParcelNumber);
  }, []);

  const addService = useCallback((service: CadastralCartService) => {
    const pn = service.parcel_number || activeParcelNumber;
    const loc = service.parcel_location || '';
    if (!pn) return;
    setParcelsMap(prev => {
      const existing = prev[pn];
      if (existing && existing.services.some(s => s.id === service.id)) return prev;
      const updated: CadastralCartParcel = existing
        ? { ...existing, services: [...existing.services, service] }
        : { parcelNumber: pn, parcelLocation: loc, services: [service], addedAt: Date.now() };
      return { ...prev, [pn]: updated };
    });
    if (!activeParcelNumber) setActiveParcelNumber(pn);
  }, [activeParcelNumber]);

  const addServices = useCallback((services: CadastralCartService[]) => {
    if (services.length === 0) return;
    setParcelsMap(prev => {
      const next = { ...prev };
      for (const svc of services) {
        const pn = svc.parcel_number || activeParcelNumber;
        if (!pn) continue;
        const existing = next[pn];
        if (existing && existing.services.some(s => s.id === svc.id)) continue;
        next[pn] = existing
          ? { ...existing, services: [...existing.services, svc] }
          : { parcelNumber: pn, parcelLocation: svc.parcel_location || '', services: [svc], addedAt: Date.now() };
      }
      return next;
    });
  }, [activeParcelNumber]);

  const removeService = useCallback((serviceId: string) => {
    if (!activeParcelNumber) return;
    removeServiceForParcel(activeParcelNumber, serviceId);
  }, [activeParcelNumber, removeServiceForParcel]);

  const toggleService = useCallback((service: CadastralCartService) => {
    const pn = service.parcel_number || activeParcelNumber;
    if (!pn) return;
    setParcelsMap(prev => {
      const existing = prev[pn];
      if (existing && existing.services.some(s => s.id === service.id)) {
        const services = existing.services.filter(s => s.id !== service.id);
        if (services.length === 0) {
          const { [pn]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [pn]: { ...existing, services } };
      }
      const updated: CadastralCartParcel = existing
        ? { ...existing, services: [...existing.services, service] }
        : { parcelNumber: pn, parcelLocation: service.parcel_location || '', services: [service], addedAt: Date.now() };
      return { ...prev, [pn]: updated };
    });
    if (!activeParcelNumber) setActiveParcelNumber(pn);
  }, [activeParcelNumber]);

  const updateServicePrices = useCallback((updates: { id: string; price: number }[]) => {
    const priceMap = new Map(updates.map(u => [u.id, u.price]));
    setParcelsMap(prev => {
      let changed = false;
      const next: Record<string, CadastralCartParcel> = {};
      for (const [pn, p] of Object.entries(prev)) {
        const newServices = p.services.map(s => {
          const np = priceMap.get(s.id);
          if (np !== undefined && np !== s.price) {
            changed = true;
            return { ...s, price: np };
          }
          return s;
        });
        next[pn] = changed ? { ...p, services: newServices } : p;
      }
      return changed ? next : prev;
    });
  }, []);

  const clearServices = useCallback(() => {
    if (!activeParcelNumber) return;
    clearParcel(activeParcelNumber);
  }, [activeParcelNumber, clearParcel]);

  const resetCart = useCallback(() => {
    setParcelsMap({});
    setActiveParcelNumber(null);
  }, []);

  const getTotalAmount = useCallback(() => activeServices.reduce((t, s) => t + s.price, 0), [activeServices]);
  const getServiceCount = useCallback(() => activeServices.length, [activeServices]);
  const isSelected = useCallback((serviceId: string) => activeServices.some(s => s.id === serviceId), [activeServices]);

  return (
    <CadastralCartContext.Provider value={{
      parcels,
      addServiceForParcel,
      removeServiceForParcel,
      clearParcel,
      getParcelCount,
      getTotalAcrossParcels,
      selectedServices: activeServices,
      addService,
      addServices,
      removeService,
      clearServices,
      resetCart,
      getTotalAmount,
      getServiceCount,
      isSelected,
      toggleService,
      updateServicePrices,
      parcelNumber: activeParcelNumber,
      setParcelNumber,
    }}>
      {children}
    </CadastralCartContext.Provider>
  );
};

export const useCadastralCart = () => {
  const context = useContext(CadastralCartContext);
  if (!context) {
    throw new Error('useCadastralCart must be used within CadastralCartProvider');
  }
  return context;
};
