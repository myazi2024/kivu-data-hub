/**
 * Validation et utilitaires pour la gestion des partenaires.
 */

const ALLOWED_LOGO_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 Mo

/**
 * Normalise une URL de site web. Ajoute https:// si absent, valide via URL().
 * @returns null si vide, string normalisée, ou throw avec message clair.
 */
export function normalizeWebsiteUrl(raw: string): string | null {
  const v = (raw ?? '').trim();
  if (!v) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if (!u.hostname.includes('.')) {
      throw new Error('URL du site web invalide (domaine incomplet)');
    }
    return u.toString();
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('URL')) throw e;
    throw new Error('URL du site web invalide');
  }
}

/**
 * Valide un fichier logo (taille + MIME).
 */
export function validateLogoFile(file: File): void {
  if (!ALLOWED_LOGO_MIME.includes(file.type)) {
    throw new Error('Format non supporté (PNG, JPEG, WebP ou SVG uniquement)');
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error(`Logo trop volumineux (max ${MAX_LOGO_BYTES / 1024 / 1024} Mo)`);
  }
}

/**
 * Extrait le path Storage depuis une URL publique du bucket `partners`.
 * Retourne null si l'URL ne correspond pas (ex: ancien CDN).
 */
export function extractPartnerStoragePath(publicUrl: string | null | undefined): string | null {
  if (!publicUrl) return null;
  const m = publicUrl.match(/\/storage\/v1\/object\/public\/partners\/(.+)$/);
  return m?.[1] ?? null;
}
