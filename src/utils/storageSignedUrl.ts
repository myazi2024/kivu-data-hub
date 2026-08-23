import { supabase } from '@/integrations/supabase/client';

const PUBLIC_MARKER = '/storage/v1/object/public/';

/** Extrait { bucket, path } d'une URL publique Supabase ou d'un chemin brut, sinon null. */
export function parseStorageRef(
  src?: string | null,
  defaultBucket = 'cadastral-documents',
): { bucket: string; path: string } | null {
  if (!src) return null;
  const i = src.indexOf(PUBLIC_MARKER);
  if (i !== -1) {
    const rest = src.slice(i + PUBLIC_MARKER.length).split('?')[0];
    const slash = rest.indexOf('/');
    if (slash === -1) return null;
    return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1) };
  }
  if (/^https?:\/\//i.test(src)) return null; // URL externe
  return { bucket: defaultBucket, path: src.replace(/^\/+/, '') };
}

/** Résout un chemin Storage (ou une ancienne URL publique) en URL signée temporaire. */
export async function getSignedStorageUrl(
  src?: string | null,
  bucket = 'cadastral-documents',
  expiresIn = 3600,
): Promise<string | null> {
  const ref = parseStorageRef(src, bucket);
  if (!ref) return src || null;
  const { data, error } = await supabase.storage.from(ref.bucket).createSignedUrl(ref.path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Ouvre un fichier privé du Storage dans un nouvel onglet via une URL signée. */
export async function openSignedStorageFile(
  src?: string | null,
  bucket = 'cadastral-documents',
): Promise<boolean> {
  const url = await getSignedStorageUrl(src, bucket);
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
