import { useState, useCallback } from 'react';
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
  generateServiceAccess,
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
  generateBuildingPermits,
  generateCertificates,
  generateMutationRequests,
  generateSubdivisionRequests,
} from './testDataGenerators';

interface UseTestDataActionsProps {
  userId?: string;
  onComplete: () => Promise<void>;
}

const GENERATION_STEPS: GenerationStep[] = [
  { label: 'Vérification du mode test', status: 'pending' },
  { label: 'Parcelles cadastrales', status: 'pending' },
  { label: 'Contributions cadastrales', status: 'pending' },
  { label: 'Factures', status: 'pending' },
  { label: 'Transactions de paiement', status: 'pending' },
  { label: 'Accès aux services', status: 'pending' },
  { label: 'Codes contributeurs (CCC)', status: 'pending' },
  { label: 'Demandes de titres fonciers', status: 'pending' },
  { label: 'Demandes d\'expertise', status: 'pending' },
  { label: 'Litiges fonciers', status: 'pending' },
  
  { label: 'Historique propriété & taxes', status: 'pending' },
  { label: 'Bornages & hypothèques & permis', status: 'pending' },
  { label: 'Fraudes & certificats', status: 'pending' },
  { label: 'Mutations & lotissements', status: 'pending' },
];

export const useTestDataActions = ({
  userId,
  onComplete,
}: UseTestDataActionsProps) => {
  const [cleaningUp, setCleaningUp] = useState(false);
  const [generatingData, setGeneratingData] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>(GENERATION_STEPS);
  const [currentStep, setCurrentStep] = useState(-1);

  const updateStep = (index: number, status: GenerationStep['status']) => {
    setGenerationSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, status } : s))
    );
    setCurrentStep(index);
  };

  const resetSteps = () => {
    setGenerationSteps(GENERATION_STEPS.map((s) => ({ ...s, status: 'pending' as const })));
    setCurrentStep(-1);
  };

  const cleanupTestData = useCallback(async () => {
    try {
      setCleaningUp(true);

      const { data, error } = await supabase.rpc('cleanup_all_test_data');

      if (error) {
        throw new Error(error.message);
      }

      const deleted = data as Record<string, number> | null;
      const totalDeleted = deleted
        ? Object.values(deleted).reduce((sum, v) => sum + (v || 0), 0)
        : 0;

      toast.success('Données de test supprimées', {
        description: `${totalDeleted} enregistrements supprimés dans ${deleted ? Object.keys(deleted).length : 0} tables`,
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
      toast.error('Erreur', {
        description: 'Vous devez être connecté pour générer des données de test',
      });
      return;
    }

    // Duplication guard: check if test data already exists
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
      // Non-blocking: proceed with generation if check fails
    }

    const suffix = uniqueSuffix();
    const parcelNumbers = generateParcelNumbers(suffix);
    const failedSteps: string[] = [];

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

      // Step 1: Parcels (needed for FK joins in analytics)
      updateStep(1, 'running');
      let parcels: Array<{ id: string; parcel_number: string }>;
      try {
        parcels = await generateParcels(parcelNumbers);
        updateStep(1, 'done');
      } catch (parcelError) {
        updateStep(1, 'error');
        throw parcelError;
      }

      // Step 2: Contributions
      updateStep(2, 'running');
      let contributions: Array<{ id: string; parcel_number: string }>;
      try {
        contributions = await generateContributions(userId, parcelNumbers);
        updateStep(2, 'done');
      } catch (contribError) {
        updateStep(2, 'error');
        toast.warning('Génération partielle — utilisez « Nettoyer » pour supprimer les données incomplètes');
        throw contribError;
      }

      // Step 3: Invoices
      updateStep(3, 'running');
      let invoices: Array<{ id: string; parcel_number: string; status: string }>;
      try {
        invoices = await generateInvoices(userId, parcelNumbers);
        updateStep(3, 'done');
      } catch (invoiceError) {
        updateStep(3, 'error');
        toast.warning('Génération partielle — utilisez « Nettoyer » pour supprimer les données incomplètes');
        throw invoiceError;
      }

      // Step 4: Payment transactions
      updateStep(4, 'running');
      try {
        await generatePayments(userId, invoices);
        updateStep(4, 'done');
      } catch (paymentError) {
        updateStep(4, 'error');
        toast.warning('Génération partielle — utilisez « Nettoyer » pour supprimer les données incomplètes');
        throw paymentError;
      }

      // Step 5: Service access (non-blocking)
      updateStep(5, 'running');
      try {
        await generateServiceAccess(userId, invoices);
        updateStep(5, 'done');
      } catch (saError) {
        updateStep(5, 'error');
        failedSteps.push('Accès services');
        console.error('Service access (non-bloquant):', saError);
      }

      // Step 6: Contributor codes
      updateStep(6, 'running');
      try {
        await generateContributorCodes(userId, contributions);
        updateStep(6, 'done');
      } catch (cccError) {
        updateStep(6, 'error');
        failedSteps.push('Codes CCC');
        console.error('Codes CCC (non-bloquant):', cccError);
      }

      // Step 7: Title requests
      updateStep(7, 'running');
      try {
        await generateTitleRequests(userId, suffix);
        updateStep(7, 'done');
      } catch (titleError) {
        updateStep(7, 'error');
        failedSteps.push('Demandes titres');
        console.error('Title requests failed (non-blocking):', titleError);
      }

      // Step 8: Expertise requests + payments
      updateStep(8, 'running');
      try {
        const expertiseRequests = await generateExpertiseRequests(userId, parcelNumbers, suffix);
        await generateExpertisePayments(userId, expertiseRequests);
        updateStep(8, 'done');
      } catch (expError) {
        updateStep(8, 'error');
        failedSteps.push('Expertises');
        console.error('Expertise requests/payments failed (non-blocking):', expError);
      }

      // Step 9: Disputes (with lifting data)
      updateStep(9, 'running');
      try {
        await generateDisputes(parcelNumbers, suffix, userId);
        updateStep(9, 'done');
      } catch (dispError) {
        updateStep(9, 'error');
        failedSteps.push('Litiges');
        console.error('Disputes failed (non-blocking):', dispError);
      }

      // Step 10: Ownership history + tax history (non-blocking)
      updateStep(10, 'running');
      try {
        await generateOwnershipHistory(parcels);
        await generateTaxHistory(parcels);
        updateStep(10, 'done');
      } catch (histError) {
        updateStep(10, 'error');
        failedSteps.push('Historique');
        console.error('History (non-blocking):', histError);
      }

      // Step 11: Boundary history + mortgages + building permits + boundary conflicts
      updateStep(11, 'running');
      try {
        await generateBoundaryHistory(parcels);
        await generateMortgages(parcels);
        await generateBuildingPermits(parcels);
        await generateBoundaryConflicts(parcelNumbers, userId);
        updateStep(11, 'done');
      } catch (bmError) {
        updateStep(11, 'error');
        failedSteps.push('Bornages/hypothèques/permis');
        console.error('Bornages/hypothèques/permis/conflits (non-blocking):', bmError);
      }

      // Step 12: Fraud attempts + certificates (non-blocking)
      updateStep(12, 'running');
      try {
        await generateFraudAttempts(userId, contributions);
        await generateCertificates(parcelNumbers, suffix, userId);
        updateStep(12, 'done');
      } catch (fcError) {
        updateStep(12, 'error');
        failedSteps.push('Fraudes/certificats');
        console.error('Fraud/certificates (non-blocking):', fcError);
      }

      // Step 13: Mutations & subdivisions (non-blocking)
      updateStep(13, 'running');
      try {
        await generateMutationRequests(userId, parcels, suffix);
        await generateSubdivisionRequests(userId, parcels, suffix);
        updateStep(13, 'done');
      } catch (msError) {
        updateStep(13, 'error');
        failedSteps.push('Mutations/lotissements');
        console.error('Mutations/subdivisions (non-blocking):', msError);
      }

      await logAuditAction(
        'TEST_DATA_GENERATED',
        'cadastral_contributions',
        undefined,
        undefined,
        toRecord({
          contributions: contributions.length,
          invoices: invoices.length,
          parcels: parcels.length,
          suffix,
          failedSteps,
          entities: [
            'parcels', 'contributions', 'invoices', 'payments', 'service_access',
            'contributor_codes', 'title_requests', 'expertise', 'disputes',
            'ownership_history', 'tax_history',
            'boundary_history', 'mortgages', 'building_permits',
            'fraud_attempts', 'certificates',
            'mutation_requests', 'subdivision_requests',
          ],
        })
      );

      if (failedSteps.length > 0) {
        toast.warning('Données de test générées avec des erreurs partielles', {
          description: `${parcels.length} parcelles créées. Échecs : ${failedSteps.join(', ')}`,
          duration: 8000,
        });
      } else {
        toast.success('Données de test générées', {
          description: `${parcels.length} parcelles (26 provinces, densité variable), ${contributions.length} contributions, ${invoices.length} factures et 10+ entités associées`,
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
  }, [userId, onComplete]);

  const regenerateTestData = useCallback(async () => {
    if (!userId) {
      toast.error('Erreur', { description: 'Vous devez être connecté' });
      return;
    }
    try {
      setRegenerating(true);
      toast.info('Nettoyage des données existantes…');
      const { error } = await supabase.rpc('cleanup_all_test_data');
      if (error) throw new Error(error.message);
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
