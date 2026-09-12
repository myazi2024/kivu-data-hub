import { supabase } from '@/integrations/supabase/client';

/**
 * Upload d'une pièce jointe CCC dans le bucket privé `cadastral-documents`.
 * La RLS exige que le PREMIER segment du chemin soit l'`auth.uid()`.
 * Retourne une URL signée longue durée, ou une erreur lisible.
 */
export async function uploadCccDocument(
  file: File,
  folder: string,
): Promise<{ url?: string; error?: string }> {
  try {
    const userId = (await supabase.auth.getSession()).data.session?.user?.id;
    if (!userId) return { error: 'Session expirée — reconnectez-vous pour joindre un document.' };

    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const filePath = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('cadastral-documents')
      .upload(filePath, file);
    if (uploadError) return { error: uploadError.message };

    const { data, error: signedError } = await supabase.storage
      .from('cadastral-documents')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10);
    if (signedError || !data?.signedUrl) return { error: signedError?.message || 'URL du document indisponible.' };

    return { url: data.signedUrl };
  } catch (e: any) {
    return { error: e?.message || "Échec de l'envoi du document." };
  }
}
