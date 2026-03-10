import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { CookieManager } from '@/lib/cookies';

export interface CadastralCartService {
  id: string;
  name: string;
  price: number;
  description?: string;
  parcel_number: string;
  parcel_location: string;
}

interface CadastralCartContextType {
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

export const CadastralCartProvider = ({ children }: { children: ReactNode }) => {
  const [selectedServices, setSelectedServices] = useState<CadastralCartService[]>([]);
  const [parcelNumber, setParcelNumberState] = useState<string | null>(null);

  const getConsentStatus = (): boolean | null => {
    const consent = CookieManager.get('bic-consent');
    return consent === null ? null : consent === 'true';
  };

  useEffect(() => {
    const consent = getConsentStatus();
    if (consent === false) return;
    
    try {
      const savedCart = localStorage.getItem('bic-cadastral-cart');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        const CART_TTL_MS = 24 * 60 * 60 * 1000;
        const savedAt = parsed.savedAt || 0;
        if (Date.now() - savedAt > CART_TTL_MS) {
          localStorage.removeItem('bic-cadastral-cart');
          return;
        }
        setSelectedServices(parsed.services || []);
        setParcelNumberState(parsed.parcelNumber || null);
      }
    } catch (error) {
      console.error('Error loading cadastral cart:', error);
    }
  }, []);

  // Fix #20: Debounce localStorage pour éviter les écritures rapides (ex: "Tout sélectionner")
  useEffect(() => {
    const consent = getConsentStatus();
    if (consent === false) return;
    
    const timer = setTimeout(() => {
      const cartData = JSON.stringify({
        services: selectedServices,
        parcelNumber,
        savedAt: Date.now()
      });
      
      try {
        localStorage.setItem('bic-cadastral-cart', cartData);
      } catch (error) {
        console.warn('localStorage unavailable:', error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedServices, parcelNumber]);

  // Fix #7: Ne vider le panier que si prev est non-null ET différent (pas sur remontage)
  const setParcelNumber = useCallback((newParcelNumber: string) => {
    setParcelNumberState(prev => {
      if (prev !== null && prev !== newParcelNumber) {
        setSelectedServices([]);
      }
      return newParcelNumber;
    });
  }, []);

  const addService = useCallback((service: CadastralCartService) => {
    setSelectedServices(prev => {
      const exists = prev.some(s => s.id === service.id);
      if (exists) return prev;
      return [...prev, service];
    });
  }, []);

  // Fix: Ajout batch pour "Tout sélectionner" — un seul setState au lieu de N
  const addServices = useCallback((services: CadastralCartService[]) => {
    setSelectedServices(prev => {
      const existingIds = new Set(prev.map(s => s.id));
      const newServices = services.filter(s => !existingIds.has(s.id));
      if (newServices.length === 0) return prev;
      return [...prev, ...newServices];
    });
  }, []);

  const removeService = useCallback((serviceId: string) => {
    setSelectedServices(prev => prev.filter(s => s.id !== serviceId));
  }, []);

  const toggleService = useCallback((service: CadastralCartService) => {
    setSelectedServices(prev => {
      const exists = prev.some(s => s.id === service.id);
      if (exists) {
        return prev.filter(s => s.id !== service.id);
      }
      return [...prev, service];
    });
  }, []);

  // Fix #18: Mise à jour batch des prix sans re-render multiples
  const updateServicePrices = useCallback((updates: { id: string; price: number }[]) => {
    setSelectedServices(prev => {
      const priceMap = new Map(updates.map(u => [u.id, u.price]));
      let changed = false;
      const next = prev.map(s => {
        const newPrice = priceMap.get(s.id);
        if (newPrice !== undefined && newPrice !== s.price) {
          changed = true;
          return { ...s, price: newPrice };
        }
        return s;
      });
      return changed ? next : prev;
    });
  }, []);

  // Fix: clearServices ne reset plus parcelNumber (nécessaire après paiement)
  const clearServices = useCallback(() => {
    setSelectedServices([]);
  }, []);

  // Méthode séparée pour tout réinitialiser (changement de parcelle, etc.)
  const resetCart = useCallback(() => {
    setSelectedServices([]);
    setParcelNumberState(null);
  }, []);

  const getTotalAmount = () => selectedServices.reduce((total, s) => total + s.price, 0);
  const getServiceCount = () => selectedServices.length;
  const isSelected = (serviceId: string) => selectedServices.some(s => s.id === serviceId);

  return (
    <CadastralCartContext.Provider value={{
      selectedServices,
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
      parcelNumber,
      setParcelNumber
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
