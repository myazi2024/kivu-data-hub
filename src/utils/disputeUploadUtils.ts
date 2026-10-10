/**
 * Utilitaires partagés pour les uploads de fichiers du service Litige foncier
 */
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s\-()]{6,20}$/;
const MAX_FILES_PER_REQUEST = 10;
const MAX_FILE_SIZE_MB = 10;

export const validateEmail = (email: string): boolean => {
  if (!email) return true; // optional
  return EMAIL_REGEX.test(email);
};

export const validatePhone = (phone: string): boolean => {
  if (!phone) return true; // optional
  return PHONE_REGEX.test(phone);
};

/**
 * Validate file count limit before upload
 */
export const validateFileCount = (currentCount: number, newCount: number): boolean => {
  if (currentCount + newCount > MAX_FILES_PER_REQUEST) {
    toast.error(`Maximum ${MAX_FILES_PER_REQUEST} fichiers autorisés par demande`);
    return false;
  }
  return true;
};

/**
 * Validate individual file (type + size)
 */
export const validateFile = (file: File): boolean => {
  const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf';
  const isValidSize = file.size <= MAX_FILE_SIZE_MB * 1024 * 1024;
  if (!isValidType) toast.error(`${file.name}: Format non supporté (images et PDF uniquement)`);
  if (!isValidSize) toast.error(`${file.name}: Fichier trop volumineux (max ${MAX_FILE_SIZE_MB} Mo)`);
  return isValidType && isValidSize;
};

/**
 * Upload files to `<uid>/land-disputes/` (seul dossier autorisé par le stockage)
 * et renvoie les chemins enregistrés par le serveur. Lève une erreur en cas d'échec.
 */
export const uploadDisputeFiles = async (
  files: File[],
  userId: string,
  prefix: string
): Promise<string[]> => {
  const paths: string[] = [];
  for (const file of files) {
    const fileExt = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const filePath = `${userId}/land-disputes/${prefix}_${crypto.randomUUID()}.${fileExt}`;
    const { error } = await supabase.storage.from('cadastral-documents').upload(filePath, file);
    if (error) {
      await cleanupUploadedFiles(paths);
      throw new Error(`Échec de l'envoi du fichier "${file.name}" : ${error.message}`);
    }
    paths.push(filePath);
  }
  return paths;
};

/**
 * Cleanup uploaded files from storage (e.g. on DB insert failure)
 */
export const cleanupUploadedFiles = async (filePaths: string[]): Promise<void> => {
  if (filePaths.length === 0) return;
  try {
    await supabase.storage.from('cadastral-documents').remove(filePaths);
  } catch (e) {
    console.warn('Erreur lors du nettoyage des fichiers:', e);
  }
};

/**
 * Draft key generators
 */
export const getDisputeReportDraftKey = (parcelNumber: string) =>
  `dispute_report_draft_${parcelNumber}`;

export const getDisputeLiftingDraftKey = (parcelNumber: string) =>
  `dispute_lifting_draft_${parcelNumber}`;

/** Notification envoyée par l'admin au déclarant lors d'un changement de statut. */
export const sendDisputeNotification = async (
  userId: string,
  title: string,
  message: string,
  actionUrl: string
): Promise<void> => {
  const { createNotification } = await import('@/utils/notificationHelper');
  await createNotification({ userId, title, message, type: 'success', actionUrl });
};
