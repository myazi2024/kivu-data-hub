import { supabase } from '@/integrations/supabase/client';

/**
 * Resolve a mutation certificate reference (legacy public URL OR new relative
 * storage path) into a short-lived URL the browser can open.
 *
 * Backend RPC: `get_signed_mutation_certificate(p_request_id, p_ttl_seconds) -> TEXT`
 * Returns a signed URL (private bucket `expertise-certificates`) when the caller
 * is the owner-and-paid OR an admin. Throws otherwise.
 */
export async function resolveMutationCertificateUrl(
  requestId: string,
  rawValue: string | null | undefined,
  ttlSeconds = 600
): Promise<string> {
  // If the value is a fully-qualified http(s) URL pointing to the (public) bucket,
  // we still resolve via RPC so we get a fresh signed link with auth checks.
  if (!rawValue) throw new Error('Certificat indisponible');

  const { data, error } = await (supabase as any).rpc('get_signed_mutation_certificate', {
    p_request_id: requestId,
    p_ttl_seconds: ttlSeconds,
  });
  if (error) throw error;
  if (!data || typeof data !== 'string') {
    throw new Error('Certificat indisponible');
  }
  return data;
}

export async function openMutationCertificate(
  requestId: string,
  rawValue: string | null | undefined
): Promise<void> {
  const url = await resolveMutationCertificateUrl(requestId, rawValue);
  window.open(url, '_blank', 'noopener,noreferrer');
}
