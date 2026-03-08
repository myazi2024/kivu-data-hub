import { useState, useEffect, useCallback, useRef } from 'react';
import { saveToLocalStorage, loadFromLocalStorage, removeFromLocalStorage } from '@/utils/localStorageManager';
import { toast } from 'sonner';

interface DraftData {
  timestamp: string;
  data: Record<string, any>;
}

const DRAFT_KEY_PREFIX = 'mortgage_draft_';

/**
 * Hook for saving/restoring mortgage form drafts to localStorage.
 * Supports both registration and cancellation forms.
 */
export function useMortgageDraft(
  formType: 'registration' | 'cancellation',
  parcelNumber: string,
  enabled: boolean = true
) {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSignatureRef = useRef('');

  const draftKey = `${DRAFT_KEY_PREFIX}${formType}_${parcelNumber}`;

  // Check for existing draft on mount/open
  useEffect(() => {
    if (!enabled || !parcelNumber) {
      setHasDraft(false);
      setDraftLoaded(false);
      return;
    }

    const result = loadFromLocalStorage<DraftData>(draftKey);
    if (result.success && result.data) {
      // Check if draft is less than 7 days old
      const age = Date.now() - new Date(result.data.timestamp).getTime();
      const daysOld = age / (1000 * 60 * 60 * 24);

      if (daysOld < 7) {
        setHasDraft(true);
      } else {
        removeFromLocalStorage(draftKey);
        setHasDraft(false);
      }
    } else {
      setHasDraft(false);
    }

    setDraftLoaded(true);
  }, [draftKey, enabled, parcelNumber]);

  const saveDraft = useCallback((formData: Record<string, any>) => {
    if (!enabled) return;

    // Don't save File objects — strip them
    const cleanData = { ...formData };
    delete cleanData.supportingDocuments;
    delete cleanData.receiptFile;

    const draft: DraftData = {
      timestamp: new Date().toISOString(),
      data: cleanData,
    };

    const saveResult = saveToLocalStorage(draftKey, draft);
    if (!saveResult.success) {
      toast.error(saveResult.error || 'Impossible de sauvegarder le brouillon');
      return;
    }

    setHasDraft(prev => (prev ? prev : true));
  }, [draftKey, enabled]);

  const loadDraft = useCallback((): Record<string, any> | null => {
    if (!enabled) return null;

    const result = loadFromLocalStorage<DraftData>(draftKey);
    if (result.success && result.data) {
      toast.success('Brouillon restauré');
      return result.data.data;
    }

    return null;
  }, [draftKey, enabled]);

  const clearDraft = useCallback(() => {
    removeFromLocalStorage(draftKey);
    setHasDraft(false);
    lastSavedSignatureRef.current = '';
  }, [draftKey]);

  // Auto-save with debounce and de-duplication
  const autoSave = useCallback((formData: Record<string, any>) => {
    if (!enabled) return;

    const cleanData = { ...formData };
    delete cleanData.supportingDocuments;
    delete cleanData.receiptFile;

    const currentSignature = JSON.stringify(cleanData);
    if (currentSignature === lastSavedSignatureRef.current) {
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft(formData);
      lastSavedSignatureRef.current = currentSignature;
    }, 3000); // Auto-save after 3 seconds of inactivity
  }, [enabled, saveDraft]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  return {
    hasDraft,
    draftLoaded,
    saveDraft,
    loadDraft,
    clearDraft,
    autoSave,
  };
}
