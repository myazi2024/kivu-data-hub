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

/**
 * Shared dispute natures map (centralized)
 */
export const DISPUTE_NATURES_MAP: Record<string, string> = {
  succession: 'Litige successoral',
  delimitation: 'Conflit de délimitation',
  construction_anarchique: 'Construction anarchique',
  expropriation: 'Expropriation',
  double_vente: 'Double vente',
  occupation_illegale: 'Occupation illégale',
  contestation_titre: 'Contestation de titre',
  servitude: 'Litige de servitude',
  autre: 'Autre',
};

/**
 * Shared status config (centralized)
 */
export const DISPUTE_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  en_cours: { label: 'En cours', variant: 'secondary' },
  resolu: { label: 'Résolu', variant: 'default' },
  non_entame: { label: 'Non entamé', variant: 'outline' },
  familial: { label: 'Familial', variant: 'secondary' },
  conciliation_amiable: { label: 'Conciliation', variant: 'secondary' },
  autorite_locale: { label: 'Autorité locale', variant: 'secondary' },
  arbitrage: { label: 'Arbitrage', variant: 'outline' },
  tribunal: { label: 'Tribunal', variant: 'destructive' },
  appel: { label: 'En appel', variant: 'destructive' },
  demande_levee: { label: 'Demande de levée', variant: 'outline' },
  leve: { label: 'Levé', variant: 'default' },
};

/**
 * Lifting reasons map
 */
export const LIFTING_REASONS_MAP: Record<string, string> = {
  jugement_definitif: 'Jugement définitif',
  conciliation_reussie: 'Conciliation réussie',
  desistement: 'Désistement',
  prescription: 'Prescription',
  transaction: 'Transaction',
  reconnaissance_droits: 'Reconnaissance de droits',
  erreur_materielle: 'Erreur matérielle',
  autre: 'Autre motif',
};
