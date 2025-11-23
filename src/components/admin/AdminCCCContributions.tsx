import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResponsiveTable, ResponsiveTableBody, ResponsiveTableCell, ResponsiveTableHead, ResponsiveTableHeader, ResponsiveTableRow } from '@/components/ui/responsive-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, Eye, Gift, Users, ExternalLink, Play, FileText, Building2, MessageSquare } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppealManagementDialog } from './appeals/AppealManagementDialog';
import { PermitRequestDialog } from './permits/PermitRequestDialog';
import { DocumentsGalleryDialog } from './documents/DocumentsGalleryDialog';

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
  title_reference_number: string | null;
  current_owner_name: string | null;
  current_owners_details: any;
  current_owner_legal_status: string | null;
  current_owner_since: string | null;
  area_sqm: number | null;
  parcel_sides: any;
  construction_type: string | null;
  construction_nature: string | null;
  declared_usage: string | null;
  province: string | null;
  ville: string | null;
  commune: string | null;
  quartier: string | null;
  avenue: string | null;
  territoire: string | null;
  collectivite: string | null;
  groupement: string | null;
  village: string | null;
  circonscription_fonciere: string | null;
  gps_coordinates: any;
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
  const [activeTab, setActiveTab] = useState('pending');
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [showAppealDialog, setShowAppealDialog] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showPermitDialog, setShowPermitDialog] = useState(false);
  const [showDocumentsDialog, setShowDocumentsDialog] = useState(false);

  useEffect(() => {
    fetchContributions();
  }, []);

  const fetchContributions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cadastral_contributions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setContributions(data || []);
      
      // Calculer les statistiques
      const stats: ContributionStats = {
        total: data?.length || 0,
        pending: data?.filter(c => c.status === 'pending').length || 0,
        approved: data?.filter(c => c.status === 'approved').length || 0,
        rejected: data?.filter(c => c.status === 'rejected').length || 0,
        suspicious: data?.filter(c => c.is_suspicious).length || 0
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

      // 2. Créer la parcelle dans cadastral_parcels
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
          area_hectares: updatedContribution.area_sqm ? updatedContribution.area_sqm / 10000 : null,
          parcel_type: updatedContribution.parcel_type || 'Propriété privée',
          property_title_type: updatedContribution.property_title_type,
          title_reference_number: updatedContribution.title_reference_number,
          lease_type: updatedContribution.lease_type,
          construction_type: updatedContribution.construction_type,
          construction_nature: updatedContribution.construction_nature,
          declared_usage: updatedContribution.declared_usage,
          province: updatedContribution.province,
          ville: updatedContribution.ville,
          commune: updatedContribution.commune,
          quartier: updatedContribution.quartier,
          avenue: updatedContribution.avenue,
          territoire: updatedContribution.territoire,
          collectivite: updatedContribution.collectivite,
          groupement: updatedContribution.groupement,
          village: updatedContribution.village,
          circonscription_fonciere: updatedContribution.circonscription_fonciere,
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

      // 3. Créer les historiques associés si présents
      if (updatedContribution.ownership_history && Array.isArray(updatedContribution.ownership_history)) {
        for (const history of updatedContribution.ownership_history) {
          if (typeof history === 'object' && history !== null) {
            await supabase.from('cadastral_ownership_history').insert({
              parcel_id: createdParcel.id,
              owner_name: (history as any).owner_name,
              legal_status: (history as any).legal_status,
              ownership_start_date: (history as any).ownership_start_date,
              ownership_end_date: (history as any).ownership_end_date,
              mutation_type: (history as any).mutation_type,
              ownership_document_url: (history as any).ownership_document_url
            });
          }
        }
      }

      if (updatedContribution.boundary_history && Array.isArray(updatedContribution.boundary_history)) {
        for (const history of updatedContribution.boundary_history) {
          if (typeof history === 'object' && history !== null) {
            await supabase.from('cadastral_boundary_history').insert({
              parcel_id: createdParcel.id,
              pv_reference_number: (history as any).pv_reference_number,
              boundary_purpose: (history as any).boundary_purpose,
              surveyor_name: (history as any).surveyor_name,
              survey_date: (history as any).survey_date,
              boundary_document_url: (history as any).boundary_document_url
            });
          }
        }
      }

      if (updatedContribution.tax_history && Array.isArray(updatedContribution.tax_history)) {
        for (const history of updatedContribution.tax_history) {
          if (typeof history === 'object' && history !== null) {
            await supabase.from('cadastral_tax_history').insert({
              parcel_id: createdParcel.id,
              tax_year: (history as any).tax_year,
              amount_usd: (history as any).amount_usd,
              payment_status: (history as any).payment_status,
              payment_date: (history as any).payment_date,
              receipt_document_url: (history as any).receipt_document_url
            });
          }
        }
      }

      if (updatedContribution.mortgage_history && Array.isArray(updatedContribution.mortgage_history)) {
        for (const history of updatedContribution.mortgage_history) {
          if (typeof history === 'object' && history !== null) {
            await supabase.from('cadastral_mortgages').insert({
              parcel_id: createdParcel.id,
              mortgage_amount_usd: (history as any).mortgage_amount_usd,
              duration_months: (history as any).duration_months,
              creditor_name: (history as any).creditor_name,
              creditor_type: (history as any).creditor_type,
              contract_date: (history as any).contract_date,
              mortgage_status: (history as any).mortgage_status
            });
          }
        }
      }

      if (updatedContribution.building_permits && Array.isArray(updatedContribution.building_permits)) {
        for (const permit of updatedContribution.building_permits) {
          if (typeof permit === 'object' && permit !== null) {
            await supabase.from('cadastral_building_permits').insert({
              parcel_id: createdParcel.id,
              permit_number: (permit as any).permit_number,
              issuing_service: (permit as any).issuing_service,
              issue_date: (permit as any).issue_date,
              validity_period_months: (permit as any).validity_period_months,
              administrative_status: (permit as any).administrative_status,
              is_current: (permit as any).is_current,
              issuing_service_contact: (permit as any).issuing_service_contact,
              permit_document_url: (permit as any).permit_document_url
            });
          }
        }
      }

      // Le trigger auto_generate_ccc_code() va automatiquement :
      // 1. Générer un code CCC unique
      // 2. Calculer la valeur du code
      // 3. Créer une notification pour l'utilisateur

      toast.success('Contribution approuvée et parcelle créée ! Le code CCC a été généré.');
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'approved':
        return <Badge variant="default">Approuvé</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeté</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const calculateCompleteness = (contribution: Contribution) => {
    let filled = 0;
    let total = 8;

    if (contribution.property_title_type) filled++;
    if (contribution.current_owner_name) filled++;
    if (contribution.area_sqm) filled++;
    if (contribution.province) filled++;
    if (contribution.ownership_history) filled++;
    if (contribution.boundary_history) filled++;
    if (contribution.tax_history) filled++;
    if (contribution.mortgage_history) filled++;

    return Math.round((filled / total) * 100);
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

  const filteredContributions = contributions.filter(c => {
    if (activeTab === 'all') return true;
    if (activeTab === 'suspicious') return c.is_suspicious;
    return c.status === activeTab;
  });

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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{stats.total}</p>
              </div>
              <Users className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Attente</p>
                <p className="text-lg font-bold">{stats.pending}</p>
              </div>
              <Badge variant="secondary" className="text-xs">{stats.pending}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Approuvés</p>
                <p className="text-lg font-bold">{stats.approved}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Rejetés</p>
                <p className="text-lg font-bold">{stats.rejected}</p>
              </div>
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Suspects</p>
                <p className="text-lg font-bold">{stats.suspicious}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

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
            <Button variant="outline" size="sm" onClick={runIntegrityTests} className="w-full sm:w-auto">
              <Play className="h-3 w-3 md:h-4 md:w-4 mr-2" />
              Tester
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-2 md:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 h-8 md:h-10">
              <TabsTrigger value="pending" className="text-xs md:text-sm px-1 md:px-3">Attente</TabsTrigger>
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
                  {filteredContributions.map((contribution) => {
                    const completeness = calculateCompleteness(contribution);
                    return (
                      <ResponsiveTableRow key={contribution.id}>
                        <ResponsiveTableCell priority="high" label="Parcelle" className="font-mono text-xs md:text-sm">
                          {contribution.parcel_number}
                        </ResponsiveTableCell>
                        <ResponsiveTableCell priority="low" label="Contributeur" className="text-xs md:text-sm">
                          {contribution.user_id.substring(0, 8)}...
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
                          {getStatusBadge(contribution.status)}
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
                  <div className="mt-1">{getStatusBadge(selectedContribution.status)}</div>
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

                {/* Demande de permis */}
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
                      <p className="text-sm">{selectedContribution.lease_type || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">N° de référence</Label>
                      <p className="text-sm font-mono">{selectedContribution.title_reference_number || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Circonscription foncière</Label>
                      <p className="text-sm">{selectedContribution.circonscription_fonciere || 'Non renseigné'}</p>
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
                      <Label className="text-xs text-muted-foreground">Usage déclaré</Label>
                      <p className="text-sm">{selectedContribution.declared_usage || 'Non renseigné'}</p>
                    </div>
                  </div>

                  {selectedContribution.parcel_sides && Array.isArray(selectedContribution.parcel_sides) && selectedContribution.parcel_sides.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Dimensions des côtés</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 md:gap-2 mt-1">
                        {selectedContribution.parcel_sides.map((side: any, idx: number) => (
                          <div key={idx} className="p-1.5 md:p-2 bg-secondary rounded text-xs md:text-sm">
                            <p><strong>{side.name}:</strong> {side.length} m</p>
                          </div>
                        ))}
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
                </TabsContent>

                {/* Onglet Permis */}
                <TabsContent value="permits" className="space-y-2 md:space-y-3 mt-2">
                  {selectedContribution.building_permits && Array.isArray(selectedContribution.building_permits) && selectedContribution.building_permits.length > 0 ? (
                    <div>
                      <Label className="text-xs text-muted-foreground">Permis de construire existants</Label>
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
                      <Label className="text-xs text-muted-foreground">Demande de permis</Label>
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
                        {selectedContribution.ownership_history.map((owner: any, idx: number) => (
                          <div key={idx} className="p-2 bg-secondary rounded text-sm">
                            <p><strong>Propriétaire:</strong> {owner.ownerName}</p>
                            <p><strong>Statut:</strong> {owner.legalStatus}</p>
                            <p><strong>Période:</strong> {new Date(owner.startDate).toLocaleDateString('fr-FR')} - {owner.endDate ? new Date(owner.endDate).toLocaleDateString('fr-FR') : 'Actuel'}</p>
                            {owner.mutationType && <p><strong>Type de mutation:</strong> {owner.mutationType}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun historique de propriété</p>
                  )}

                  {selectedContribution.boundary_history && Array.isArray(selectedContribution.boundary_history) && selectedContribution.boundary_history.length > 0 && (
                    <div className="mt-4">
                      <Label className="text-xs text-muted-foreground">Historique de bornage</Label>
                      <div className="space-y-2 mt-1">
                        {selectedContribution.boundary_history.map((boundary: any, idx: number) => (
                          <div key={idx} className="p-2 bg-secondary rounded text-sm">
                            <p><strong>PV N°:</strong> {boundary.pvReferenceNumber}</p>
                            <p><strong>Objet:</strong> {boundary.boundaryPurpose}</p>
                            <p><strong>Géomètre:</strong> {boundary.surveyorName}</p>
                            <p><strong>Date:</strong> {new Date(boundary.surveyDate).toLocaleDateString('fr-FR')}</p>
                          </div>
                        ))}
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
                            <p><strong>Année:</strong> {tax.taxYear}</p>
                            <p><strong>Montant:</strong> ${tax.amountUsd}</p>
                            <p><strong>Statut:</strong> {tax.paymentStatus}</p>
                            {tax.paymentDate && <p><strong>Date de paiement:</strong> {new Date(tax.paymentDate).toLocaleDateString('fr-FR')}</p>}
                            {tax.taxType && <p><strong>Type:</strong> {tax.taxType}</p>}
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
                        {selectedContribution.mortgage_history.map((mortgage: any, idx: number) => (
                          <div key={idx} className="p-1.5 md:p-2 bg-secondary rounded text-xs md:text-sm">
                            <p><strong>Montant:</strong> ${mortgage.mortgageAmountUsd}</p>
                            <p><strong>Durée:</strong> {mortgage.durationMonths} mois</p>
                            <p><strong>Créancier:</strong> {mortgage.creditorName} ({mortgage.creditorType})</p>
                            <p><strong>Date:</strong> {new Date(mortgage.contractDate).toLocaleDateString('fr-FR')}</p>
                            <p><strong>Statut:</strong> {mortgage.mortgageStatus}</p>
                          </div>
                        ))}
                      </div>
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
                  <div>
                    <Label htmlFor="rejection_reason" className="text-xs md:text-sm">Raison de rejet (optionnel)</Label>
                    <Textarea
                      id="rejection_reason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Expliquez pourquoi cette contribution est rejetée..."
                      rows={2}
                      className="text-xs md:text-sm"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-2">
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

          {/* Dialog demande de permis */}
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
