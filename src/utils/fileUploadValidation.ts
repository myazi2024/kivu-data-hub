/**
 * 🔒 Validation côté client pour uploads de fichiers
 * Complète les validations server-side dans storage policies
 */

// Tailles maximales par type (en bytes)
export const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024, // 5 MB pour images
  pdf: 10 * 1024 * 1024, // 10 MB pour PDFs
  document: 10 * 1024 * 1024, // 10 MB pour documents
} as const;

// Types MIME autorisés
export const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  pdf: ['application/pdf'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
} as const;

export type FileType = keyof typeof ALLOWED_MIME_TYPES;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Valider un fichier avant upload
 */
export const validateFile = (
  file: File,
  type: FileType
): ValidationResult => {
  // Vérifier la taille
  const maxSize = MAX_FILE_SIZES[type];
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Le fichier est trop volumineux. Taille maximale: ${Math.round(maxSize / 1024 / 1024)} MB`,
    };
  }

  // Vérifier le type MIME
  const allowedTypes = ALLOWED_MIME_TYPES[type];
  if (!allowedTypes.some(t => t === file.type)) {
    return {
      valid: false,
      error: `Type de fichier non autorisé. Types acceptés: ${allowedTypes.join(', ')}`,
    };
  }

  // Vérifier l'extension du nom de fichier
  const extension = file.name.split('.').pop()?.toLowerCase();
  const validExtensions: Record<FileType, string[]> = {
    image: ['jpg', 'jpeg', 'png', 'webp'],
    pdf: ['pdf'],
    document: ['pdf', 'doc', 'docx'],
  };

  if (!extension || !validExtensions[type].includes(extension)) {
    return {
      valid: false,
      error: `Extension de fichier invalide. Extensions acceptées: ${validExtensions[type].join(', ')}`,
    };
  }

  return { valid: true };
};

/**
 * Valider plusieurs fichiers
 */
export const validateFiles = (
  files: File[],
  type: FileType
): ValidationResult => {
  for (const file of files) {
    const result = validateFile(file, type);
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true };
};

/**
 * Obtenir une URL de prévisualisation sécurisée pour un fichier image
 */
export const getSecurePreviewUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const validation = validateFile(file, 'image');
    if (!validation.valid) {
      reject(new Error(validation.error));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        resolve(e.target.result);
      } else {
        reject(new Error('Impossible de lire le fichier'));
      }
    };
    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
    reader.readAsDataURL(file);
  });
};
