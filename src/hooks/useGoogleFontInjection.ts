import { useEffect } from 'react';

/**
 * Injecte dynamiquement un <link> Google Fonts dans le <head>.
 * Si url est vide/null, retire le lien précédent.
 */
export const useGoogleFontInjection = (url?: string | null) => {
  useEffect(() => {
    const id = 'admin-google-font-link';
    const existing = document.getElementById(id) as HTMLLinkElement | null;

    if (!url || !/^https?:\/\/fonts\.googleapis\.com\//.test(url)) {
      if (existing) existing.remove();
      return;
    }

    if (existing && existing.href === url) return;
    if (existing) existing.remove();

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
  }, [url]);
};
