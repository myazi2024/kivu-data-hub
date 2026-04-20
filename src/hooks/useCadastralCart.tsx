import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { CookieManager, ConsentAwareStorage } from '@/lib/cookies';

export interface CadastralCartService {
  id: string;
  name: string;
  price: number;
  description?: string;
  parcel_number: string;
  parcel_location: string;
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

  // ---------- Hydratation depuis storage (avec migration silencieuse v1 → v2) ----------
  useEffect(() => {
    const consent = CookieManager.getConsentStatus();
    if (consent === false) return;

    try {
      const saved = ConsentAwareStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      const savedAt = parsed.savedAt || 0;
      if (Date.now() - savedAt > CART_TTL_MS) {
        ConsentAwareStorage.removeItem(STORAGE_KEY);
        return;
      }

      // v2 : { parcelsMap, activeParcelNumber, savedAt }
      if (parsed.parcelsMap && typeof parsed.parcelsMap === 'object') {
        setParcelsMap(parsed.parcelsMap);
        setActiveParcelNumber(parsed.activeParcelNumber || null);
        return;
      }

      // v1 : { services: [...], parcelNumber, savedAt } → migration
      const legacyServices: CadastralCartService[] = parsed.services || [];
      const legacyParcel: string | null = parsed.parcelNumber || null;
      if (legacyParcel && legacyServices.length > 0) {
        const location = legacyServices[0]?.parcel_location || '';
        setParcelsMap({
          [legacyParcel]: { parcelNumber: legacyParcel, parcelLocation: location, services: legacyServices },
        });
        setActiveParcelNumber(legacyParcel);
      } else if (legacyParcel) {
        setActiveParcelNumber(legacyParcel);
      }
    } catch (error) {
      console.error('Error loading cadastral cart:', error);
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

  // ---------- API multi-parcelles ----------
  const addServiceForParcel = useCallback((parcelNumber: string, parcelLocation: string, service: CadastralCartService) => {
    setParcelsMap(prev => {
      const existing = prev[parcelNumber];
      if (existing && existing.services.some(s => s.id === service.id)) return prev;
      const updated: CadastralCartParcel = existing
        ? { ...existing, parcelLocation: existing.parcelLocation || parcelLocation, services: [...existing.services, service] }
        : { parcelNumber, parcelLocation, services: [service] };
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

  const parcels = useMemo<CadastralCartParcel[]>(() => Object.values(parcelsMap), [parcelsMap]);
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
        : { parcelNumber: pn, parcelLocation: loc, services: [service] };
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
          : { parcelNumber: pn, parcelLocation: svc.parcel_location || '', services: [svc] };
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
        : { parcelNumber: pn, parcelLocation: service.parcel_location || '', services: [service] };
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
