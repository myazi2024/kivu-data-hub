/**
 * Auto-save draft for land title request form.
 * Persists form state in localStorage to prevent data loss.
 */

const DRAFT_KEY = 'land_title_request_draft';
const DRAFT_EXPIRY_HOURS = 24;

export interface LandTitleDraft {
  formData: Record<string, any>;
  propertyCategory: string;
  constructionType: string;
  constructionNature: string;
  constructionMaterials: string;
  declaredUsage: string;
  standing: string;
  floorNumber: string;
  constructionYear: string;
  nationality: string;
  requestType: string;
  selectedParcelNumber: string;
  gpsCoordinates: Array<{ borne: string; lat: string; lng: string }>;
  parcelSides: Array<{ name: string; length: string }>;
  savedAt: number;
}

export const saveDraft = (draft: Omit<LandTitleDraft, 'savedAt'>): void => {
  try {
    const data: LandTitleDraft = { ...draft, savedAt: Date.now() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silently fail
  }
};

export const loadDraft = (): LandTitleDraft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    
    const draft: LandTitleDraft = JSON.parse(raw);
    
    // Check expiry
    const hoursElapsed = (Date.now() - draft.savedAt) / (1000 * 60 * 60);
    if (hoursElapsed > DRAFT_EXPIRY_HOURS) {
      clearDraft();
      return null;
    }
    
    return draft;
  } catch {
    clearDraft();
    return null;
  }
};

export const clearDraft = (): void => {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // silently fail
  }
};

export const hasDraft = (): boolean => {
  return loadDraft() !== null;
};
