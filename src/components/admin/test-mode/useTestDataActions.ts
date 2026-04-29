import { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { GenerationStep } from './types';
import { useTestGenerationJob } from '@/hooks/useTestGenerationJob';

interface UseTestDataActionsProps {
  userId?: string;
  onComplete: () => Promise<void>;
}

interface CleanupResult {
  ok?: boolean;
  failed_step?: string;
  error?: string;
  total_deleted?: number;
  partial_total?: number;
  per_step?: Record<string, number>;
  partial_summary?: Record<string, number>;
  truncated_steps?: string[];
}

/**
 * Orchestrates test data cleanup (server-side via `cleanup-test-data-batch`)
 * and generation (server-side via `generate-test-data` + `EdgeRuntime.waitUntil`).
 *
 * The generation flow used to run inline in the browser, which meant closing
 * the admin tab aborted the run mid-way. It is now delegated to an edge
 * function that persists progress to `test_generation_jobs` and continues
 * even after the client disconnects. The hook subscribes to that row via
 * `useTestGenerationJob` and surfaces step-by-step state in the same shape
 * `<GenerationProgress>` already expected.
 */
export const useTestDataActions = ({ userId, onComplete }: UseTestDataActionsProps) => {
  const [cleaningUp, setCleaningUp] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [cleanupPerStep, setCleanupPerStep] = useState<Record<string, number> | null>(null);
  const [cleanupFailedStep, setCleanupFailedStep] = useState<string | null>(null);
  const [cleanupTruncatedSteps, setCleanupTruncatedSteps] = useState<string[]>([]);

  const { job, isActive, startJob, cancelJob, clearJob } = useTestGenerationJob();

  // Map the server-side job to <GenerationProgress>'s expected shape
  const generationSteps: GenerationStep[] = useMemo(() => {
    if (!job?.steps_state || job.steps_state.length === 0) {
      // Skeleton — 14 placeholders so the UI renders consistently while waiting
      return Array.from({ length: 14 }, (_, i) => ({
        label: `Étape ${i + 1}`,
        status: 'pending' as const,
      }));
    }
    return job.steps_state.map((s) => ({ label: s.label, status: s.status }));
  }, [job]);

  const currentStep = job?.current_step_index ?? -1;
  const generatingData = isActive;

  const lastTerminalStatus = job && ['done', 'error', 'cancelled'].includes(job.status)
    ? job.status
    : null;

  // Surface terminal toasts once when a previously-active job completes.
  // We use a ref-like pattern via state to remember the last id we toasted for.
  const [lastToastedJobId, setLastToastedJobId] = useState<string | null>(null);
  useEffect(() => {
    if (!job || !lastTerminalStatus) return;
    if (lastToastedJobId === job.id) return;
    setLastToastedJobId(job.id);
    if (lastTerminalStatus === 'done') {
      const counts = job.counts ?? {};
      const failed = job.failed_substeps ?? [];
      if (failed.length > 0) {
        toast.warning('Données de test générées avec des erreurs partielles', {
          description: `${counts.parcels ?? 0} parcelles. Échecs : ${failed.join(', ')}`,
          duration: 8000,
        });
      } else {
        toast.success('Données de test générées', {
          description: `${counts.parcels ?? 0} parcelles, ${counts.contributions ?? 0} contributions, ${counts.invoices ?? 0} factures`,
        });
      }
      onComplete();
    } else if (lastTerminalStatus === 'error') {
      toast.error('Erreur lors de la génération', {
        description: job.error ?? 'Veuillez réessayer',
      });
      onComplete();
    } else if (lastTerminalStatus === 'cancelled') {
      toast.info('Génération annulée');
      onComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id, lastTerminalStatus]);

  const invokeCleanup = useCallback(async (): Promise<CleanupResult> => {
    const { data, error } = await supabase.functions.invoke('cleanup-test-data-batch');
    if (error) throw new Error(error.message);
    const result = (data ?? {}) as CleanupResult;
    setCleanupPerStep(result.per_step ?? result.partial_summary ?? {});
    setCleanupFailedStep(result.failed_step ?? null);
    setCleanupTruncatedSteps(result.truncated_steps ?? []);
    return result;
  }, []);

  const cleanupTestData = useCallback(async () => {
    try {
      setCleaningUp(true);
      setCleanupPerStep(null);
      setCleanupFailedStep(null);
      setCleanupTruncatedSteps([]);
      toast.info('Nettoyage par lots en cours…', {
        description: 'Cela peut prendre quelques instants sur de gros volumes',
      });
      const result = await invokeCleanup();
      if (result.ok === false) {
        const partial = result.partial_total ?? 0;
        throw new Error(
          `Étape "${result.failed_step}" : ${result.error ?? 'erreur inconnue'} (${partial} déjà supprimés)`,
        );
      }
      const totalDeleted = result.total_deleted ?? 0;
      const stepCount = result.per_step ? Object.keys(result.per_step).length : 0;
      toast.success('Données de test supprimées', {
        description: `${totalDeleted} enregistrements supprimés dans ${stepCount} étapes`,
      });
      if ((result.truncated_steps?.length ?? 0) > 0) {
        toast.warning('Plafond de sécurité atteint', {
          description: `Étapes potentiellement incomplètes : ${result.truncated_steps!.join(', ')}.`,
          duration: 10000,
        });
      }
      await onComplete();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Veuillez réessayer';
      console.error('Erreur lors du nettoyage:', error);
      toast.error('Erreur lors du nettoyage', { description: message });
    } finally {
      setCleaningUp(false);
    }
  }, [onComplete, invokeCleanup]);

  const generateTestData = useCallback(async () => {
    if (!userId) {
      toast.error('Erreur', { description: 'Vous devez être connecté' });
      return;
    }
    if (isActive) {
      toast.info('Une génération est déjà en cours');
      return;
    }

    // Guard: bail if test parcels already exist
    try {
      const { count } = await supabase
        .from('cadastral_parcels')
        .select('id', { count: 'exact', head: true })
        .like('parcel_number', 'TEST-%');
      if (count && count > 0) {
        toast.warning('Données test existantes détectées', {
          description: `${count} parcelles test existent déjà. Utilisez « Régénérer » pour remplacer.`,
          duration: 6000,
        });
        return;
      }
    } catch {/* non-blocking */}

    // Reset any previous terminal job from view
    clearJob();

    const result = await startJob();
    if (!result.ok) {
      toast.error('Lancement impossible', { description: result.error });
      return;
    }
    toast.success('Génération lancée en arrière-plan', {
      description: 'Vous pouvez fermer cet onglet — la génération continuera côté serveur.',
      duration: 6000,
    });
  }, [userId, isActive, startJob, clearJob]);

  const regenerateTestData = useCallback(async () => {
    if (!userId) {
      toast.error('Erreur', { description: 'Vous devez être connecté' });
      return;
    }
    try {
      setRegenerating(true);
      setCleanupPerStep(null);
      setCleanupFailedStep(null);
      setCleanupTruncatedSteps([]);
      toast.info('Nettoyage des données existantes (par lots)…');
      const result = await invokeCleanup();
      if (result.ok === false) {
        throw new Error(
          `Étape "${result.failed_step}" : ${result.error ?? 'erreur inconnue'} (${result.partial_total ?? 0} déjà supprimés)`,
        );
      }
      toast.success('Données nettoyées, démarrage de la régénération en arrière-plan…');
      clearJob();
      const startResult = await startJob();
      if (!startResult.ok) {
        toast.error('Lancement impossible', { description: startResult.error });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Veuillez réessayer';
      console.error('Erreur lors de la régénération:', error);
      toast.error('Erreur lors de la régénération', { description: message });
    } finally {
      setRegenerating(false);
    }
  }, [userId, invokeCleanup, startJob, clearJob]);

  return {
    cleaningUp,
    generatingData,
    regenerating,
    generationSteps,
    currentStep,
    cleanupPerStep,
    cleanupFailedStep,
    cleanupTruncatedSteps,
    cleanupTestData,
    generateTestData,
    regenerateTestData,
    cancelGeneration: cancelJob,
    activeJob: job,
  };
};
