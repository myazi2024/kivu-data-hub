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
    const fileName = `${prefix}_${Date.now()}_${crypto.randomUUID()}.${fileExt}`;
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
 * Check for existing active disputes on a parcel to prevent duplicates.
 * Scoped to the reporting user to avoid blocking other users.
 */
export const checkDuplicateDispute = async (
  parcelNumber: string,
  disputeNature: string,
  userId: string
): Promise<boolean> => {
  const { data } = await supabase
    .from('cadastral_land_disputes' as any)
    .select('id, reference_number')
    .eq('parcel_number', parcelNumber)
    .eq('dispute_nature', disputeNature)
    .eq('dispute_type', 'report')
    .eq('reported_by', userId)
    .in('current_status', ['en_cours', 'demande_levee', 'familial', 'conciliation_amiable', 'autorite_locale', 'arbitrage', 'tribunal', 'appel'])
    .limit(1) as any;

  return data && data.length > 0;
};

/**
 * Check if a dispute is already resolved before allowing lifting.
 * Also blocks if a lifting request is already pending.
 */
export const checkDisputeAlreadyResolved = (disputeData: any): boolean => {
  const terminalStatuses = ['resolu', 'resolved', 'leve', 'lifted', 'clos', 'closed', 'demande_levee'];
  return terminalStatuses.includes(disputeData?.current_status?.toLowerCase());
};

/**
 * Send a non-blocking notification to a specific user
 */
export const sendDisputeNotification = async (
  userId: string,
  title: string,
  message: string,
  actionUrl: string
): Promise<void> => {
  const { createNotification } = await import('@/utils/notificationHelper');
  await createNotification({ userId, title, message, type: 'success', actionUrl });
};

/**
 * Notify all admins about a dispute event (non-blocking).
 * Fetches admin user_ids from user_roles table.
 */
export const notifyAdminsAboutDispute = async (
  title: string,
  message: string,
  actionUrl: string = '/admin?tab=land-disputes'
): Promise<void> => {
  try {
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'super_admin'] as any);

    if (!adminRoles || adminRoles.length === 0) return;

    const { createBulkNotifications } = await import('@/utils/notificationHelper');
    await createBulkNotifications(
      adminRoles.map((r) => ({
        userId: r.user_id,
        title,
        message,
        type: 'info' as const,
        actionUrl,
      }))
    );
  } catch (e) {
    console.warn('Notifications admin non envoyées:', e);
  }
};

/**
 * Draft key generators
 */
export const getDisputeReportDraftKey = (parcelNumber: string) =>
  `dispute_report_draft_${parcelNumber}`;

export const getDisputeLiftingDraftKey = (parcelNumber: string) =>
  `dispute_lifting_draft_${parcelNumber}`;

/**
 * Generate a stable dispute reference (called once per form session)
 */
export const generateDisputeReference = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
