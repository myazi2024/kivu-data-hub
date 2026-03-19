import { useEffect, useCallback, useRef } from 'react';
import type { ExpertiseFormState } from '@/components/cadastral/expertise-request/types';
import type { FormAction } from '@/components/cadastral/expertise-request/types';

const DRAFT_KEY_PREFIX = 'expertise_draft_';

/**
 * Persists expertise form state to localStorage, keyed by parcel number.
 * Auto-saves on changes (debounced) and restores on mount.
 */
export const useExpertiseDraft = (
  parcelNumber: string,
  state: ExpertiseFormState,
  dispatch: React.Dispatch<FormAction>,
  isOpen: boolean
) => {
  const key = DRAFT_KEY_PREFIX + parcelNumber;
  const hasRestored = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Restore draft on open
  useEffect(() => {
    if (!isOpen || !parcelNumber || hasRestored.current) return;
    hasRestored.current = true;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'SET_MULTIPLE', fields: parsed });
      }
    } catch {
      // Corrupted draft — ignore
    }
  }, [isOpen, parcelNumber, key, dispatch]);

  // Auto-save with debounce
  useEffect(() => {
    if (!isOpen || !parcelNumber) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        // Storage full — ignore
      }
    }, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [isOpen, parcelNumber, key, state]);

  // Reset restored flag when dialog closes
  useEffect(() => {
    if (!isOpen) hasRestored.current = false;
  }, [isOpen]);

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(key); } catch {}
  }, [key]);

  const hasDraft = useCallback(() => {
    try { return !!localStorage.getItem(key); } catch { return false; }
  }, [key]);

  return { clearDraft, hasDraft };
};
