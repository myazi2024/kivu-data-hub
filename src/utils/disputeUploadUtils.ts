/**
 * Utilitaires partagés pour les uploads de fichiers du service Litige foncier
 */
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s\-()]{6,20}$/;

export const validateEmail = (email: string): boolean => {
  if (!email) return true; // optional
  return EMAIL_REGEX.test(email);
};

export const validatePhone = (phone: string): boolean => {
  if (!phone) return true; // optional
  return PHONE_REGEX.test(phone);
};

/**
 * Upload files to storage and return URLs. Throws on any failure.
 */
export const uploadDisputeFiles = async (
  files: File[],
  userId: string,
  prefix: string
): Promise<{ urls: string[]; paths: string[] }> => {
  const urls: string[] = [];
  const paths: string[] = [];

  for (const file of files) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `land-disputes/${userId}/${fileName}`;

    const { error } = await supabase.storage
      .from('cadastral-documents')
      .upload(filePath, file);

    if (error) {
      // Cleanup already uploaded files
      await cleanupUploadedFiles(paths);
      throw new Error(`Échec de l'upload du fichier "${file.name}": ${error.message}`);
    }

    paths.push(filePath);
    const { data } = supabase.storage.from('cadastral-documents').getPublicUrl(filePath);
    urls.push(data.publicUrl);
  }

  return { urls, paths };
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
 * Check for existing active disputes on a parcel to prevent duplicates
 */
export const checkDuplicateDispute = async (
  parcelNumber: string,
  disputeNature: string
): Promise<boolean> => {
  const { data } = await supabase
    .from('cadastral_land_disputes' as any)
    .select('id, reference_number')
    .eq('parcel_number', parcelNumber)
    .eq('dispute_nature', disputeNature)
    .eq('dispute_type', 'report')
    .in('current_status', ['en_cours', 'en_resolution', 'demande_levee'])
    .limit(1) as any;

  return data && data.length > 0;
};

/**
 * Check if a dispute is already resolved before allowing lifting
 */
export const checkDisputeAlreadyResolved = (disputeData: any): boolean => {
  const resolvedStatuses = ['resolu', 'resolved', 'leve', 'lifted', 'clos', 'closed'];
  return resolvedStatuses.includes(disputeData?.current_status?.toLowerCase());
};

/**
 * Send a non-blocking notification
 */
export const sendDisputeNotification = async (
  userId: string,
  title: string,
  message: string,
  actionUrl: string
): Promise<void> => {
  try {
    await supabase.from('notifications' as any).insert({
      user_id: userId,
      title,
      message,
      type: 'success',
      action_url: actionUrl,
    });
  } catch (e) {
    console.warn('Notification non envoyée:', e);
  }
};

/**
 * Draft key generators
 */
export const getDisputeReportDraftKey = (parcelNumber: string) =>
  `dispute_report_draft_${parcelNumber}`;

export const getDisputeLiftingDraftKey = (parcelNumber: string) =>
  `dispute_lifting_draft_${parcelNumber}`;
