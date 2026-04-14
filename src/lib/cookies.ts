export interface CookieOptions {
  expires?: Date;
  maxAge?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

export class CookieManager {
  static set(name: string, value: string, options: CookieOptions = {}): void {
    let cookieString = `${name}=${encodeURIComponent(value)}`;

    if (options.expires) {
      cookieString += `; expires=${options.expires.toUTCString()}`;
    }

    if (options.maxAge) {
      cookieString += `; max-age=${options.maxAge}`;
    }

    if (options.path) {
      cookieString += `; path=${options.path}`;
    } else {
      cookieString += `; path=/`;
    }

    if (options.domain) {
      cookieString += `; domain=${options.domain}`;
    }

    if (options.secure) {
      cookieString += `; secure`;
    }

    if (options.sameSite) {
      cookieString += `; samesite=${options.sameSite}`;
    }

    document.cookie = cookieString;
  }

  static get(name: string): string | null {
    if (typeof document === 'undefined') return null;
    
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
    return null;
  }

  static remove(name: string, path: string = '/'): void {
    this.set(name, '', { expires: new Date(0), path });
  }

  static exists(name: string): boolean {
    return this.get(name) !== null;
  }

  static getAll(): Record<string, string> {
    if (typeof document === 'undefined') return {};
    
    const cookies: Record<string, string> = {};
    const cookieArray = document.cookie.split(';');
    
    for (const cookie of cookieArray) {
      const trimmed = cookie.trim();
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const name = trimmed.substring(0, eqIndex);
        const value = trimmed.substring(eqIndex + 1);
        cookies[name] = decodeURIComponent(value);
      }
    }
    
    return cookies;
  }

  // Méthodes spécifiques pour la conformité RGPD
  static setConsentCookie(consent: boolean): void {
    this.set('bic-consent', consent.toString(), {
      maxAge: 365 * 24 * 60 * 60, // 12 mois (conforme CNIL)
      sameSite: 'strict',
      secure: window.location.protocol === 'https:'
    });
  }

  static getConsentStatus(): boolean | null {
    const consent = this.get('bic-consent');
    return consent === null ? null : consent === 'true';
  }

  static setPreferences(preferences: Record<string, boolean>): void {
    this.set('bic-preferences', JSON.stringify(preferences), {
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'strict',
      secure: window.location.protocol === 'https:'
    });
  }

  static getPreferences(): Record<string, boolean> {
    const prefs = this.get('bic-preferences');
    return prefs ? JSON.parse(prefs) : {
      essential: true,
      analytics: false,
      marketing: false
    };
  }

  /**
   * Nettoie tout le localStorage lié à l'application BIC.
   * Appelé lors du refus/retrait du consentement.
   */
  static clearApplicationStorage(): void {
    if (typeof localStorage === 'undefined') return;
    
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('bic-') ||
        key.startsWith('land_title_') ||
        key.startsWith('pagination_') ||
        key.startsWith('ccc_') ||
        key.startsWith('permit_') ||
        key.startsWith('subdivision_') ||
        key.startsWith('mortgage_') ||
        key.startsWith('config_history_')
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}

/**
 * Wrapper autour de localStorage qui vérifie le consentement cookies
 * avant toute opération d'écriture.
 */
export class ConsentAwareStorage {
  static getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  static setItem(key: string, value: string): void {
    const consent = CookieManager.getConsentStatus();
    if (consent === false) return; // Ne pas persister si refusé
    
    try {
      localStorage.setItem(key, value);
    } catch {
      // localStorage plein ou indisponible
    }
  }

  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // silently fail
    }
  }
}
