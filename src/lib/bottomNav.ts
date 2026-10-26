export type BottomNavKey = 'home' | 'data' | 'cadastre' | 'media' | 'account';

/** Rubrique active de la barre basse mobile selon l'adresse courante (préfixe /test ignoré). */
export function getActiveBottomNavKey(pathname: string, mediaHrefs: string[]): BottomNavKey | null {
  const p = (pathname.replace(/^\/test(?=\/|$)/, '') || '/').replace(/\/+$/, '') || '/';
  if (p === '/' || p === '/index') return 'home';
  if (p === '/map' || p.startsWith('/donnees-foncieres')) return 'data';
  if (p.startsWith('/cadastral-map')) return 'cadastre';
  if (p.startsWith('/mon-compte') || p.startsWith('/auth') || p.startsWith('/user-dashboard') || p.startsWith('/reset-password')) return 'account';
  if (mediaHrefs.some(h => p === h || p.startsWith(h + '/'))) return 'media';
  return null;
}
