import { supabase } from '@/integrations/supabase/client';

/**
 * Resolve a subdivision certificate into a short-lived signed URL.
 *
 * Backend RPC: `get_signed_subdivision_certificate(p_request_id, p_ttl_seconds)`.
 * The certificate is stored in the private `expertise-certificates` bucket and
 * tracked in `generated_certificates` (type = 'lotissement'). The RPC enforces
 * that only the request owner or an admin/super_admin can download.
 */
export async function resolveSubdivisionCertificateUrl(
  requestId: string,
  ttlSeconds = 600,
): Promise<string> {
  const { data, error } = await (supabase as any).rpc('get_signed_subdivision_certificate', {
    p_request_id: requestId,
    p_ttl_seconds: ttlSeconds,
  });
  if (error) throw error;
  if (!data || typeof data !== 'string') throw new Error('Certificat indisponible');
  return data;
}

export async function openSubdivisionCertificate(requestId: string): Promise<void> {
  const url = await resolveSubdivisionCertificateUrl(requestId);
  window.open(url, '_blank', 'noopener,noreferrer');
}
