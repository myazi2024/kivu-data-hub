export interface CookieOptions {
  expires?: Date;
  maxAge?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  httpOnly?: boolean;
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

    if (options.httpOnly) {
      cookieString += `; httponly`;
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
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    }
    
    return cookies;
  }

  // Méthodes spécifiques pour la conformité RGPD
  static setConsentCookie(consent: boolean): void {
    this.set('bic-consent', consent.toString(), {
      maxAge: 365 * 24 * 60 * 60, // 1 an
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
      maxAge: 365 * 24 * 60 * 60, // 1 an
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
}