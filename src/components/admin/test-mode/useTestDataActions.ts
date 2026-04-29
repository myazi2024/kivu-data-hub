import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logAuditAction } from '@/utils/supabaseConfigUtils';
import { toast } from 'sonner';
import type { GenerationStep } from './types';
import { toRecord } from './types';
import {
  uniqueSuffix,
  generateParcelNumbers,
  verifyTestModeEnabled,
  generateParcels,
  generateContributions,
  generateInvoices,
  generatePayments,
  generateTitleRequests,
  generateExpertiseRequests,
  generateExpertisePayments,
  generateDisputes,
  generateContributorCodes,
  generateFraudAttempts,
  generateBoundaryConflicts,
  generateOwnershipHistory,
  generateTaxHistory,
  generateBoundaryHistory,
  generateMortgages,
  generateMortgagePayments,
  generateBuildingPermits,
  generateCertificates,
  generateMutationRequests,
  generateSubdivisionRequests,
  generateSubdivisionLotsAndRoads,
} from './testDataGenerators';
import { buildGenerationSteps, type StepCtx } from './generationStepsRegistry';

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
}

/**
 * Orchestrates test data generation/cleanup using the declarative step registry
 * (`generationStepsRegistry.ts`). Each step is rendered in `GenerationProgress`
 * via `generationSteps` state.
 */
export const useTestDataActions = ({ userId, onComplete }: UseTestDataActionsProps) => {
  const [cleaningUp, setCleaningUp] = useState(false);
  const [generatingData, setGeneratingData] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Stable step definitions; generators are imported at module top.
  const stepDefs = useMemo(
    () =>
      buildGenerationSteps({
        verifyTestModeEnabled,
        generateParcels,
        generateContributions,
        generateInvoices,
        generatePayments,
        generateContributorCodes,
        generateTitleRequests,
        generateExpertiseRequests,
        generateExpertisePayments,
        generateDisputes,
        generateOwnershipHistory,
        generateTaxHistory,
        generateBoundaryHistory,
        generateMortgages,
        generateMortgagePayments,
        generateBuildingPermits,
        generateBoundaryConflicts,
        generateFraudAttempts,
        generateCertificates,
        generateMutationRequests,
        generateSubdivisionRequests,
        generateSubdivisionLotsAndRoads,
      }),
    [],
  );

  const initialSteps: GenerationStep[] = useMemo(
    () => stepDefs.map((s) => ({ label: s.label, status: 'pending' as const })),
    [stepDefs],
  );

  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>(initialSteps);
  const [currentStep, setCurrentStep] = useState(-1);

  const updateStep = (index: number, status: GenerationStep['status']) => {
    setGenerationSteps((prev) => prev.map((s, i) => (i === index ? { ...s, status } : s)));
    setCurrentStep(index);
  };

  const resetSteps = () => {
    setGenerationSteps(initialSteps.map((s) => ({ ...s, status: 'pending' as const })));
    setCurrentStep(-1);
  };

  const invokeCleanup = async (): Promise<CleanupResult> => {
    const { data, error } = await supabase.functions.invoke('cleanup-test-data-batch');
    if (error) throw new Error(error.message);
    return (data ?? {}) as CleanupResult;
  };

  const cleanupTestData = useCallback(async () => {
    try {
      setCleaningUp(true);
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
      await onComplete();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Veuillez réessayer';
      console.error('Erreur lors du nettoyage:', error);
      toast.error('Erreur lors du nettoyage', { description: message });
    } finally {
      setCleaningUp(false);
    }
  }, [onComplete]);

  const generateTestData = useCallback(async () => {
    if (!userId) {
      toast.error('Erreur', { description: 'Vous devez être connecté pour générer des données de test' });
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
          description: `${count} parcelles test existent déjà. Utilisez « Régénérer » pour remplacer les données.`,
          duration: 6000,
        });
        return;
      }
    } catch {
      /* non-blocking */
    }

    const suffix = uniqueSuffix();
    const ctx: StepCtx = {
      userId,
      suffix,
      parcelNumbers: generateParcelNumbers(suffix),
      parcels: [],
      contributions: [],
      invoices: [],
      failedSteps: [],
    };

    try {
      setGeneratingData(true);
      resetSteps();

      for (let i = 0; i < stepDefs.length; i++) {
        const step = stepDefs[i];
        updateStep(i, 'running');
        try {
          await step.run(ctx);
          // Mark partial-error if sub-failures were collected during this step
          const hadSubFailures = step.key === 'mortgages_permits' || step.key === 'mutations_subdivisions';
          updateStep(i, hadSubFailures && ctx.failedSteps.length > 0 ? 'error' : 'done');
        } catch (err) {
          updateStep(i, 'error');
          if (step.blocking) {
            if (step.key === 'verify') {
              toast.error('Mode test non actif', { description: 'Activez le mode test avant de générer des données.' });
              return;
            }
            if (['contributions', 'invoices', 'payments'].includes(step.key)) {
              toast.warning('Génération partielle — utilisez « Nettoyer » pour supprimer les données incomplètes');
            }
            throw err;
          }
          ctx.failedSteps.push(step.label);
          console.error(`${step.label} (non-bloquant):`, err);
        }
      }

      await logAuditAction(
        'TEST_DATA_GENERATED',
        'cadastral_contributions',
        undefined,
        undefined,
        toRecord({
          contributions: ctx.contributions.length,
          invoices: ctx.invoices.length,
          parcels: ctx.parcels.length,
          suffix,
          failedSteps: ctx.failedSteps,
          steps: stepDefs.map((s) => s.key),
        }),
      );

      if (ctx.failedSteps.length > 0) {
        toast.warning('Données de test générées avec des erreurs partielles', {
          description: `${ctx.parcels.length} parcelles créées. Échecs : ${ctx.failedSteps.join(', ')}`,
          duration: 8000,
        });
      } else {
        toast.success('Données de test générées', {
          description: `${ctx.parcels.length} parcelles, ${ctx.contributions.length} contributions, ${ctx.invoices.length} factures et 10+ entités associées`,
        });
      }
      await onComplete();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Veuillez réessayer';
      console.error('Erreur lors de la génération:', error);
      toast.error('Erreur lors de la génération', { description: message });
    } finally {
      setGeneratingData(false);
    }
  }, [userId, onComplete, stepDefs]);

  const regenerateTestData = useCallback(async () => {
    if (!userId) {
      toast.error('Erreur', { description: 'Vous devez être connecté' });
      return;
    }
    try {
      setRegenerating(true);
      toast.info('Nettoyage des données existantes (par lots)…');
      const result = await invokeCleanup();
      if (result.ok === false) {
        throw new Error(
          `Étape "${result.failed_step}" : ${result.error ?? 'erreur inconnue'} (${result.partial_total ?? 0} déjà supprimés)`,
        );
      }
      toast.success('Données nettoyées, régénération en cours…');
      await generateTestData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Veuillez réessayer';
      console.error('Erreur lors de la régénération:', error);
      toast.error('Erreur lors de la régénération', { description: message });
    } finally {
      setRegenerating(false);
    }
  }, [userId, generateTestData]);

  return {
    cleaningUp,
    generatingData,
    regenerating,
    generationSteps,
    currentStep,
    cleanupTestData,
    generateTestData,
    regenerateTestData,
  };
};
