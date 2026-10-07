import { supabase } from '@/integrations/supabase/client';

/**
 * Resolve an expertise certificate into a short-lived signed URL.
 *
 * Backend: RPC `get_signed_expertise_certificate(p_request_id, p_ttl_seconds)` -> TEXT
 * The server checks access (owner, staff, or confirmed certificate_access buyer).
 * The stored value is never opened directly, so access rules cannot be bypassed.
 */
export async function resolveExpertiseCertificateUrl(
  requestId: string,
  _rawValue?: string | null,
  ttlSeconds = 600
): Promise<string> {


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
