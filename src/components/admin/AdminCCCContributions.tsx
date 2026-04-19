import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResponsiveTable, ResponsiveTableBody, ResponsiveTableCell, ResponsiveTableHead, ResponsiveTableHeader, ResponsiveTableRow } from '@/components/ui/responsive-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, Eye, Gift, Users, Play, FileText, Building2, MessageSquare, Route, BrickWall, Download, ExternalLink, RotateCcw, Search, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { AppealManagementDialog } from './appeals/AppealManagementDialog';
import { PermitRequestDialog } from './permits/PermitRequestDialog';
import { DocumentsGalleryDialog } from './documents/DocumentsGalleryDialog';
import { StatusBadge, StatusType } from '@/components/shared/StatusBadge';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { exportToCSV } from '@/utils/csvExport';
import { logContributionAudit } from '@/utils/contributionAudit';
import CCCStatsCards from './ccc/CCCStatsCards';
import CCCBulkActions from './ccc/CCCBulkActions';
import { CCCFilters } from './ccc/CCCFilters';
import { CCCContributionsTable } from './ccc/CCCContributionsTable';
import { calculateCCCCompleteness } from './ccc/cccCompleteness';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  completeness_score: number;
}

interface Contribution {
  id: string;
  user_id: string;
  parcel_number: string;
  parcel_type: string | null;
  status: string;
  is_suspicious: boolean;
  fraud_score: number;
  fraud_reason: string | null;
  rejection_reason: string | null;
  rejection_reasons: any;
  created_at: string;
  reviewed_at: string | null;
  // Données complètes - TOUTES les données du formulaire
  property_title_type: string | null;
  lease_type: string | null;
  lease_years: number | null;
  is_title_in_current_owner_name: boolean | null;
  title_reference_number: string | null;
  title_issue_date: string | null;
  current_owner_name: string | null;
  current_owners_details: any;
  current_owner_legal_status: string | null;
  current_owner_since: string | null;
  area_sqm: number | null;
  parcel_sides: any;
  property_category: string | null;
  construction_type: string | null;
  construction_nature: string | null;
  construction_materials: string | null;
  construction_year: number | null;
  standing: string | null;
  declared_usage: string | null;
  apartment_number: string | null;
  floor_number: string | null;
  house_number: string | null;
  additional_constructions: any;
  province: string | null;
  ville: string | null;
  commune: string | null;
  quartier: string | null;
  avenue: string | null;
  territoire: string | null;
  collectivite: string | null;
  groupement: string | null;
  village: string | null;
  
  gps_coordinates: any;
  road_sides: any;
  servitude_data: any;
  building_shapes: any;
  has_dispute: boolean | null;
  dispute_data: any;
  ownership_history: any;
  boundary_history: any;
  tax_history: any;
  mortgage_history: any;
  building_permits: any;
  previous_permit_number: string | null;
  permit_request_data: any;
  whatsapp_number: string | null;
  owner_document_url: string | null;
  property_title_document_url: string | null;
  // Appels
  appeal_submitted: boolean | null;
  appeal_status: string | null;
  appeal_data: any;
  appeal_submission_date: string | null;
  // Changements
  contribution_type: string;
  original_parcel_id: string | null;
  changed_fields: any;
  change_justification: string | null;
}

interface ContributionStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  suspicious: number;
}

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
  const [testResults, setTestResults] = useState<any[]>([]);
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
          {/* Search + user filter */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-2 mb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par parcelle, province, ville, propriétaire..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Input
              placeholder="Filtrer par user_id (UUID partiel)"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="h-9 text-sm font-mono"
            />
          </div>

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
              <div className="overflow-x-auto">
                <ResponsiveTable>
                  <ResponsiveTableHeader>
                    <ResponsiveTableRow>
                      <ResponsiveTableHead priority="high"> </ResponsiveTableHead>
                      <ResponsiveTableHead priority="high">Parcelle</ResponsiveTableHead>
                      <ResponsiveTableHead priority="low">Contributeur</ResponsiveTableHead>
                      <ResponsiveTableHead priority="medium">Complétion</ResponsiveTableHead>
                      <ResponsiveTableHead priority="high">Statut</ResponsiveTableHead>
                      <ResponsiveTableHead priority="low">Score</ResponsiveTableHead>
                      <ResponsiveTableHead priority="medium">Date</ResponsiveTableHead>
                      <ResponsiveTableHead priority="high">Actions</ResponsiveTableHead>
                    </ResponsiveTableRow>
                  </ResponsiveTableHeader>
                  <ResponsiveTableBody>
                  {paginatedContributions.map((contribution) => {
                    const completeness = calculateCompleteness(contribution);
                    const canSelect = contribution.status === 'pending' || contribution.status === 'returned';
                    return (
                      <ResponsiveTableRow key={contribution.id}>
                        <ResponsiveTableCell priority="high" label="Sélection">
                          {canSelect ? (
                            <Checkbox
                              checked={selectedIds.has(contribution.id)}
                              onCheckedChange={() => toggleSelect(contribution.id)}
                              aria-label="Sélectionner"
                            />
                          ) : null}
                        </ResponsiveTableCell>
                        <ResponsiveTableCell priority="high" label="Parcelle" className="font-mono text-xs md:text-sm">
                          {contribution.parcel_number}
                        </ResponsiveTableCell>
                        <ResponsiveTableCell priority="low" label="Contributeur" className="text-xs md:text-sm">
                          <button
                            type="button"
                            className="font-mono text-primary hover:underline"
                            onClick={() => setUserFilter(contribution.user_id)}
                            title="Filtrer par cet utilisateur"
                          >
                            {contribution.user_id.substring(0, 8)}…
                          </button>
                        </ResponsiveTableCell>
                        <ResponsiveTableCell priority="medium" label="Complétion">
                          <div className="flex items-center gap-1 md:gap-2">
                            <div className="w-12 md:w-16 bg-secondary rounded-full h-1.5 md:h-2">
                              <div 
                                className="bg-primary h-1.5 md:h-2 rounded-full" 
                                style={{ width: `${completeness}%` }}
                              />
                            </div>
                            <span className="text-xs md:text-sm">{completeness}%</span>
                          </div>
                        </ResponsiveTableCell>
                        <ResponsiveTableCell priority="high" label="Statut">
                          <StatusBadge status={contribution.status as StatusType} />
                        </ResponsiveTableCell>
                        <ResponsiveTableCell priority="low" label="Score">
                          {contribution.is_suspicious ? (
                            <Badge variant="destructive" className="text-xs">{contribution.fraud_score}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </ResponsiveTableCell>
                        <ResponsiveTableCell priority="medium" label="Date" className="text-xs md:text-sm">
                          {new Date(contribution.created_at).toLocaleDateString('fr-FR', { 
                            day: '2-digit', 
                            month: '2-digit' 
                          })}
                        </ResponsiveTableCell>
                        <ResponsiveTableCell priority="high" label="Actions">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedContribution(contribution);
                              setIsDetailsOpen(true);
                              setValidationResult(null);
                            }}
                            className="h-7 w-7 md:h-8 md:w-8 p-0"
                          >
                            <Eye className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                        </ResponsiveTableCell>
                      </ResponsiveTableRow>
                    );
                  })}
                  </ResponsiveTableBody>
                </ResponsiveTable>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalItems={totalItems}
                    hasPreviousPage={hasPreviousPage}
                    hasNextPage={hasNextPage}
                    onPageChange={goToPage}
                    onPreviousPage={goToPreviousPage}
                    onNextPage={goToNextPage}
                    onPageSizeChange={changePageSize}
                  />
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-3 md:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base md:text-lg">Détails Contribution</DialogTitle>
          </DialogHeader>
          {selectedContribution && (
            <div className="space-y-2 md:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
                <div>
                  <Label className="text-xs md:text-sm">Numéro de parcelle</Label>
                  <p className="font-mono text-xs md:text-sm">{selectedContribution.parcel_number}</p>
                </div>
                <div>
                  <Label className="text-xs md:text-sm">Statut</Label>
                  <div className="mt-1"><StatusBadge status={selectedContribution.status as StatusType} /></div>
                </div>
              </div>

              {selectedContribution.is_suspicious && (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="h-3 w-3 md:h-4 md:w-4" />
                  <AlertDescription className="text-xs md:text-sm">
                    <strong>Suspecte (Score: {selectedContribution.fraud_score})</strong>
                    <br />
                    <span className="text-xs">{selectedContribution.fraud_reason}</span>
                  </AlertDescription>
                </Alert>
              )}

              {/* Actions rapides */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 md:gap-2">
                {/* Appel */}
                {selectedContribution.appeal_submitted && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAppealDialog(true)}
                    className="gap-1 md:gap-2 w-full h-8 md:h-9 text-xs md:text-sm px-2 md:px-4"
                  >
                    <MessageSquare className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="truncate">Appel</span>
                    {selectedContribution.appeal_status === 'pending' && (
                      <Badge variant="outline" className="ml-auto text-[10px] md:text-xs px-1 py-0">Attente</Badge>
                    )}
                  </Button>
                )}

                {/* Demande d'autorisation */}
                {selectedContribution.permit_request_data && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPermitDialog(true)}
                    className="gap-1 md:gap-2 w-full h-8 md:h-9 text-xs md:text-sm px-2 md:px-4"
                  >
                    <Building2 className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="truncate">Permis</span>
                    {selectedContribution.permit_request_data.status === 'pending' && (
                      <Badge variant="outline" className="ml-auto text-[10px] md:text-xs px-1 py-0">Attente</Badge>
                    )}
                  </Button>
                )}

                {/* Documents */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDocumentsDialog(true)}
                  className="gap-1 md:gap-2 w-full h-8 md:h-9 text-xs md:text-sm px-2 md:px-4"
                >
                  <FileText className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="truncate">Documents</span>
                </Button>
              </div>

              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-8 md:h-10">
                  <TabsTrigger value="general" className="text-xs md:text-sm px-1 md:px-3">Général</TabsTrigger>
                  <TabsTrigger value="location" className="text-xs md:text-sm px-1 md:px-3">Localisation</TabsTrigger>
                  <TabsTrigger value="permits" className="text-xs md:text-sm px-1 md:px-3">Permis</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs md:text-sm px-1 md:px-3">Historiques</TabsTrigger>
                  <TabsTrigger value="obligations" className="text-xs md:text-sm px-1 md:px-3">Obligations</TabsTrigger>
                  <TabsTrigger value="documents" className="text-xs md:text-sm px-1 md:px-3">Documents</TabsTrigger>
                </TabsList>

                {/* Onglet Général */}
                <TabsContent value="general" className="space-y-2 md:space-y-3 mt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Type de titre</Label>
                      <p className="text-sm">{selectedContribution.property_title_type || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Type de bail</Label>
                      <p className="text-sm">{selectedContribution.lease_type === 'initial' ? 'Bail initial' : selectedContribution.lease_type === 'renewal' ? 'Renouvellement' : 'Non renseigné'}{selectedContribution.lease_years ? ` (${selectedContribution.lease_years} ans)` : ''}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">N° de référence du titre</Label>
                      <p className="text-sm font-mono">{selectedContribution.title_reference_number || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Date de délivrance du titre</Label>
                      <p className="text-sm">{selectedContribution.title_issue_date ? new Date(selectedContribution.title_issue_date).toLocaleDateString('fr-FR') : 'Non renseigné'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Type de parcelle</Label>
                      <p className="text-sm">{selectedContribution.parcel_type === 'SU' ? 'Section Urbaine (SU)' : selectedContribution.parcel_type === 'SR' ? 'Section Rurale (SR)' : 'Non renseigné'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Titre au nom du propriétaire actuel</Label>
                      <p className="text-sm">{selectedContribution.is_title_in_current_owner_name === true ? 'Oui' : selectedContribution.is_title_in_current_owner_name === false ? 'Non' : 'Non renseigné'}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Propriétaire(s) actuel(s)</Label>
                    {selectedContribution.current_owners_details ? (
                      <div className="space-y-1 mt-1">
                        {Array.isArray(selectedContribution.current_owners_details) && 
                          selectedContribution.current_owners_details.map((owner: any, idx: number) => (
                          <div key={idx} className="p-1.5 md:p-2 bg-secondary rounded text-xs md:text-sm">
                            <p className="text-xs md:text-sm"><strong>Nom:</strong> {owner.lastName} {owner.middleName || ''} {owner.firstName}</p>
                            <p className="text-xs md:text-sm"><strong>Statut:</strong> {owner.legalStatus}</p>
                            <p className="text-xs md:text-sm"><strong>Depuis:</strong> {new Date(owner.since).toLocaleDateString('fr-FR')}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs md:text-sm">{selectedContribution.current_owner_name || 'Non renseigné'}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Catégorie de bien</Label>
                      <p className="text-sm">{selectedContribution.property_category || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Superficie</Label>
                      <p className="text-sm">{selectedContribution.area_sqm ? `${selectedContribution.area_sqm} m²` : 'Non renseigné'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Type de construction</Label>
                      <p className="text-sm">{selectedContribution.construction_type || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Nature</Label>
                      <p className="text-sm">{selectedContribution.construction_nature || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Matériaux</Label>
                      <p className="text-sm">{selectedContribution.construction_materials || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Usage déclaré</Label>
                      <p className="text-sm">{selectedContribution.declared_usage || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Standing</Label>
                      <p className="text-sm">{selectedContribution.standing || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Année de construction</Label>
                      <p className="text-sm">{selectedContribution.construction_year || 'Non renseigné'}</p>
                    </div>
                    {selectedContribution.apartment_number && (
                      <div>
                        <Label className="text-xs text-muted-foreground">N° appartement</Label>
                        <p className="text-sm">{selectedContribution.apartment_number}</p>
                      </div>
                    )}
                    {selectedContribution.floor_number && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Étage</Label>
                        <p className="text-sm">{selectedContribution.floor_number}</p>
                      </div>
                    )}
                    {selectedContribution.house_number && (
                      <div>
                        <Label className="text-xs text-muted-foreground">N° parcelle (voirie)</Label>
                        <p className="text-sm">{selectedContribution.house_number}</p>
                      </div>
                    )}
                  </div>

                  {selectedContribution.additional_constructions && Array.isArray(selectedContribution.additional_constructions) && selectedContribution.additional_constructions.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Constructions additionnelles ({selectedContribution.additional_constructions.length})</Label>
                      <div className="space-y-1 mt-1">
                        {selectedContribution.additional_constructions.map((c: any, idx: number) => (
                          <div key={idx} className="p-1.5 md:p-2 bg-secondary rounded text-xs md:text-sm">
                            <p><strong>{c.propertyCategory || c.constructionType}</strong> — {c.constructionNature || ''} / {c.declaredUsage || ''}</p>
                            {c.constructionMaterials && <p className="text-muted-foreground">Matériaux: {c.constructionMaterials}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedContribution.parcel_sides && Array.isArray(selectedContribution.parcel_sides) && selectedContribution.parcel_sides.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Dimensions des côtés</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 md:gap-2 mt-1">
                        {selectedContribution.parcel_sides.map((side: any, idx: number) => {
                          const isRoad = side.borderType === 'route';
                          const isWall = side.borderType === 'mur_mitoyen';
                          return (
                            <div key={idx} className={`p-1.5 md:p-2 rounded text-xs md:text-sm ${
                              isRoad ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' :
                              isWall ? 'bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800' :
                              'bg-secondary'
                            }`}>
                              <div className="flex items-center gap-1.5">
                                {isRoad && <Route className="h-3 w-3 text-green-600" />}
                                {isWall && <BrickWall className="h-3 w-3 text-amber-600" />}
                                <strong>{side.name}:</strong> {side.length} m
                              </div>
                              {isRoad && side.roadType && (
                                <p className="text-[10px] text-muted-foreground mt-0.5 ml-4">
                                  Route: {side.roadType} {side.roadName ? `- ${side.roadName}` : ''} {side.roadWidth ? `(${side.roadWidth}m)` : ''}
                                </p>
                              )}
                              {isWall && side.wallMaterial && (
                                <p className="text-[10px] text-muted-foreground mt-0.5 ml-4">
                                  Mur: {side.wallMaterial} {side.wallHeight ? `(H: ${side.wallHeight}m)` : ''}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Onglet Localisation */}
                <TabsContent value="location" className="space-y-2 md:space-y-3 mt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Province</Label>
                      <p className="text-sm">{selectedContribution.province || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Ville</Label>
                      <p className="text-sm">{selectedContribution.ville || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Commune</Label>
                      <p className="text-sm">{selectedContribution.commune || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Quartier</Label>
                      <p className="text-sm">{selectedContribution.quartier || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Avenue</Label>
                      <p className="text-sm">{selectedContribution.avenue || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Territoire</Label>
                      <p className="text-sm">{selectedContribution.territoire || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Collectivité</Label>
                      <p className="text-sm">{selectedContribution.collectivite || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Groupement</Label>
                      <p className="text-sm">{selectedContribution.groupement || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Village</Label>
                      <p className="text-sm">{selectedContribution.village || 'Non renseigné'}</p>
                    </div>
                  </div>

                  {selectedContribution.gps_coordinates && Array.isArray(selectedContribution.gps_coordinates) && selectedContribution.gps_coordinates.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Coordonnées GPS</Label>
                      <div className="space-y-1 mt-1">
                        {selectedContribution.gps_coordinates.map((coord: any, idx: number) => (
                          <div key={idx} className="p-1.5 md:p-2 bg-secondary rounded text-xs md:text-sm">
                            <p className="text-xs md:text-sm"><strong>Borne {coord.borne}:</strong> {coord.lat}, {coord.lng}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                   )}

                  {selectedContribution.road_sides && Array.isArray(selectedContribution.road_sides) && selectedContribution.road_sides.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Voirie des côtés</Label>
                      <div className="space-y-1 mt-1">
                        {selectedContribution.road_sides.map((side: any, idx: number) => (
                          <div key={idx} className="p-1.5 bg-secondary rounded text-xs md:text-sm">
                            <p><strong>{side.name}:</strong> {side.bordersRoad ? '🛣️ Borde une route' : '🚫 Pas de route'}{side.hasEntrance ? ' — 🚪 Entrée' : ''}</p>
                            {side.bordersRoad && <p className="text-muted-foreground ml-4">{side.roadType || ''} {side.roadName ? `- ${side.roadName}` : ''} {side.roadWidth ? `(${side.roadWidth}m)` : ''}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedContribution.servitude_data && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Servitude de passage</Label>
                      <p className="text-sm">{selectedContribution.servitude_data.hasServitude ? `Oui — Largeur: ${selectedContribution.servitude_data.width || '?'}m` : 'Non'}</p>
                    </div>
                  )}

                  {selectedContribution.building_shapes && Array.isArray(selectedContribution.building_shapes) && selectedContribution.building_shapes.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Constructions tracées ({selectedContribution.building_shapes.length})</Label>
                      <div className="space-y-1 mt-1">
                        {selectedContribution.building_shapes.map((shape: any, idx: number) => (
                          <div key={idx} className="p-1.5 bg-secondary rounded text-xs md:text-sm">
                            <p><strong>{shape.label || `Construction ${idx + 1}`}</strong> — {shape.areaSqm?.toFixed(1) || '?'} m² — H: {shape.heightM || '?'}m</p>
                            <p className="text-muted-foreground">{shape.sides?.length || '?'} côtés, périmètre: {shape.perimeterM?.toFixed(1) || '?'}m</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Onglet Permis */}
                <TabsContent value="permits" className="space-y-2 md:space-y-3 mt-2">
                  {selectedContribution.building_permits && Array.isArray(selectedContribution.building_permits) && selectedContribution.building_permits.length > 0 ? (
                    <div>
                      <Label className="text-xs text-muted-foreground">Autorisations de bâtir existantes</Label>
                      <div className="space-y-1 md:space-y-2 mt-1">
                        {selectedContribution.building_permits.map((permit: any, idx: number) => (
                          <div key={idx} className="p-2 md:p-3 bg-secondary rounded space-y-0.5 md:space-y-1 text-xs md:text-sm">
                            <p className="text-xs md:text-sm"><strong>Type:</strong> {permit.permitType === 'construction' ? 'Construction' : 'Régularisation'}</p>
                            <p className="text-xs md:text-sm"><strong>N° de permis:</strong> {permit.permitNumber}</p>
                            <p className="text-xs md:text-sm"><strong>Service émetteur:</strong> {permit.issuingService}</p>
                            <p className="text-xs md:text-sm"><strong>Date d'émission:</strong> {new Date(permit.issueDate).toLocaleDateString('fr-FR')}</p>
                            <p className="text-xs md:text-sm"><strong>Validité:</strong> {permit.validityMonths} mois</p>
                            <p className="text-xs md:text-sm"><strong>Statut:</strong> {permit.administrativeStatus}</p>
                            {permit.issuingServiceContact && <p className="text-xs md:text-sm"><strong>Contact:</strong> {permit.issuingServiceContact}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs md:text-sm text-muted-foreground">Aucun permis enregistré</p>
                  )}

                  {selectedContribution.previous_permit_number && (
                    <div>
                      <Label className="text-xs text-muted-foreground">N° permis précédent</Label>
                      <p className="text-sm font-mono">{selectedContribution.previous_permit_number}</p>
                    </div>
                  )}

                  {selectedContribution.permit_request_data && (
                    <div className="mt-2 md:mt-4">
                      <Label className="text-xs text-muted-foreground">Demande d'autorisation</Label>
                      <div className="p-2 md:p-3 bg-secondary rounded space-y-0.5 md:space-y-1 text-xs md:text-sm mt-1">
                        <p><strong>Type:</strong> {selectedContribution.permit_request_data.permitType === 'construction' ? 'Construction' : 'Régularisation'}</p>
                        <p><strong>Construction existante:</strong> {selectedContribution.permit_request_data.hasExistingConstruction ? 'Oui' : 'Non'}</p>
                        <p><strong>Description:</strong> {selectedContribution.permit_request_data.constructionDescription}</p>
                        <p><strong>Usage prévu:</strong> {selectedContribution.permit_request_data.plannedUsage}</p>
                        {selectedContribution.permit_request_data.estimatedArea && (
                          <p><strong>Surface estimée:</strong> {selectedContribution.permit_request_data.estimatedArea} m²</p>
                        )}
                        <p><strong>Demandeur:</strong> {selectedContribution.permit_request_data.applicantName}</p>
                        <p><strong>Téléphone:</strong> {selectedContribution.permit_request_data.applicantPhone}</p>
                        {selectedContribution.permit_request_data.applicantEmail && (
                          <p><strong>Email:</strong> {selectedContribution.permit_request_data.applicantEmail}</p>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Onglet Historiques */}
                <TabsContent value="history" className="space-y-2 md:space-y-3 mt-2">
                  {selectedContribution.ownership_history && Array.isArray(selectedContribution.ownership_history) && selectedContribution.ownership_history.length > 0 ? (
                    <div>
                      <Label className="text-xs text-muted-foreground">Historique de propriété</Label>
                      <div className="space-y-2 mt-1">
                        {selectedContribution.ownership_history.map((owner: any, idx: number) => {
                          const rr = (obj: any, ...keys: string[]) => { for (const k of keys) { if (obj?.[k] !== undefined && obj[k] !== null) return obj[k]; } return null; };
                          return (
                          <div key={idx} className="p-2 bg-secondary rounded text-sm">
                            <p><strong>Propriétaire:</strong> {rr(owner, 'owner_name', 'ownerName') || 'Non renseigné'}</p>
                            <p><strong>Statut:</strong> {rr(owner, 'legal_status', 'legalStatus') || 'Non renseigné'}</p>
                            <p><strong>Période:</strong> {new Date(rr(owner, 'ownership_start_date', 'startDate')).toLocaleDateString('fr-FR')} - {rr(owner, 'ownership_end_date', 'endDate') ? new Date(rr(owner, 'ownership_end_date', 'endDate')).toLocaleDateString('fr-FR') : 'Actuel'}</p>
                            {rr(owner, 'mutation_type', 'mutationType') && <p><strong>Type de mutation:</strong> {rr(owner, 'mutation_type', 'mutationType')}</p>}
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun historique de propriété</p>
                  )}

                  {selectedContribution.boundary_history && Array.isArray(selectedContribution.boundary_history) && selectedContribution.boundary_history.length > 0 && (
                    <div className="mt-4">
                      <Label className="text-xs text-muted-foreground">Historique de bornage</Label>
                      <div className="space-y-2 mt-1">
                        {selectedContribution.boundary_history.map((boundary: any, idx: number) => {
                          const rr = (obj: any, ...keys: string[]) => { for (const k of keys) { if (obj?.[k] !== undefined && obj[k] !== null) return obj[k]; } return null; };
                          return (
                          <div key={idx} className="p-2 bg-secondary rounded text-sm">
                            <p><strong>PV N°:</strong> {rr(boundary, 'pv_reference_number', 'pvReferenceNumber')}</p>
                            <p><strong>Objet:</strong> {rr(boundary, 'boundary_purpose', 'boundaryPurpose')}</p>
                            <p><strong>Géomètre:</strong> {rr(boundary, 'surveyor_name', 'surveyorName')}</p>
                            <p><strong>Date:</strong> {new Date(rr(boundary, 'survey_date', 'surveyDate') || '').toLocaleDateString('fr-FR')}</p>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Onglet Obligations */}
                <TabsContent value="obligations" className="space-y-2 md:space-y-3 mt-2">
                  {selectedContribution.tax_history && Array.isArray(selectedContribution.tax_history) && selectedContribution.tax_history.length > 0 ? (
                    <div>
                      <Label className="text-xs text-muted-foreground">Historique fiscal</Label>
                      <div className="space-y-1 md:space-y-2 mt-1">
                        {selectedContribution.tax_history.map((tax: any, idx: number) => (
                          <div key={idx} className="p-1.5 md:p-2 bg-secondary rounded text-xs md:text-sm">
                            <p><strong>Année:</strong> {tax.taxYear || tax.tax_year}</p>
                            <p><strong>Montant:</strong> ${tax.amountUsd || tax.amount_usd}</p>
                            <p><strong>Statut:</strong> {tax.paymentStatus || tax.payment_status}</p>
                            {(tax.paymentDate || tax.payment_date) && <p><strong>Date de paiement:</strong> {new Date(tax.paymentDate || tax.payment_date).toLocaleDateString('fr-FR')}</p>}
                            {(tax.taxType || tax.tax_type) && <p><strong>Type:</strong> {tax.taxType || tax.tax_type}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs md:text-sm text-muted-foreground">Aucun historique fiscal</p>
                  )}

                  {selectedContribution.mortgage_history && Array.isArray(selectedContribution.mortgage_history) && selectedContribution.mortgage_history.length > 0 && (
                    <div className="mt-2 md:mt-4">
                      <Label className="text-xs text-muted-foreground">Historique hypothécaire</Label>
                      <div className="space-y-1 md:space-y-2 mt-1">
                        {selectedContribution.mortgage_history.map((mortgage: any, idx: number) => {
                          const rr = (obj: any, ...keys: string[]) => { for (const k of keys) { if (obj?.[k] !== undefined && obj[k] !== null) return obj[k]; } return null; };
                          return (
                          <div key={idx} className="p-1.5 md:p-2 bg-secondary rounded text-xs md:text-sm">
                            <p><strong>Montant:</strong> ${rr(mortgage, 'mortgage_amount_usd', 'mortgageAmountUsd') || 0}</p>
                            <p><strong>Durée:</strong> {rr(mortgage, 'duration_months', 'durationMonths') || 0} mois</p>
                            <p><strong>Créancier:</strong> {rr(mortgage, 'creditor_name', 'creditorName') || 'Non renseigné'} ({rr(mortgage, 'creditor_type', 'creditorType') || ''})</p>
                            <p><strong>Date:</strong> {new Date(rr(mortgage, 'contract_date', 'contractDate') || '').toLocaleDateString('fr-FR')}</p>
                            <p><strong>Statut:</strong> {rr(mortgage, 'mortgage_status', 'mortgageStatus') || 'Non renseigné'}</p>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedContribution.has_dispute !== null && (
                    <div className="mt-2 md:mt-4">
                      <Label className="text-xs text-muted-foreground">Litige foncier</Label>
                      <p className="text-sm">{selectedContribution.has_dispute ? '⚠️ Oui — Litige déclaré' : '✅ Non'}</p>
                      {selectedContribution.has_dispute && selectedContribution.dispute_data && (
                        <div className="p-2 bg-secondary rounded text-xs md:text-sm mt-1">
                          {selectedContribution.dispute_data.disputeType && <p><strong>Type:</strong> {selectedContribution.dispute_data.disputeType}</p>}
                          {selectedContribution.dispute_data.disputeNature && <p><strong>Nature:</strong> {selectedContribution.dispute_data.disputeNature}</p>}
                          {selectedContribution.dispute_data.description && <p><strong>Description:</strong> {selectedContribution.dispute_data.description}</p>}
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* Onglet Documents */}
                <TabsContent value="documents" className="space-y-2 md:space-y-3 mt-2">
                  {selectedContribution.whatsapp_number && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Numéro WhatsApp</Label>
                      <p className="text-xs md:text-sm font-mono">{selectedContribution.whatsapp_number}</p>
                    </div>
                  )}
                  
                  {selectedContribution.owner_document_url && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Document d'identité</Label>
                      <a 
                        href={selectedContribution.owner_document_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs md:text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        Voir <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {selectedContribution.property_title_document_url && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Titre de propriété</Label>
                      <a 
                        href={selectedContribution.property_title_document_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs md:text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        Voir <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {!selectedContribution.owner_document_url && !selectedContribution.property_title_document_url && !selectedContribution.whatsapp_number && (
                    <p className="text-xs md:text-sm text-muted-foreground">Aucun document attaché</p>
                  )}
                </TabsContent>
              </Tabs>

              {selectedContribution.status === 'pending' && (
                <>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="return_reason" className="text-xs md:text-sm">Motif de renvoi pour correction (obligatoire si renvoi)</Label>
                      <Textarea
                        id="return_reason"
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        placeholder="Indiquez les corrections ou compléments nécessaires..."
                        rows={2}
                        className="text-xs md:text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rejection_reason" className="text-xs md:text-sm">Raison de rejet définitif (obligatoire si rejet)</Label>
                      <Textarea
                        id="rejection_reason"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Expliquez pourquoi cette contribution est définitivement rejetée..."
                        rows={2}
                        className="text-xs md:text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleReturn(selectedContribution.id)}
                      size="sm"
                      className="w-full sm:w-auto border-amber-500 text-amber-600 hover:bg-amber-50"
                    >
                      <RotateCcw className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                      Renvoyer
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(selectedContribution.id)}
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      <XCircle className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                      Rejeter
                    </Button>
                    <Button
                      onClick={() => handleApprove(selectedContribution.id)}
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      <CheckCircle className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                      Approuver
                    </Button>
                  </div>
                </>
              )}

              {selectedContribution.status === 'returned' && selectedContribution.rejection_reason && (
                <Alert className="py-2 border-amber-500 bg-amber-50">
                  <RotateCcw className="h-3 w-3 md:h-4 md:w-4 text-amber-600" />
                  <AlertDescription className="text-xs md:text-sm text-amber-800">
                    <strong>Motif du renvoi:</strong><br />
                    <span className="text-xs md:text-sm">{selectedContribution.rejection_reason}</span>
                  </AlertDescription>
                </Alert>
              )}

              {selectedContribution.status === 'rejected' && selectedContribution.rejection_reason && (
                <Alert variant="destructive" className="py-2">
                  <XCircle className="h-3 w-3 md:h-4 md:w-4" />
                  <AlertDescription className="text-xs md:text-sm">
                    <strong>Raison du rejet:</strong><br />
                    <span className="text-xs md:text-sm">{selectedContribution.rejection_reason}</span>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Test Results Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-3 md:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base md:text-lg">Tests d'Intégrité CCC</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 md:space-y-3">
            {testResults.map((result, idx) => (
              <div key={idx} className="p-2 md:p-3 rounded border">
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="mt-0.5">
                    {result.status === 'success' && <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500" />}
                    {result.status === 'warning' && <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-orange-500" />}
                    {result.status === 'error' && <XCircle className="h-4 w-4 md:h-5 md:w-5 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs md:text-sm">{result.test}</p>
                    <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">{result.message}</p>
                    {result.details && (
                      <pre className="text-[10px] md:text-xs bg-secondary p-1.5 md:p-2 rounded mt-1 md:mt-2 overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {testResults.length > 0 && (
              <div className="pt-2 md:pt-3 border-t">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-4 text-xs md:text-sm">
                  <div className="flex items-center gap-1 md:gap-2">
                    <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                    <span>{testResults.filter(r => r.status === 'success').length} succès</span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2">
                    <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-orange-500" />
                    <span>{testResults.filter(r => r.status === 'warning').length} avert.</span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2">
                    <XCircle className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                    <span>{testResults.filter(r => r.status === 'error').length} erreurs</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
