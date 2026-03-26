import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logAuditAction } from '@/utils/supabaseConfigUtils';
import { toast } from 'sonner';
import type { TestDataStats, GenerationStep } from './types';
import { toRecord } from './types';
import {
  uniqueSuffix,
  verifyTestModeEnabled,
  generateParcels,
  generateContributions,
  generateInvoices,
  generatePayments,
  generateServiceAccess,
  generateTitleRequests,
  generateExpertiseRequests,
  generateDisputes,
  generateContributorCodes,
  generateFraudAttempts,
  
  generateOwnershipHistory,
  generateTaxHistory,
  generateBoundaryHistory,
  generateMortgages,
  generateBuildingPermits,
  generateCertificates,
  rollbackTestData,
} from './testDataGenerators';

interface UseTestDataActionsProps {
  userId?: string;
  stats: TestDataStats;
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
    setGenerationSteps(GENERATION_STEPS.map((s) => ({ ...s, status: 'pending' as const })));
    setCurrentStep(-1);
  };

  /** Helper: delete with error logging */
  const safeDelete = async (label: string, query: PromiseLike<{ error: any }>) => {
    const { error } = await query;
    if (error) console.error(`Cleanup ${label}:`, error.message);
  };

  const cleanupTestData = useCallback(async () => {
    try {
      setCleaningUp(true);

      // FK-safe cleanup: proper order with join-based deletions
      // 1. Fraud attempts (FK → contributions)
      const contribIds = (await supabase.from('cadastral_contributions').select('id').ilike('parcel_number', 'TEST-%')).data?.map(r => r.id) ?? [];
      if (contribIds.length > 0) {
        await safeDelete('fraud_attempts', supabase.from('fraud_attempts').delete().in('contribution_id', contribIds));
      }

      // 2. Contributor codes
      await safeDelete('contributor_codes', supabase.from('cadastral_contributor_codes').delete().ilike('parcel_number', 'TEST-%'));

      // 3. Service access (FK → invoices)
      await safeDelete('service_access', supabase.from('cadastral_service_access').delete().ilike('parcel_number', 'TEST-%'));

      // 4. Payments (before invoices)
      await safeDelete('payments', supabase.from('payment_transactions').delete().filter('metadata->>test_mode', 'eq', 'true'));

      // 5. Invoices
      await safeDelete('invoices', supabase.from('cadastral_invoices').delete().ilike('parcel_number', 'TEST-%'));

      // 6. Contributions
      await safeDelete('contributions', supabase.from('cadastral_contributions').delete().ilike('parcel_number', 'TEST-%'));

      // 7. Parcel children
      const parcelIds = (await supabase.from('cadastral_parcels').select('id').ilike('parcel_number', 'TEST-%')).data?.map(r => r.id) ?? [];
      if (parcelIds.length > 0) {
        await safeDelete('ownership_history', supabase.from('cadastral_ownership_history').delete().in('parcel_id', parcelIds));
        await safeDelete('tax_history', supabase.from('cadastral_tax_history').delete().in('parcel_id', parcelIds));
        await safeDelete('boundary_history', supabase.from('cadastral_boundary_history').delete().in('parcel_id', parcelIds));
        await safeDelete('mortgages', supabase.from('cadastral_mortgages').delete().in('parcel_id', parcelIds));
        await safeDelete('building_permits', supabase.from('cadastral_building_permits').delete().in('parcel_id', parcelIds));
      }

      // 8. Parcels
      await safeDelete('parcels', supabase.from('cadastral_parcels').delete().ilike('parcel_number', 'TEST-%'));

      // 9. Independent tables
      await safeDelete('expertise_requests', supabase.from('real_estate_expertise_requests').delete().ilike('reference_number', 'TEST-%'));
      await safeDelete('disputes', supabase.from('cadastral_land_disputes').delete().ilike('parcel_number', 'TEST-%'));
      await safeDelete('title_requests', supabase.from('land_title_requests').delete().ilike('reference_number', 'TEST-%'));
      
      await safeDelete('certificates', supabase.from('generated_certificates').delete().ilike('reference_number', 'TEST-%'));

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
        await rollbackTestData(parcelNumbers, suffix);
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
        await rollbackTestData(parcelNumbers, suffix);
        throw invoiceError;
      }

      // Step 4: Payment transactions
      updateStep(4, 'running');
      try {
        await generatePayments(userId, invoices);
        updateStep(4, 'done');
      } catch (paymentError) {
        updateStep(4, 'error');
        await rollbackTestData(parcelNumbers, suffix);
        throw paymentError;
      }

      // Step 5: Service access (non-blocking)
      updateStep(5, 'running');
      await generateServiceAccess(userId, invoices);
      updateStep(5, 'done');

      // Step 6: Contributor codes
      updateStep(6, 'running');
      try {
        await generateContributorCodes(userId, contributions);
        updateStep(6, 'done');
      } catch (cccError) {
        updateStep(6, 'error');
        console.error('Codes CCC (non-bloquant):', cccError);
      }

      // Step 7: Title requests
      updateStep(7, 'running');
      try {
        await generateTitleRequests(userId, suffix);
        updateStep(7, 'done');
      } catch (titleError) {
        updateStep(7, 'error');
        console.error('Title requests failed (non-blocking):', titleError);
      }

      // Step 8: Expertise requests
      updateStep(8, 'running');
      try {
        await generateExpertiseRequests(userId, parcelNumbers, suffix);
        updateStep(8, 'done');
      } catch (expError) {
        updateStep(8, 'error');
        console.error('Expertise requests failed (non-blocking):', expError);
      }

      // Step 9: Disputes (with lifting data)
      updateStep(9, 'running');
      try {
        await generateDisputes(parcelNumbers, suffix, userId);
        updateStep(9, 'done');
      } catch (dispError) {
        updateStep(9, 'error');
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
        console.error('History (non-blocking):', histError);
      }

      // Step 11: Boundary history + mortgages + building permits (Bug 17 fix)
      updateStep(11, 'running');
      try {
        await generateBoundaryHistory(parcels);
        await generateMortgages(parcels);
        await generateBuildingPermits(parcels);
        updateStep(11, 'done');
      } catch (bmError) {
        updateStep(11, 'error');
        console.error('Bornages/hypothèques/permis (non-blocking):', bmError);
      }

      // Step 12: Fraud attempts + certificates (non-blocking)
      updateStep(12, 'running');
      try {
        await generateFraudAttempts(userId, contributions);
        await generateCertificates(parcelNumbers, suffix, userId);
        updateStep(12, 'done');
      } catch (fcError) {
        updateStep(12, 'error');
        console.error('Fraud/certificates (non-blocking):', fcError);
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
          entities: [
            'parcels', 'contributions', 'invoices', 'payments', 'service_access',
            'contributor_codes', 'title_requests', 'expertise', 'disputes',
            'ownership_history', 'tax_history',
            'boundary_history', 'mortgages', 'building_permits',
            'fraud_attempts', 'certificates',
          ],
        })
      );

      toast.success('Données de test générées', {
        description: `${parcels.length} parcelles, ${contributions.length} contributions, ${invoices.length} factures et 10+ entités associées`,
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
