import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logAuditAction } from '@/utils/supabaseConfigUtils';
import { toast } from 'sonner';
import type { TestDataStats, GenerationStep } from './types';
import { TEST_TABLES_DELETION_ORDER, toRecord } from './types';
import {
  uniqueSuffix,
  verifyTestModeEnabled,
  generateContributions,
  generateInvoices,
  generatePayments,
  generateServiceAccess,
  generateTitleRequests,
  generateExpertiseRequests,
  generateDisputes,
  rollbackTestData,
} from './testDataGenerators';

interface UseTestDataActionsProps {
  userId?: string;
  stats: TestDataStats;
  onComplete: () => Promise<void>;
}

const GENERATION_STEPS: GenerationStep[] = [
  { label: 'Vérification du mode test', status: 'pending' },
  { label: 'Contributions cadastrales', status: 'pending' },
  { label: 'Factures', status: 'pending' },
  { label: 'Transactions de paiement', status: 'pending' },
  { label: 'Accès aux services', status: 'pending' },
  { label: 'Demandes de titres fonciers', status: 'pending' },
  { label: 'Demandes d\'expertise', status: 'pending' },
  { label: 'Litiges fonciers', status: 'pending' },
];

export const useTestDataActions = ({
  userId,
  stats,
  onComplete,
}: UseTestDataActionsProps) => {
  const [cleaningUp, setCleaningUp] = useState(false);
  const [generatingData, setGeneratingData] = useState(false);
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>(GENERATION_STEPS);
  const [currentStep, setCurrentStep] = useState(-1);

  const updateStep = (index: number, status: GenerationStep['status']) => {
    setGenerationSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, status } : s))
    );
    setCurrentStep(index);
  };

  const resetSteps = () => {
    setGenerationSteps(GENERATION_STEPS.map((s) => ({ ...s, status: 'pending' })));
    setCurrentStep(-1);
  };

  const cleanupTestData = useCallback(async () => {
    try {
      setCleaningUp(true);

      // Use shared deletion order
      for (const entry of TEST_TABLES_DELETION_ORDER) {
        const query = supabase.from(entry.table).delete();
        if (entry.filter === 'ilike') {
          const { error } = await (query as any).ilike(entry.column, entry.value);
          if (error) console.error(`Erreur suppression ${entry.table}:`, error);
        } else {
          const { error } = await (query as any).filter(entry.column, 'eq', entry.value);
          if (error) console.error(`Erreur suppression ${entry.table}:`, error);
        }
      }

      await logAuditAction(
        'TEST_DATA_CLEANUP',
        'cadastral_contributions',
        undefined,
        toRecord({ stats_before: stats }),
        toRecord({ cleaned: true })
      );

      toast.success('Données de test supprimées', {
        description: 'Toutes les données de test ont été nettoyées',
      });

      await onComplete();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Veuillez réessayer';
      console.error('Erreur lors du nettoyage:', error);
      toast.error('Erreur lors du nettoyage', { description: message });
    } finally {
      setCleaningUp(false);
    }
  }, [stats, onComplete]);

  const generateTestData = useCallback(async () => {
    if (!userId) {
      toast.error('Erreur', {
        description: 'Vous devez être connecté pour générer des données de test',
      });
      return;
    }

    const suffix = uniqueSuffix();
    const parcelNumbers = [
      `TEST-001-${suffix}`,
      `TEST-002-${suffix}`,
      `TEST-003-${suffix}`,
      `TEST-004-${suffix}`,
      `TEST-005-${suffix}`,
    ];

    try {
      setGeneratingData(true);
      resetSteps();

      // Step 0: Verify test mode on server
      updateStep(0, 'running');
      const isEnabled = await verifyTestModeEnabled();
      if (!isEnabled) {
        updateStep(0, 'error');
        toast.error('Mode test non actif', {
          description: 'Activez le mode test avant de générer des données.',
        });
        return;
      }
      updateStep(0, 'done');

      // Step 1: Contributions
      updateStep(1, 'running');
      const contributions = await generateContributions(userId, parcelNumbers);
      updateStep(1, 'done');

      // Step 2: Invoices
      updateStep(2, 'running');
      let invoices: Array<{ id: string; parcel_number: string; status: string }>;
      try {
        invoices = await generateInvoices(userId, parcelNumbers);
        updateStep(2, 'done');
      } catch (invoiceError) {
        updateStep(2, 'error');
        console.error('Rollback contributions after invoice failure:', invoiceError);
        await rollbackTestData(parcelNumbers, suffix);
        throw invoiceError;
      }

      // Step 3: Payment transactions
      updateStep(3, 'running');
      try {
        await generatePayments(userId, invoices);
        updateStep(3, 'done');
      } catch (paymentError) {
        updateStep(3, 'error');
        console.error('Rollback after payment failure:', paymentError);
        await rollbackTestData(parcelNumbers, suffix);
        throw paymentError;
      }

      // Step 4: Service access (non-blocking)
      updateStep(4, 'running');
      await generateServiceAccess(userId, invoices);
      updateStep(4, 'done');

      // Step 5: Title requests
      updateStep(5, 'running');
      try {
        await generateTitleRequests(userId, suffix);
        updateStep(5, 'done');
      } catch (titleError) {
        updateStep(5, 'error');
        console.error('Title requests failed (non-blocking):', titleError);
        // Non-blocking: continue
      }

      // Step 6: Expertise requests
      updateStep(6, 'running');
      try {
        await generateExpertiseRequests(userId, parcelNumbers, suffix);
        updateStep(6, 'done');
      } catch (expError) {
        updateStep(6, 'error');
        console.error('Expertise requests failed (non-blocking):', expError);
      }

      // Step 7: Disputes
      updateStep(7, 'running');
      try {
        await generateDisputes(parcelNumbers, suffix, userId);
        updateStep(7, 'done');
      } catch (dispError) {
        updateStep(7, 'error');
        console.error('Disputes failed (non-blocking):', dispError);
      }

      await logAuditAction(
        'TEST_DATA_GENERATED',
        'cadastral_contributions',
        undefined,
        undefined,
        toRecord({
          contributions: contributions.length,
          invoices: invoices.length,
          suffix,
          entities: ['contributions', 'invoices', 'payments', 'service_access', 'title_requests', 'expertise', 'disputes'],
        })
      );

      toast.success('Données de test générées', {
        description: `${contributions.length} contributions, ${invoices.length} factures, demandes de titres, expertises et litiges créés`,
      });

      await onComplete();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Veuillez réessayer';
      console.error('Erreur lors de la génération:', error);
      toast.error('Erreur lors de la génération', { description: message });
    } finally {
      setGeneratingData(false);
    }
  }, [userId, onComplete]);

  return {
    cleaningUp,
    generatingData,
    generationSteps,
    currentStep,
    cleanupTestData,
    generateTestData,
  };
};
