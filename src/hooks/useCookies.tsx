import React, { createContext, useContext, useEffect, useState } from 'react';
import { CookieManager } from '@/lib/cookies';

interface CookieContextType {
  consent: boolean | null;
  preferences: Record<string, boolean>;
  giveConsent: () => void;
  revokeConsent: () => void;
  updatePreferences: (prefs: Record<string, boolean>) => void;
  isConsentRequired: boolean;
}

const CookieContext = createContext<CookieContextType | undefined>(undefined);

export const CookieProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [consent, setConsent] = useState<boolean | null>(null);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({
    essential: true,
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    // Charger le consentement existant
    const existingConsent = CookieManager.getConsentStatus();
    const existingPreferences = CookieManager.getPreferences();
    
    setConsent(existingConsent);
    setPreferences(existingPreferences);
  }, []);

  const giveConsent = () => {
    setConsent(true);
    CookieManager.setConsentCookie(true);
  };

  const revokeConsent = () => {
    setConsent(false);
    CookieManager.setConsentCookie(false);
    
    // Supprimer tous les cookies non-essentiels
    const allCookies = CookieManager.getAll();
    Object.keys(allCookies).forEach(name => {
      if (!name.startsWith('bic-consent') && !name.startsWith('bic-preferences')) {
        CookieManager.remove(name);
      }
    });
  };

  const updatePreferences = (prefs: Record<string, boolean>) => {
    const newPrefs = { ...prefs, essential: true }; // Essential toujours true
    setPreferences(newPrefs);
    CookieManager.setPreferences(newPrefs);
  };

  const isConsentRequired = consent === null;

  return (
    <CookieContext.Provider value={{
      consent,
      preferences,
      giveConsent,
      revokeConsent,
      updatePreferences,
      isConsentRequired
    }}>
      {children}
    </CookieContext.Provider>
  );
};

export const useCookies = () => {
  const context = useContext(CookieContext);
  if (!context) {
    throw new Error('useCookies must be used within a CookieProvider');
  }
  return context;
};