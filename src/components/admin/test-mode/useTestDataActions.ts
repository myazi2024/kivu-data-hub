import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logAuditAction } from '@/utils/supabaseConfigUtils';
import { toast } from 'sonner';
import type { TestDataStats } from './types';
import { toRecord } from './types';

interface UseTestDataActionsProps {
  userId?: string;
  stats: TestDataStats;
  onComplete: () => Promise<void>;
}

/** Generate a unique suffix to avoid duplicate parcel_number on repeated clicks */
const uniqueSuffix = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${ts}-${rand}`;
};

export const useTestDataActions = ({
  userId,
  stats,
  onComplete,
}: UseTestDataActionsProps) => {
  const [cleaningUp, setCleaningUp] = useState(false);
  const [generatingData, setGeneratingData] = useState(false);

  const cleanupTestData = async () => {
    try {
      setCleaningUp(true);

      // FK-safe deletion order — children first
      const { error: cccError } = await supabase
        .from('cadastral_contributor_codes')
        .delete()
        .ilike('parcel_number', 'TEST-%');
      if (cccError) console.error('Erreur suppression codes CCC:', cccError);

      const { error: accessError } = await supabase
        .from('cadastral_service_access')
        .delete()
        .ilike('parcel_number', 'TEST-%');
      if (accessError) console.error('Erreur suppression accès services:', accessError);

      const { error: invoiceError } = await supabase
        .from('cadastral_invoices')
        .delete()
        .ilike('parcel_number', 'TEST-%');
      if (invoiceError) console.error('Erreur suppression factures:', invoiceError);

      const { error: contribError } = await supabase
        .from('cadastral_contributions')
        .delete()
        .ilike('parcel_number', 'TEST-%');
      if (contribError) console.error('Erreur suppression contributions:', contribError);

      const { error: paymentError } = await supabase
        .from('payment_transactions')
        .delete()
        .filter('metadata->>test_mode', 'eq', 'true');
      if (paymentError) console.error('Erreur suppression paiements:', paymentError);

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
    } catch (error: any) {
      console.error('Erreur lors du nettoyage:', error);
      toast.error('Erreur lors du nettoyage', {
        description: error.message || 'Veuillez réessayer',
      });
    } finally {
      setCleaningUp(false);
    }
  };

  const generateTestData = async () => {
    if (!userId) {
      toast.error('Erreur', {
        description: 'Vous devez être connecté pour générer des données de test',
      });
      return;
    }

    try {
      setGeneratingData(true);

      const suffix = uniqueSuffix();

      const parcelNumbers = [
        `TEST-001-${suffix}`,
        `TEST-002-${suffix}`,
        `TEST-003-${suffix}`,
      ];

      const testContributions = [
        {
          parcel_number: parcelNumbers[0],
          property_title_type: 'Titre foncier',
          current_owner_name: 'Test User 1',
          area_sqm: 500,
          province: 'Kinshasa',
          ville: 'Kinshasa',
          commune: 'Gombe',
          status: 'approved',
          contribution_type: 'creation',
          user_id: userId,
        },
        {
          parcel_number: parcelNumbers[1],
          property_title_type: 'Concession',
          current_owner_name: 'Test User 2',
          area_sqm: 1000,
          province: 'Nord-Kivu',
          ville: 'Goma',
          status: 'pending',
          contribution_type: 'creation',
          user_id: userId,
        },
        {
          parcel_number: parcelNumbers[2],
          property_title_type: 'Titre foncier',
          current_owner_name: 'Test User 3',
          area_sqm: 750,
          province: 'Sud-Kivu',
          ville: 'Bukavu',
          status: 'rejected',
          contribution_type: 'update',
          user_id: userId,
        },
      ];

      const { error: contribError } = await supabase
        .from('cadastral_contributions')
        .insert(testContributions);

      if (contribError) throw contribError;

      // Pass empty invoice_number — the DB trigger will auto-generate it
      const testInvoices = [
        {
          parcel_number: parcelNumbers[0],
          invoice_number: '',
          selected_services: ['carte_cadastrale', 'fiche_identification'] as any,
          total_amount_usd: 10,
          client_email: 'test@example.com',
          client_name: 'Test User 1',
          status: 'paid',
          user_id: userId,
        },
        {
          parcel_number: parcelNumbers[1],
          invoice_number: '',
          selected_services: ['carte_cadastrale'] as any,
          total_amount_usd: 5,
          client_email: 'test2@example.com',
          client_name: 'Test User 2',
          status: 'pending',
          user_id: userId,
        },
      ];

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('cadastral_invoices')
        .insert(testInvoices)
        .select('id, parcel_number');

      if (invoiceError) {
        // Partial rollback — cleanup contributions if invoices fail
        console.error('Erreur génération factures test, rollback contributions:', invoiceError);
        await supabase
          .from('cadastral_contributions')
          .delete()
          .in('parcel_number', parcelNumbers);

        throw new Error(
          `Échec de génération des factures (contributions annulées): ${invoiceError.message}`
        );
      }

      // Generate service_access records for paid invoices
      if (invoiceData && invoiceData.length > 0) {
        const paidInvoice = invoiceData.find(
          (inv) => inv.parcel_number === parcelNumbers[0]
        );
        if (paidInvoice) {
          const serviceAccessRecords = [
            {
              parcel_number: parcelNumbers[0],
              invoice_id: paidInvoice.id,
              service_type: 'carte_cadastrale',
              user_id: userId,
            },
            {
              parcel_number: parcelNumbers[0],
              invoice_id: paidInvoice.id,
              service_type: 'fiche_identification',
              user_id: userId,
            },
          ];

          const { error: accessError } = await supabase
            .from('cadastral_service_access')
            .insert(serviceAccessRecords);

          if (accessError) {
            console.error('Erreur génération accès services test (non bloquant):', accessError);
          }
        }
      }

      await logAuditAction(
        'TEST_DATA_GENERATED',
        'cadastral_contributions',
        undefined,
        undefined,
        toRecord({
          contributions: testContributions.length,
          invoices: testInvoices.length,
          suffix,
        })
      );

      toast.success('Données de test générées', {
        description: `${testContributions.length} contributions et ${testInvoices.length} factures de test créées`,
      });

      await onComplete();
    } catch (error: any) {
      console.error('Erreur lors de la génération:', error);
      toast.error('Erreur lors de la génération', {
        description: error.message || 'Veuillez réessayer',
      });
    } finally {
      setGeneratingData(false);
    }
  };

  return { cleaningUp, generatingData, cleanupTestData, generateTestData };
};
