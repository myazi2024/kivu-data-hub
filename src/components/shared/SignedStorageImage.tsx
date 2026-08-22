import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const PUBLIC_MARKER = '/storage/v1/object/public/';

/** Extrait { bucket, path } d'une URL publique Supabase, sinon null. */
function parseStorageRef(src?: string | null, defaultBucket = 'cadastral-documents') {
  if (!src) return null;
  const i = src.indexOf(PUBLIC_MARKER);
  if (i !== -1) {
    const rest = src.slice(i + PUBLIC_MARKER.length).split('?')[0];
    const slash = rest.indexOf('/');
    if (slash === -1) return null;
    return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1) };
  }
  if (/^https?:\/\//i.test(src)) return null; // URL externe : afficher telle quelle
  return { bucket: defaultBucket, path: src.replace(/^\/+/, '') };
}

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  bucket?: string;
  alt: string;
}

/**
 * Affiche une image stockée dans un bucket privé Supabase en générant une URL signée.
 * Accepte soit un chemin Storage, soit une URL « publique » (bucket privé → URL inopérante).
 */
export const SignedStorageImage = ({ src, bucket = 'cadastral-documents', alt, ...imgProps }: Props) => {
  const [resolved, setResolved] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ref = parseStorageRef(src, bucket);
    if (!ref) {
      setResolved(src || null);
      return;
    }
    supabase.storage
      .from(ref.bucket)
      .createSignedUrl(ref.path, 3600)
      .then(({ data, error }) => {
        if (cancelled) return;
        setResolved(error ? null : data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [src, bucket]);

  if (!resolved) {
    return <div className={imgProps.className} aria-label={alt} role="img" />;
  }
  return <img {...imgProps} src={resolved} alt={alt} />;
};

export default SignedStorageImage;
