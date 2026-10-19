import { supabase } from '@/integrations/supabase/client';

export const PARTNER_DOCS_BUCKET = 'partner-documents';
export const MAX_PARTNER_DOCS = 5;
export const MAX_PARTNER_DOC_BYTES = 10 * 1024 * 1024;
export const PARTNER_DOC_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export const ORGANIZATION_TYPES: Record<string, string> = {
  company: 'Entreprise',
  bank: 'Banque / institution financière',
  notary: 'Notaire / cabinet',
  public_admin: 'Administration publique',
  ngo: 'ONG',
  other: 'Autre',
};

export interface PartnerDoc { path: string; name: string }

const OPEN_STATUSES = ['pending', 'new', 'in_review'];

/** Une demande ne peut être annulée que tant qu'elle n'a pas été décidée. */
export const canCancelPartnerInquiry = (status: string) => OPEN_STATUSES.includes(status);

/** Retourne un message d'erreur, ou null si la liste de fichiers est acceptable. */
export function validatePartnerDocs(files: { size: number; type: string; name: string }[], existing = 0): string | null {
  if (files.length + existing > MAX_PARTNER_DOCS) return `Maximum ${MAX_PARTNER_DOCS} documents.`;
  for (const f of files) {
    if (!PARTNER_DOC_MIME.includes(f.type)) return `${f.name} : format non accepté (PDF, JPG, PNG, WebP).`;
    if (f.size > MAX_PARTNER_DOC_BYTES) return `${f.name} : 10 Mo maximum.`;
  }
  return null;
}

export async function openPartnerDoc(path: string) {
  const { data, error } = await supabase.storage.from(PARTNER_DOCS_BUCKET).createSignedUrl(path, 300);
  if (error || !data?.signedUrl) throw error ?? new Error('Lien indisponible');
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}
