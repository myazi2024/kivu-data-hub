import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { CookieManager } from '@/lib/cookies';

interface CookieContextType {
  consent: boolean | null;
  preferences: Record<string, boolean>;
  giveConsent: (prefs?: Record<string, boolean>) => void;
  revokeConsent: () => void;
  updatePreferences: (prefs: Record<string, boolean>) => void;
  isConsentRequired: boolean;
  reopenBanner: () => void;
}

const CookieContext = createContext<CookieContextType | undefined>(undefined);

export const CookieProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [consent, setConsent] = useState<boolean | null>(null);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({
    essential: true,
    analytics: false,
    marketing: false
  });
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const existingConsent = CookieManager.getConsentStatus();
    const existingPreferences = CookieManager.getPreferences();
    
    setConsent(existingConsent);
    setPreferences(existingPreferences);
    if (existingConsent !== null) {
      setBannerDismissed(true);
    }
  }, []);

  // Accepter avec des préférences optionnelles (résout le race condition)
  const giveConsent = useCallback((prefs?: Record<string, boolean>) => {
    if (prefs) {
      const safePrefs = { ...prefs, essential: true };
      setPreferences(safePrefs);
      CookieManager.setPreferences(safePrefs);
    }
    setConsent(true);
    CookieManager.setConsentCookie(true);
    setBannerDismissed(true);
  }, []);

  const revokeConsent = useCallback(() => {
    setConsent(false);
    CookieManager.setConsentCookie(false);
    setBannerDismissed(true);
    
    // Supprimer tous les cookies non-essentiels
    const allCookies = CookieManager.getAll();
    Object.keys(allCookies).forEach(name => {
      if (!name.startsWith('bic-consent') && !name.startsWith('bic-preferences')) {
        CookieManager.remove(name);
      }
    });

    // Nettoyer le localStorage applicatif
    CookieManager.clearApplicationStorage();
    
    // Réinitialiser les préférences
    const rejectedPrefs = { essential: true, analytics: false, marketing: false };
    setPreferences(rejectedPrefs);
    CookieManager.setPreferences(rejectedPrefs);
  }, []);

  const updatePreferences = useCallback((prefs: Record<string, boolean>) => {
    const newPrefs = { ...prefs, essential: true };
    setPreferences(newPrefs);
    CookieManager.setPreferences(newPrefs);
  }, []);

  const reopenBanner = useCallback(() => {
    setBannerDismissed(false);
  }, []);

  const isConsentRequired = !bannerDismissed;

  return (
    <CookieContext.Provider value={{
      consent,
      preferences,
      giveConsent,
      revokeConsent,
      updatePreferences,
      isConsentRequired,
      reopenBanner
    }}>
      {children}
    </CookieContext.Provider>
  );
};

export const useCookies = () => {
  const context = useContext(CookieContext);
  if (!context) {
    return {
      consent: null,
      preferences: { essential: true, analytics: false, marketing: false },
      giveConsent: () => {},
      revokeConsent: () => {},
      updatePreferences: () => {},
      isConsentRequired: false,
      reopenBanner: () => {}
    };
  }
  return context;
};
