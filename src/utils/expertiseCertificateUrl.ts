import { supabase } from '@/integrations/supabase/client';

/**
 * Resolve an expertise certificate reference (legacy public URL OR new relative
 * storage path) into a short-lived URL the browser can open.
 *
 * Backend: RPC `get_signed_expertise_certificate(p_request_id, p_ttl_seconds)` -> TEXT
 * Returns a signed URL (private bucket `expertise-certificates`) when the caller
 * is authorized (owner or staff). Throws otherwise.
 */
export async function resolveExpertiseCertificateUrl(
  requestId: string,
  rawValue: string | null | undefined,
  ttlSeconds = 600
): Promise<string> {
  // Legacy: fully-qualified http(s) URL — open as-is (will be migrated by the backfill).
  if (rawValue && /^https?:\/\//i.test(rawValue)) return rawValue;

  const { data, error } = await (supabase as any).rpc('get_signed_expertise_certificate', {
    p_request_id: requestId,
    p_ttl_seconds: ttlSeconds,
  });
  if (error) throw error;
  if (!data || typeof data !== 'string') {
    throw new Error('Certificat indisponible');
  }
  return data;
}

export async function openExpertiseCertificate(
  requestId: string,
  rawValue: string | null | undefined
): Promise<void> {
  const url = await resolveExpertiseCertificateUrl(requestId, rawValue);
  window.open(url, '_blank', 'noopener,noreferrer');
}
