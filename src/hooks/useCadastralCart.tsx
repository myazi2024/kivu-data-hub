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
  /** Services disponibles pour cette parcelle selon les règles du catalogue (calculé avec les données de la parcelle). */
  availableServiceIds?: string[];
}

interface CadastralCartContextType {
  // ===== API multi-parcelles (Phase 1) =====
  parcels: CadastralCartParcel[];
  addServiceForParcel: (parcelNumber: string, parcelLocation: string, service: CadastralCartService) => void;
  removeServiceForParcel: (parcelNumber: string, serviceId: string) => void;
  clearParcel: (parcelNumber: string) => void;
  /** Retire uniquement les services indiqués (ex. services confirmés payés par le serveur). */
  removeServicesForParcel: (parcelNumber: string, serviceIds: string[]) => void;
  /** Mémorise les services disponibles d'une parcelle (règles du catalogue). */
  setParcelAvailability: (parcelNumber: string, serviceIds: string[]) => void;
  getParcelCount: () => number;
  getTotalAcrossParcels: () => number;

  // ===== API mono-parcelle rétro-compatible (proxy sur la parcelle active) =====
  selectedServices: CadastralCartService[];
  addService: (service: CadastralCartService) => void;
  addServices: (services: CadastralCartService[]) => void;
  removeService: (serviceId: string) => void;
  getTotalAmount: () => number;
  isSelected: (serviceId: string) => boolean;
  toggleService: (service: CadastralCartService) => void;
  syncWithCatalog: (catalog: { id: string; name: string; price: number; category?: string | null }[]) => void;
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
  // P0-1: garde anti-race pour éviter d'écraser le distant avant qu'un pull ait eu lieu.
  const skipNextPush = useRef(true);

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
            availableServiceIds: Array.isArray(p.availableServiceIds) ? p.availableServiceIds : undefined,
          };
        });
        setParcelsMap(migrated);
        setActiveParcelNumber(parsed.activeParcelNumber || null);
        setHydrated(true);
        return;
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
      // P0-3: à chaque changement d'utilisateur, on désarme le push pour laisser le pull gagner.
      skipNextPush.current = true;
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
              availableServiceIds: Array.isArray(p.availableServiceIds) ? p.availableServiceIds : undefined,
            };
          });
          setParcelsMap(migrated);
          if (remote.activeParcelNumber) setActiveParcelNumber(remote.activeParcelNumber);
          skipNextPush.current = true; // P0-1: éviter rebound immédiat
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
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }
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

  const removeServicesForParcel = useCallback((parcelNumber: string, serviceIds: string[]) => {
    if (serviceIds.length === 0) return;
    const ids = new Set(serviceIds);
    setParcelsMap(prev => {
      const existing = prev[parcelNumber];
      if (!existing) return prev;
      const services = existing.services.filter(s => !ids.has(s.id));
      if (services.length === existing.services.length) return prev;
      if (services.length === 0) {
        const { [parcelNumber]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [parcelNumber]: { ...existing, services } };
    });
  }, []);

  const setParcelAvailability = useCallback((parcelNumber: string, serviceIds: string[]) => {
    setParcelsMap(prev => {
      const existing = prev[parcelNumber];
      if (!existing) return prev;
      const sorted = [...serviceIds].sort();
      const current = existing.availableServiceIds;
      if (current && current.length === sorted.length && current.every((id, i) => id === sorted[i])) return prev;
      return { ...prev, [parcelNumber]: { ...existing, availableServiceIds: sorted } };
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

  /** Aligne tout le panier (toutes parcelles) sur le catalogue actif : prix, nom, catégorie, services retirés. */
  const syncWithCatalog = useCallback((catalog: { id: string; name: string; price: number; category?: string | null }[]) => {
    if (catalog.length === 0) return;
    const byId = new Map(catalog.map(c => [c.id, c]));
    setParcelsMap(prev => {
      let changed = false;
      const next: Record<string, CadastralCartParcel> = {};
      for (const [pn, p] of Object.entries(prev)) {
        let parcelChanged = false;
        const services: CadastralCartService[] = [];
        for (const s of p.services) {
          const c = byId.get(s.id);
          if (!c) { parcelChanged = true; continue; }
          const category = c.category ?? s.category;
          if (c.price !== s.price || c.name !== s.name || category !== s.category) {
            parcelChanged = true;
            services.push({ ...s, price: c.price, name: c.name, category: category ?? undefined });
          } else services.push(s);
        }
        if (parcelChanged) changed = true;
        if (services.length > 0) next[pn] = parcelChanged ? { ...p, services } : p;
      }
      return changed ? next : prev;
    });
  }, []);

  const getTotalAmount = useCallback(() => activeServices.reduce((t, s) => t + s.price, 0), [activeServices]);
  const isSelected = useCallback((serviceId: string) => activeServices.some(s => s.id === serviceId), [activeServices]);

  return (
    <CadastralCartContext.Provider value={{
      parcels,
      addServiceForParcel,
      removeServiceForParcel,
      clearParcel,
      removeServicesForParcel,
      setParcelAvailability,
      getParcelCount,
      getTotalAcrossParcels,
      selectedServices: activeServices,
      addService,
      addServices,
      removeService,
      getTotalAmount,
      isSelected,
      toggleService,
      syncWithCatalog,
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
