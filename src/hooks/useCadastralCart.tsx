import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { CookieManager, ConsentAwareStorage } from '@/lib/cookies';

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

  useEffect(() => {
    const consent = CookieManager.getConsentStatus();
    if (consent === false) return;
    
    try {
      const savedCart = ConsentAwareStorage.getItem('bic-cadastral-cart');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        const CART_TTL_MS = 24 * 60 * 60 * 1000;
        const savedAt = parsed.savedAt || 0;
        if (Date.now() - savedAt > CART_TTL_MS) {
          ConsentAwareStorage.removeItem('bic-cadastral-cart');
          return;
        }
        setSelectedServices(parsed.services || []);
        setParcelNumberState(parsed.parcelNumber || null);
      }
    } catch (error) {
      console.error('Error loading cadastral cart:', error);
    }
  }, []);

  useEffect(() => {
    const consent = CookieManager.getConsentStatus();
    if (consent === false) return;
    
    const timer = setTimeout(() => {
      const cartData = JSON.stringify({
        services: selectedServices,
        parcelNumber,
        savedAt: Date.now()
      });
      ConsentAwareStorage.setItem('bic-cadastral-cart', cartData);
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedServices, parcelNumber]);

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

  const clearServices = useCallback(() => {
    setSelectedServices([]);
  }, []);

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
