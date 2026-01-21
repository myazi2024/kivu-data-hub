import { useState, useEffect, useCallback } from 'react';
import { LotData, InternalRoad, EnvironmentFeature, ParentParcelData, SketchSettings, DEFAULT_SKETCH_SETTINGS } from '@/components/cadastral/subdivision/types';

/**
 * Draft data structure for subdivision request
 */
export interface SubdivisionDraft {
  parcelNumber: string;
  parentParcel: ParentParcelData | null;
  lots: LotData[];
  internalRoads: InternalRoad[];
  environmentFeatures: EnvironmentFeature[];
  sketchSettings: SketchSettings;
  currentStep: number;
  lastSaved: string;
  version: number;
}

const DRAFT_STORAGE_KEY = 'subdivision_draft';
const DRAFT_VERSION = 1;

/**
 * Hook for managing subdivision request drafts in localStorage
 * Provides auto-save, manual save, and draft recovery functionality
 */
export const useSubdivisionDraft = (parcelNumber: string) => {
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Get storage key for specific parcel
  const getStorageKey = useCallback(() => {
    return `${DRAFT_STORAGE_KEY}_${parcelNumber}`;
  }, [parcelNumber]);

  // Check for existing draft on mount
  useEffect(() => {
    const checkDraft = () => {
      try {
        const stored = localStorage.getItem(getStorageKey());
        if (stored) {
          const draft = JSON.parse(stored) as SubdivisionDraft;
          if (draft.version === DRAFT_VERSION && draft.parcelNumber === parcelNumber) {
            setHasDraft(true);
            setLastSaved(new Date(draft.lastSaved));
          }
        }
      } catch (error) {
        console.error('Error checking subdivision draft:', error);
      }
    };
    
    if (parcelNumber) {
      checkDraft();
    }
  }, [parcelNumber, getStorageKey]);

  /**
   * Save draft to localStorage
   */
  const saveDraft = useCallback((data: {
    parentParcel: ParentParcelData | null;
    lots: LotData[];
    internalRoads: InternalRoad[];
    environmentFeatures: EnvironmentFeature[];
    sketchSettings: SketchSettings;
    currentStep: number;
  }) => {
    if (!parcelNumber) return false;
    
    setIsSaving(true);
    
    try {
      const draft: SubdivisionDraft = {
        parcelNumber,
        ...data,
        lastSaved: new Date().toISOString(),
        version: DRAFT_VERSION
      };
      
      localStorage.setItem(getStorageKey(), JSON.stringify(draft));
      setHasDraft(true);
      setLastSaved(new Date());
      setIsSaving(false);
      return true;
    } catch (error) {
      console.error('Error saving subdivision draft:', error);
      setIsSaving(false);
      return false;
    }
  }, [parcelNumber, getStorageKey]);

  /**
   * Load draft from localStorage
   */
  const loadDraft = useCallback((): SubdivisionDraft | null => {
    try {
      const stored = localStorage.getItem(getStorageKey());
      if (!stored) return null;
      
      const draft = JSON.parse(stored) as SubdivisionDraft;
      if (draft.version !== DRAFT_VERSION || draft.parcelNumber !== parcelNumber) {
        return null;
      }
      
      return draft;
    } catch (error) {
      console.error('Error loading subdivision draft:', error);
      return null;
    }
  }, [parcelNumber, getStorageKey]);

  /**
   * Delete draft from localStorage
   */
  const deleteDraft = useCallback(() => {
    try {
      localStorage.removeItem(getStorageKey());
      setHasDraft(false);
      setLastSaved(null);
      return true;
    } catch (error) {
      console.error('Error deleting subdivision draft:', error);
      return false;
    }
  }, [getStorageKey]);

  /**
   * Get all drafts across all parcels
   */
  const getAllDrafts = useCallback((): SubdivisionDraft[] => {
    const drafts: SubdivisionDraft[] = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(DRAFT_STORAGE_KEY)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const draft = JSON.parse(stored) as SubdivisionDraft;
            if (draft.version === DRAFT_VERSION) {
              drafts.push(draft);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error getting all drafts:', error);
    }
    
    return drafts.sort((a, b) => 
      new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime()
    );
  }, []);

  /**
   * Create a default empty draft
   */
  const createEmptyDraft = useCallback((): Omit<SubdivisionDraft, 'parcelNumber' | 'lastSaved' | 'version'> => {
    return {
      parentParcel: null,
      lots: [],
      internalRoads: [],
      environmentFeatures: [],
      sketchSettings: DEFAULT_SKETCH_SETTINGS,
      currentStep: 0
    };
  }, []);

  return {
    hasDraft,
    lastSaved,
    isSaving,
    saveDraft,
    loadDraft,
    deleteDraft,
    getAllDrafts,
    createEmptyDraft
  };
};

export default useSubdivisionDraft;
