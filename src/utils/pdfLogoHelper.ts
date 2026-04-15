import { supabase } from '@/integrations/supabase/client';

let cachedLogoBase64: string | null | undefined = undefined;

/**
 * Fetches the app logo from app_appearance_config and converts it to a base64 data URL.
 * Caches the result for the session to avoid repeated fetches.
 */
export async function fetchAppLogo(): Promise<string | null> {
  if (cachedLogoBase64 !== undefined) return cachedLogoBase64;

  try {
    const { data } = await supabase
      .from('app_appearance_config')
      .select('config_value')
      .eq('config_key', 'logo_url')
      .maybeSingle();

    if (!data?.config_value) {
      cachedLogoBase64 = null;
      return null;
    }

    const logoUrl = typeof data.config_value === 'string'
      ? data.config_value
      : JSON.parse(JSON.stringify(data.config_value));

    if (!logoUrl || typeof logoUrl !== 'string') {
      cachedLogoBase64 = null;
      return null;
    }

    // Fetch the image and convert to base64
    const response = await fetch(logoUrl);
    if (!response.ok) {
      cachedLogoBase64 = null;
      return null;
    }

    const blob = await response.blob();
    return new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogoBase64 = reader.result as string;
        resolve(cachedLogoBase64);
      };
      reader.onerror = () => {
        cachedLogoBase64 = null;
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Failed to fetch app logo for PDF', e);
    cachedLogoBase64 = null;
    return null;
  }
}

/** Reset the cache (useful for testing or after config changes) */
export function resetLogoCache() {
  cachedLogoBase64 = undefined;
}
