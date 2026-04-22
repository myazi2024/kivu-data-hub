import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Gift, Play, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppealManagementDialog } from './appeals/AppealManagementDialog';
import { PermitRequestDialog } from './permits/PermitRequestDialog';
import { DocumentsGalleryDialog } from './documents/DocumentsGalleryDialog';
import { usePagination } from '@/hooks/usePagination';
import { exportToCSV } from '@/utils/csvExport';
import { logContributionAudit } from '@/utils/contributionAudit';
import CCCStatsCards from './ccc/CCCStatsCards';
import CCCBulkActions from './ccc/CCCBulkActions';
import { CCCFilters } from './ccc/CCCFilters';
import { CCCContributionsTable } from './ccc/CCCContributionsTable';
import { calculateCCCCompleteness } from './ccc/cccCompleteness';
import { CCCDetailsDialog } from './ccc/CCCDetailsDialog';
import { CCCTestDialog } from './ccc/CCCTestDialog';
import type { Contribution, ContributionStats, ValidationResult, TestResult } from './ccc/types';
import type {
  OwnershipHistoryEntry, BoundaryHistoryEntry, BuildingPermitEntry,
  MortgageHistoryEntry, GpsCoordinate,
} from './ccc/cccHelpers';

const AdminCCCContributions: React.FC = () => {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [stats, setStats] = useState<ContributionStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    suspicious: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [showAppealDialog, setShowAppealDialog] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showPermitDialog, setShowPermitDialog] = useState(false);
  const [showDocumentsDialog, setShowDocumentsDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  // Pagination - sera initialisée après filteredContributions

  useEffect(() => {
    fetchContributions();

    // Realtime debounced (300 ms) pour limiter les refetch en rafale
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel('admin-contributions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cadastral_contributions'
        },
        () => {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => fetchContributions(), 300);
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchContributions = async () => {
    try {
      setLoading(true);
      
      // Fetch all contributions using pagination to bypass 1000-row limit
      let allData: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('cadastral_contributions')
          .select('*')
          .not('parcel_number', 'ilike', 'TEST-%')
          .order('created_at', { ascending: false })
          .range(from, from + batchSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      setContributions(allData);
      
      // Calculer les statistiques
      const stats: ContributionStats = {
        total: allData.length,
        pending: allData.filter(c => c.status === 'pending').length,
        approved: allData.filter(c => c.status === 'approved').length,
        rejected: allData.filter(c => c.status === 'rejected').length,
        suspicious: allData.filter(c => c.is_suspicious).length
      };
      setStats(stats);
    } catch (error: any) {
      console.error('Erreur lors du chargement des contributions:', error);
      toast.error('Erreur lors du chargement des contributions');
    } finally {
      setLoading(false);
    }
  };

  const validateContribution = async (contributionId: string) => {
    setIsValidating(true);
    try {
      const { data, error } = await supabase.rpc('validate_contribution_completeness', {
        contribution_id: contributionId
      });

      if (error) throw error;

      const result = data as unknown as ValidationResult;
      setValidationResult(result);
      
      if (result.valid) {
        toast.success(`✓ Validation réussie (Score: ${result.completeness_score}%)`);
      } else {
        toast.warning(`⚠ ${result.errors.length} erreur(s) trouvée(s)`);
      }
    } catch (error: any) {
      console.error('Erreur lors de la validation:', error);
      toast.error('Erreur lors de la validation');
      setValidationResult(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleApprove = async (contributionId: string) => {
    // Valider automatiquement si pas encore fait
    let validation = validationResult;
    
    if (!validation) {
      setIsValidating(true);
      try {
        const { data, error } = await supabase.rpc('validate_contribution_completeness', {
          contribution_id: contributionId
        });

        if (error) throw error;
        validation = data as unknown as ValidationResult;
        setValidationResult(validation);
      } catch (error: any) {
        console.error('Erreur lors de la validation:', error);
        toast.error('Erreur lors de la validation automatique');
        setIsValidating(false);
        return;
      } finally {
        setIsValidating(false);
      }
    }

    // Vérifier s'il y a des erreurs critiques
    if (!validation?.valid) {
      toast.error('La contribution contient des erreurs critiques. Veuillez les corriger avant d\'approuver.');
      return;
    }

    try {
      const contribution = contributions.find(c => c.id === contributionId);
      if (!contribution) {
        toast.error('Contribution non trouvée');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.id) {
        toast.error('Vous devez être connecté pour approuver une contribution');
        return;
      }

      console.log('Approbation de la contribution:', contributionId);

      // 1. Mettre à jour le statut de la contribution
      const { data: updatedContribution, error } = await supabase
        .from('cadastral_contributions')
        .update({ 
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          verified_by: user.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', contributionId)
        .select()
        .single();

      if (error) {
        console.error('Erreur Supabase lors de l\'approbation:', error);
        
        // Messages d'erreur plus explicites
        let errorMessage = 'Erreur lors de l\'approbation';
        if (error.message) {
          errorMessage += ': ' + error.message;
        }
        if (error.details) {
          errorMessage += ' - ' + error.details;
        }
        if (error.hint) {
          errorMessage += ' (Conseil: ' + error.hint + ')';
        }
        
        toast.error(errorMessage);
        return;
      }

      console.log('Contribution approuvée avec succès:', updatedContribution);

      // Vérifier si c'est une contribution de type "update" (mise à jour d'une parcelle existante)
      const isUpdateContribution = updatedContribution.contribution_type === 'update' && updatedContribution.original_parcel_id;

      let targetParcelId: string;

      if (isUpdateContribution) {
        // Pour les contributions "update", mettre à jour la parcelle existante avec les nouvelles données
        targetParcelId = updatedContribution.original_parcel_id;
        console.log('Contribution de mise à jour - mise à jour de la parcelle existante:', targetParcelId);

        const { error: updateParcelError } = await supabase
          .from('cadastral_parcels')
          .update({
            parcel_number: updatedContribution.parcel_number,
            current_owner_name: updatedContribution.current_owner_name,
            current_owner_legal_status: updatedContribution.current_owner_legal_status,
            current_owner_since: updatedContribution.current_owner_since,
            area_sqm: updatedContribution.area_sqm,
            parcel_type: updatedContribution.parcel_type || undefined,
            property_title_type: updatedContribution.property_title_type,
            title_reference_number: updatedContribution.title_reference_number,
            title_issue_date: updatedContribution.title_issue_date,
            lease_type: updatedContribution.lease_type,
            construction_type: updatedContribution.construction_type,
            construction_nature: updatedContribution.construction_nature,
            construction_materials: updatedContribution.construction_materials,
            construction_year: updatedContribution.construction_year,
            declared_usage: updatedContribution.declared_usage,
            standing: updatedContribution.standing,
            house_number: updatedContribution.house_number,
            property_category: updatedContribution.property_category,
            apartment_number: updatedContribution.apartment_number,
            floor_number: updatedContribution.floor_number,
            is_title_in_current_owner_name: updatedContribution.is_title_in_current_owner_name,
            lease_years: updatedContribution.lease_years,
            additional_constructions: updatedContribution.additional_constructions,
            road_sides: updatedContribution.road_sides,
            servitude_data: updatedContribution.servitude_data,
            has_dispute: updatedContribution.has_dispute,
            dispute_data: updatedContribution.dispute_data,
            building_shapes: updatedContribution.building_shapes,
            sound_environment: updatedContribution.sound_environment,
            nearby_noise_sources: updatedContribution.nearby_noise_sources,
            province: updatedContribution.province,
            ville: updatedContribution.ville,
            commune: updatedContribution.commune,
            quartier: updatedContribution.quartier,
            avenue: updatedContribution.avenue,
            territoire: updatedContribution.territoire,
            collectivite: updatedContribution.collectivite,
            groupement: updatedContribution.groupement,
            village: updatedContribution.village,
            location: [
              updatedContribution.province,
              updatedContribution.ville,
              updatedContribution.commune,
              updatedContribution.quartier
            ].filter(Boolean).join(', ') || undefined,
            gps_coordinates: updatedContribution.gps_coordinates,
            parcel_sides: updatedContribution.parcel_sides,
            whatsapp_number: updatedContribution.whatsapp_number,
            owner_document_url: updatedContribution.owner_document_url,
            property_title_document_url: updatedContribution.property_title_document_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', targetParcelId);

        if (updateParcelError) {
          console.error('Erreur lors de la mise à jour de la parcelle:', updateParcelError);
          toast.warning('Contribution approuvée mais erreur lors de la mise à jour de la parcelle');
        }
      } else {
        // Pour les nouvelles contributions, créer la parcelle
        let latitude = null;
        let longitude = null;
        if (updatedContribution.gps_coordinates && Array.isArray(updatedContribution.gps_coordinates) && updatedContribution.gps_coordinates.length > 0) {
          const firstCoord = updatedContribution.gps_coordinates[0] as any;
          latitude = firstCoord.lat || firstCoord.latitude || null;
          longitude = firstCoord.lng || firstCoord.longitude || null;
        }

        const { data: createdParcel, error: parcelError } = await supabase
          .from('cadastral_parcels')
          .insert({
            parcel_number: updatedContribution.parcel_number,
            current_owner_name: updatedContribution.current_owner_name,
            current_owner_legal_status: updatedContribution.current_owner_legal_status,
            current_owner_since: updatedContribution.current_owner_since,
            area_sqm: updatedContribution.area_sqm,
            parcel_type: updatedContribution.parcel_type || 'SU',
            property_title_type: updatedContribution.property_title_type,
            title_reference_number: updatedContribution.title_reference_number,
            title_issue_date: updatedContribution.title_issue_date,
            lease_type: updatedContribution.lease_type,
            construction_type: updatedContribution.construction_type,
            construction_nature: updatedContribution.construction_nature,
            construction_materials: updatedContribution.construction_materials,
            construction_year: updatedContribution.construction_year,
            declared_usage: updatedContribution.declared_usage,
            standing: updatedContribution.standing,
            house_number: updatedContribution.house_number,
            property_category: updatedContribution.property_category,
            apartment_number: updatedContribution.apartment_number,
            floor_number: updatedContribution.floor_number,
            is_title_in_current_owner_name: updatedContribution.is_title_in_current_owner_name,
            lease_years: updatedContribution.lease_years,
            additional_constructions: updatedContribution.additional_constructions,
            road_sides: updatedContribution.road_sides,
            servitude_data: updatedContribution.servitude_data,
            has_dispute: updatedContribution.has_dispute,
            dispute_data: updatedContribution.dispute_data,
            building_shapes: updatedContribution.building_shapes,
            sound_environment: updatedContribution.sound_environment,
            nearby_noise_sources: updatedContribution.nearby_noise_sources,
            province: updatedContribution.province,
            ville: updatedContribution.ville,
            commune: updatedContribution.commune,
            quartier: updatedContribution.quartier,
            avenue: updatedContribution.avenue,
            territoire: updatedContribution.territoire,
            collectivite: updatedContribution.collectivite,
            groupement: updatedContribution.groupement,
            village: updatedContribution.village,
            location: [
              updatedContribution.province,
              updatedContribution.ville,
              updatedContribution.commune,
              updatedContribution.quartier
            ].filter(Boolean).join(', ') || 'Non renseigné',
            gps_coordinates: updatedContribution.gps_coordinates,
            parcel_sides: updatedContribution.parcel_sides,
            latitude,
            longitude,
            whatsapp_number: updatedContribution.whatsapp_number,
            owner_document_url: updatedContribution.owner_document_url,
            property_title_document_url: updatedContribution.property_title_document_url
          })
          .select()
          .single();

        if (parcelError) {
          console.error('Erreur lors de la création de la parcelle:', parcelError);
          toast.error('Contribution approuvée mais erreur lors de la création de la parcelle');
          await fetchContributions();
          return;
        }

        targetParcelId = createdParcel.id;

        // Créer les historiques associés uniquement pour les nouvelles parcelles
        const historyErrors: string[] = [];

        if (updatedContribution.ownership_history && Array.isArray(updatedContribution.ownership_history)) {
          for (const history of updatedContribution.ownership_history) {
            if (typeof history === 'object' && history !== null) {
              const { error: ohError } = await supabase.from('cadastral_ownership_history').insert({
                parcel_id: targetParcelId,
                owner_name: (history as any).owner_name,
                legal_status: (history as any).legal_status,
                ownership_start_date: (history as any).ownership_start_date,
                ownership_end_date: (history as any).ownership_end_date,
                mutation_type: (history as any).mutation_type,
                ownership_document_url: (history as any).ownership_document_url
              });
              if (ohError) {
                console.error('Erreur historique propriété:', ohError);
                historyErrors.push('propriété');
              }
            }
          }
        }

        if (updatedContribution.boundary_history && Array.isArray(updatedContribution.boundary_history)) {
          for (const history of updatedContribution.boundary_history) {
            if (typeof history === 'object' && history !== null) {
              const { error: bhError } = await supabase.from('cadastral_boundary_history').insert({
                parcel_id: targetParcelId,
                pv_reference_number: (history as any).pv_reference_number,
                boundary_purpose: (history as any).boundary_purpose,
                surveyor_name: (history as any).surveyor_name,
                survey_date: (history as any).survey_date,
                boundary_document_url: (history as any).boundary_document_url
              });
              if (bhError) {
                console.error('Erreur historique bornage:', bhError);
                historyErrors.push('bornage');
              }
            }
          }
        }

        if (updatedContribution.tax_history && Array.isArray(updatedContribution.tax_history)) {
          for (const history of updatedContribution.tax_history) {
            if (typeof history === 'object' && history !== null) {
              // Compatibility helper: CCC stores camelCase, services store snake_case
              const rr = (obj: any, ...keys: string[]) => { for (const k of keys) { if (obj?.[k] !== undefined && obj[k] !== null) return obj[k]; } return null; };
              const { error: thError } = await supabase.from('cadastral_tax_history').insert({
                parcel_id: targetParcelId,
                tax_year: Number(rr(history, 'tax_year', 'taxYear')),
                amount_usd: Number(rr(history, 'amount_usd', 'amountUsd')) || 0,
                payment_status: rr(history, 'payment_status', 'paymentStatus') || 'En attente',
                payment_date: rr(history, 'payment_date', 'paymentDate'),
                receipt_document_url: rr(history, 'receipt_document_url', 'receiptDocumentUrl'),
              });
              if (thError) {
                console.error('Erreur historique taxes:', thError);
                historyErrors.push('taxes');
              }
            }
          }
        }

        if (updatedContribution.building_permits && Array.isArray(updatedContribution.building_permits)) {
          for (const permit of updatedContribution.building_permits) {
            if (typeof permit === 'object' && permit !== null) {
              const { error: bpError } = await supabase.from('cadastral_building_permits').insert({
                parcel_id: targetParcelId,
                permit_number: (permit as any).permit_number,
                issuing_service: (permit as any).issuing_service,
                issue_date: (permit as any).issue_date,
                validity_period_months: (permit as any).validity_period_months,
                administrative_status: (permit as any).administrative_status,
                is_current: (permit as any).is_current,
                issuing_service_contact: (permit as any).issuing_service_contact,
                permit_document_url: (permit as any).permit_document_url
              });
              if (bpError) {
                console.error('Erreur autorisation de bâtir:', bpError);
                historyErrors.push('permis');
              }
            }
          }
        }

        if (historyErrors.length > 0) {
          toast.warning(`Parcelle créée mais erreurs sur les historiques: ${historyErrors.join(', ')}`);
        }
      }

      // Traiter les hypothèques (pour les nouvelles contributions ET les mises à jour)
      if (updatedContribution.mortgage_history && Array.isArray(updatedContribution.mortgage_history)) {
        for (const history of updatedContribution.mortgage_history) {
          if (typeof history === 'object' && history !== null) {
            const h = history as any;
            // Gérer les deux formats de champs (camelCase du formulaire CCC et snake_case)
            const { error: mortgageError } = await supabase.from('cadastral_mortgages').insert({
              parcel_id: targetParcelId,
              mortgage_amount_usd: h.mortgage_amount_usd || h.mortgageAmountUsd || 0,
              duration_months: h.duration_months || h.durationMonths || 0,
              creditor_name: h.creditor_name || h.creditorName || 'Non spécifié',
              creditor_type: h.creditor_type || h.creditorType || 'Banque',
              contract_date: h.contract_date || h.contractDate || new Date().toISOString().split('T')[0],
              mortgage_status: (h.mortgage_status || h.mortgageStatus || 'active').toLowerCase()
              // reference_number est généré automatiquement par le trigger SQL
            });
            
            if (mortgageError) {
              console.error('Erreur lors de la création de l\'hypothèque:', mortgageError);
            }
          }
        }
      }

      // Le trigger auto_generate_ccc_code() va automatiquement :
      // 1. Générer un code CCC unique
      // 2. Calculer la valeur du code
      // 3. Créer une notification pour l'utilisateur

      const successMessage = isUpdateContribution 
        ? 'Contribution approuvée et données ajoutées à la parcelle existante ! Le code CCC a été généré.'
        : 'Contribution approuvée et parcelle créée ! Le code CCC a été généré.';
      toast.success(successMessage);
      await logContributionAudit({ contributionId, action: 'approve', payload: { isUpdateContribution } });
      await fetchContributions();
      setIsDetailsOpen(false);
      setValidationResult(null);
    } catch (error: any) {
      console.error('Erreur inattendue lors de l\'approbation:', error);
      const errorMessage = error?.message 
        ? `Erreur lors de l'approbation: ${error.message}` 
        : 'Erreur inattendue lors de l\'approbation';
      toast.error(errorMessage);
    }
  };

  const handleReject = async (contributionId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Veuillez fournir une raison de rejet');
      return;
    }

    try {
      const contribution = contributions.find(c => c.id === contributionId);
      if (!contribution) {
        toast.error('Contribution non trouvée');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.id) {
        toast.error('Vous devez être connecté pour rejeter une contribution');
        return;
      }

      console.log('Rejet de la contribution:', contributionId);

      const { error: updateError } = await supabase
        .from('cadastral_contributions')
        .update({ 
          status: 'rejected',
          rejection_reason: rejectionReason,
          rejected_by: user.id,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', contributionId);

      if (updateError) {
        console.error('Erreur lors de la mise à jour:', updateError);
        toast.error(`Erreur lors du rejet: ${updateError.message}`);
        return;
      }

      // Créer notification pour l'utilisateur
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: contribution.user_id,
        type: 'error',
        title: 'Contribution rejetée',
        message: `Votre contribution pour la parcelle ${contribution.parcel_number} a été rejetée. Motif: ${rejectionReason}. Vous pouvez faire appel de cette décision.`,
        action_url: '/user-dashboard?tab=contributions'
      });

      if (notifError) {
        console.error('Erreur lors de la création de la notification:', notifError);
        // Ne pas bloquer le rejet si la notification échoue
      }

      toast.success('Contribution rejetée');
      await logContributionAudit({ contributionId, action: 'reject', payload: { reason: rejectionReason } });
      await fetchContributions();
      setIsDetailsOpen(false);
      setRejectionReason('');
    } catch (error: any) {
      console.error('Erreur inattendue lors du rejet:', error);
      const errorMessage = error?.message 
        ? `Erreur lors du rejet: ${error.message}` 
        : 'Erreur inattendue lors du rejet';
      toast.error(errorMessage);
    }
  };

  // Utiliser StatusBadge partagé pour les statuts

  const calculateCompleteness = (contribution: Contribution) => calculateCCCCompleteness(contribution);

  // Renvoyer une contribution pour correction
  const handleReturn = async (contributionId: string) => {
    if (!returnReason.trim()) {
      toast.error('Veuillez fournir le motif du renvoi');
      return;
    }

    try {
      const contribution = contributions.find(c => c.id === contributionId);
      if (!contribution) {
        toast.error('Contribution non trouvée');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.id) {
        toast.error('Vous devez être connecté pour renvoyer une contribution');
        return;
      }

      console.log('Renvoi de la contribution:', contributionId);

      const { error: updateError } = await supabase
        .from('cadastral_contributions')
        .update({ 
          status: 'returned',
          rejection_reason: returnReason, // On réutilise ce champ pour stocker le motif de renvoi
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', contributionId);

      if (updateError) {
        console.error('Erreur lors du renvoi:', updateError);
        toast.error(`Erreur lors du renvoi: ${updateError.message}`);
        return;
      }

      // Créer notification pour l'utilisateur
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: contribution.user_id,
        type: 'warning',
        title: 'Contribution renvoyée pour correction',
        message: `Votre contribution pour la parcelle ${contribution.parcel_number} a été renvoyée pour correction. Motif: ${returnReason}. Veuillez modifier votre contribution et la soumettre à nouveau.`,
        action_url: '/user-dashboard?tab=contributions'
      });

      if (notifError) {
        console.error('Erreur lors de la création de la notification:', notifError);
      }

      toast.success('Contribution renvoyée pour correction');
      await logContributionAudit({ contributionId, action: 'return', payload: { reason: returnReason } });
      await fetchContributions();
      setIsDetailsOpen(false);
      setReturnReason('');
    } catch (error: any) {
      console.error('Erreur inattendue lors du renvoi:', error);
      const errorMessage = error?.message 
        ? `Erreur lors du renvoi: ${error.message}` 
        : 'Erreur inattendue lors du renvoi';
      toast.error(errorMessage);
    }
  };

  const runIntegrityTests = async () => {
    setShowTestDialog(true);
    setTestResults([{ test: 'Test en cours...', status: 'success', message: 'Exécution des tests...' }]);

    try {
      const { testCCCDataIntegrity } = await import('@/utils/testCCCDataIntegrity');
      const results = await testCCCDataIntegrity();
      setTestResults(results);
    } catch (error: any) {
      setTestResults([{
        test: 'Erreur',
        status: 'error',
        message: `Impossible d'exécuter les tests: ${error.message}`
      }]);
    }
  };

  const filteredContributions = useMemo(() => {
    const userQ = userFilter.trim().toLowerCase();
    return contributions.filter(c => {
      const matchesTab = (() => {
        if (activeTab === 'all') return true;
        if (activeTab === 'suspicious') return c.is_suspicious;
        return c.status === activeTab;
      })();

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query ||
        c.parcel_number?.toLowerCase().includes(query) ||
        c.province?.toLowerCase().includes(query) ||
        c.ville?.toLowerCase().includes(query) ||
        c.commune?.toLowerCase().includes(query) ||
        c.current_owner_name?.toLowerCase().includes(query) ||
        c.user_id?.toLowerCase().includes(query);

      const matchesUser = !userQ || c.user_id?.toLowerCase().includes(userQ);

      return matchesTab && matchesSearch && matchesUser;
    });
  }, [contributions, activeTab, searchQuery, userFilter]);

  // Bulk actions
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('cadastral_contributions')
        .update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
      await Promise.all(ids.map(id =>
        logContributionAudit({ contributionId: id, action: 'bulk_approve', payload: { count: ids.length } })
      ));
      toast.success(`${ids.length} contribution(s) approuvée(s)`);
      setSelectedIds(new Set());
      await fetchContributions();
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur lors de l\'approbation en masse');
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkReject = async () => {
    if (selectedIds.size === 0) return;
    const reason = window.prompt('Motif du rejet (obligatoire et appliqué à toutes les contributions sélectionnées) :');
    if (!reason || !reason.trim()) {
      toast.error('Motif obligatoire pour rejeter');
      return;
    }
    setBulkBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('cadastral_contributions')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          rejected_by: user?.id,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .in('id', ids);
      if (error) throw error;
      await Promise.all(ids.map(id =>
        logContributionAudit({ contributionId: id, action: 'bulk_reject', payload: { reason, count: ids.length } })
      ));
      toast.success(`${ids.length} contribution(s) rejetée(s)`);
      setSelectedIds(new Set());
      await fetchContributions();
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur lors du rejet en masse');
    } finally {
      setBulkBusy(false);
    }
  };


  // Pagination avec usePagination
  const {
    currentPage,
    pageSize,
    totalPages,
    paginatedData: paginatedContributions,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    changePageSize,
    hasNextPage,
    hasPreviousPage,
    totalItems
  } = usePagination(filteredContributions, { initialPageSize: 15 });

  // Reset to page 1 when filter changes
  useEffect(() => {
    goToPage(1);
  }, [activeTab]);

  const handleExportCSV = () => {
    exportToCSV({
      filename: `contributions_ccc_${new Date().toISOString().split('T')[0]}.csv`,
      headers: ['Numéro Parcelle', 'Statut', 'Suspect', 'Score Fraude', 'Province', 'Ville', 'Commune', 'Type Propriété', 'Date Création'],
      data: filteredContributions.map(c => [
        c.parcel_number,
        c.status,
        c.is_suspicious ? 'Oui' : 'Non',
        c.fraud_score?.toString() || '0',
        c.province || '',
        c.ville || '',
        c.commune || '',
        c.property_title_type || '',
        new Date(c.created_at).toLocaleDateString('fr-FR')
      ])
    });
    toast.success('Export CSV téléchargé');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {/* Stats */}
      <CCCStatsCards stats={stats} />

      {/* Alert */}
      {stats.pending > 0 && (
        <Alert className="py-2">
          <Gift className="h-3 w-3 md:h-4 md:w-4" />
          <AlertDescription className="text-xs md:text-sm">
            <strong>{stats.pending}</strong> contribution(s) en attente. 
            Un code CCC sera automatiquement généré pour chaque contribution approuvée.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Table */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Gift className="h-4 w-4 md:h-5 md:w-5" />
              <span className="truncate">Contributions CCC</span>
            </CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="flex-1 sm:flex-none">
                <Download className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                Exporter
              </Button>
              <Button variant="outline" size="sm" onClick={runIntegrityTests} className="flex-1 sm:flex-none">
                <Play className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                Tester
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 md:p-6">
          <CCCFilters
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            userFilter={userFilter}
            onUserFilterChange={setUserFilter}
          />

          <CCCBulkActions
            selectedCount={selectedIds.size}
            busy={bulkBusy}
            onApprove={bulkApprove}
            onReject={bulkReject}
            onClear={() => setSelectedIds(new Set())}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6 h-8 md:h-10">
              <TabsTrigger value="pending" className="text-xs md:text-sm px-1 md:px-3">Attente</TabsTrigger>
              <TabsTrigger value="returned" className="text-xs md:text-sm px-1 md:px-3">Renvoyés</TabsTrigger>
              <TabsTrigger value="approved" className="text-xs md:text-sm px-1 md:px-3">Approuvés</TabsTrigger>
              <TabsTrigger value="rejected" className="text-xs md:text-sm px-1 md:px-3">Rejetés</TabsTrigger>
              <TabsTrigger value="suspicious" className="text-xs md:text-sm px-1 md:px-3">Suspects</TabsTrigger>
              <TabsTrigger value="all" className="text-xs md:text-sm px-1 md:px-3">Tous</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-2">
              <CCCContributionsTable
                rows={paginatedContributions}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onView={(contribution) => {
                  setSelectedContribution(contribution);
                  setIsDetailsOpen(true);
                  setValidationResult(null);
                }}
                onUserFilterClick={setUserFilter}
                pagination={{
                  currentPage,
                  totalPages,
                  pageSize,
                  totalItems,
                  hasPreviousPage,
                  hasNextPage,
                  onPageChange: goToPage,
                  onPreviousPage: goToPreviousPage,
                  onNextPage: goToNextPage,
                  onPageSizeChange: changePageSize,
                }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <CCCDetailsDialog
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        contribution={selectedContribution}
        rejectionReason={rejectionReason}
        returnReason={returnReason}
        onRejectionReasonChange={setRejectionReason}
        onReturnReasonChange={setReturnReason}
        onApprove={handleApprove}
        onReject={handleReject}
        onReturn={handleReturn}
        onOpenAppeal={() => setShowAppealDialog(true)}
        onOpenPermit={() => setShowPermitDialog(true)}
        onOpenDocuments={() => setShowDocumentsDialog(true)}
      />

      {/* Test Results Dialog */}
      <CCCTestDialog
        open={showTestDialog}
        onOpenChange={setShowTestDialog}
        results={testResults}
      />

      {/* Dialogs pour les fonctionnalités avancées */}
      {selectedContribution && (
        <>
          {/* Dialog appel */}
          {selectedContribution.appeal_submitted && (
            <AppealManagementDialog
              open={showAppealDialog}
              onOpenChange={setShowAppealDialog}
              contributionId={selectedContribution.id}
              appealData={selectedContribution.appeal_data}
              appealStatus={selectedContribution.appeal_status || 'pending'}
              appealSubmissionDate={selectedContribution.appeal_submission_date || ''}
              parcelNumber={selectedContribution.parcel_number}
              rejectionReasons={selectedContribution.rejection_reasons}
              onAppealProcessed={fetchContributions}
            />
          )}

          {/* Dialog demande d'autorisation */}
          {selectedContribution.permit_request_data && (
            <PermitRequestDialog
              open={showPermitDialog}
              onOpenChange={setShowPermitDialog}
              contributionId={selectedContribution.id}
              permitRequestData={selectedContribution.permit_request_data}
              parcelNumber={selectedContribution.parcel_number}
              userId={selectedContribution.user_id}
              onProcessed={fetchContributions}
            />
          )}

          {/* Dialog documents */}
          <DocumentsGalleryDialog
            open={showDocumentsDialog}
            onOpenChange={setShowDocumentsDialog}
            parcelNumber={selectedContribution.parcel_number}
            ownerDocumentUrl={selectedContribution.owner_document_url}
            propertyTitleDocumentUrl={selectedContribution.property_title_document_url}
            buildingPermits={selectedContribution.building_permits}
            taxHistory={selectedContribution.tax_history}
            mortgageHistory={selectedContribution.mortgage_history}
            ownershipHistory={selectedContribution.ownership_history}
            boundaryHistory={selectedContribution.boundary_history}
          />
        </>
      )}
    </div>
  );
};

export default AdminCCCContributions;
