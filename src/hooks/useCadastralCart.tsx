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
  removeService: (serviceId: string) => void;
  clearServices: () => void;
  getTotalAmount: () => number;
  getServiceCount: () => number;
  isSelected: (serviceId: string) => boolean;
  toggleService: (service: CadastralCartService) => void;
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
        // Fix #15: Vérifier le TTL du panier (24h max)
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

  useEffect(() => {
    const consent = getConsentStatus();
    if (consent === false) return;
    
    // Fix #15: Inclure un timestamp pour le TTL
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
  }, [selectedServices, parcelNumber]);

  // Fix #11: Vider le panier quand la parcelle change
  const setParcelNumber = useCallback((newParcelNumber: string) => {
    setParcelNumberState(prev => {
      if (prev && prev !== newParcelNumber) {
        setSelectedServices([]);
      }
      return newParcelNumber;
    });
  }, []);

  const addService = (service: CadastralCartService) => {
    setSelectedServices(prev => {
      const exists = prev.some(s => s.id === service.id);
      if (exists) return prev;
      return [...prev, service];
    });
  };

  const removeService = (serviceId: string) => {
    setSelectedServices(prev => prev.filter(s => s.id !== serviceId));
  };

  const toggleService = (service: CadastralCartService) => {
    setSelectedServices(prev => {
      const exists = prev.some(s => s.id === service.id);
      if (exists) {
        return prev.filter(s => s.id !== service.id);
      }
      return [...prev, service];
    });
  };

  const clearServices = () => {
    setSelectedServices([]);
    setParcelNumberState(null);
  };

  const getTotalAmount = () => selectedServices.reduce((total, s) => total + s.price, 0);
  const getServiceCount = () => selectedServices.length;
  const isSelected = (serviceId: string) => selectedServices.some(s => s.id === serviceId);

  return (
    <CadastralCartContext.Provider value={{
      selectedServices,
      addService,
      removeService,
      clearServices,
      getTotalAmount,
      getServiceCount,
      isSelected,
      toggleService,
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
