import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Eye, FileText, CheckCircle, XCircle, Clock, AlertTriangle, ChevronLeft, ChevronRight, Search, Plus, Pencil, Trash2, RotateCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import CadastralContributionDialog from '@/components/cadastral/CadastralContributionDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import TaxFormDialog from '@/components/cadastral/TaxFormDialog';
import MortgageFormDialog from '@/components/cadastral/MortgageFormDialog';
import BuildingPermitFormDialog from '@/components/cadastral/BuildingPermitFormDialog';

interface Contribution {
  id: string;
  parcel_number: string;
  status: string;
  contribution_type: string;
  is_suspicious: boolean;
  fraud_score: number;
  fraud_reason: string | null;
  rejection_reason: string | null;
  rejection_reasons: any;
  rejection_date: string | null;
  appeal_submitted: boolean | null;
  appeal_status: string | null;
  appeal_submission_date: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  property_title_type: string | null;
  current_owner_name: string | null;
  area_sqm: number | null;
  province: string | null;
  ville: string | null;
  changed_fields: any;
  mortgage_history: any;
  building_permits: any;
  tax_history: any;
  boundary_history: any;
  permit_request_data: any;
}

export const UserContributions: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [cccCode, setCccCode] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [contributionToEdit, setContributionToEdit] = useState<Contribution | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormType, setEditFormType] = useState<'ccc' | 'tax' | 'mortgage' | 'permit'>('ccc');
  const [contributionToDelete, setContributionToDelete] = useState<Contribution | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const itemsPerPage = 10;

  // Détecter le type de formulaire d'origine pour une contribution
  const detectOriginalFormType = (contribution: Contribution): 'ccc' | 'tax' | 'mortgage' | 'permit' => {
    // Vérifier les données spécifiques pour déterminer le formulaire d'origine
    if (contribution.tax_history && Array.isArray(contribution.tax_history) && contribution.tax_history.length > 0) {
      // Si c'est uniquement un historique fiscal sans autres données complètes, c'est le formulaire Tax
      const hasMortgage = contribution.mortgage_history && Array.isArray(contribution.mortgage_history) && contribution.mortgage_history.length > 0;
      const hasPermit = contribution.building_permits && Array.isArray(contribution.building_permits) && contribution.building_permits.length > 0;
      const hasOwnerDetails = contribution.current_owner_name && contribution.property_title_type;
      
      if (!hasMortgage && !hasPermit && !hasOwnerDetails) {
        return 'tax';
      }
    }
    
    if (contribution.mortgage_history && Array.isArray(contribution.mortgage_history) && contribution.mortgage_history.length > 0) {
      // Si c'est uniquement un historique hypothécaire
      const hasTax = contribution.tax_history && Array.isArray(contribution.tax_history) && contribution.tax_history.length > 0;
      const hasPermit = contribution.building_permits && Array.isArray(contribution.building_permits) && contribution.building_permits.length > 0;
      const hasOwnerDetails = contribution.current_owner_name && contribution.property_title_type;
      
      if (!hasTax && !hasPermit && !hasOwnerDetails) {
        return 'mortgage';
      }
    }
    
    if (contribution.building_permits && Array.isArray(contribution.building_permits) && contribution.building_permits.length > 0) {
      // Si c'est uniquement un permis de bâtir
      const hasTax = contribution.tax_history && Array.isArray(contribution.tax_history) && contribution.tax_history.length > 0;
      const hasMortgage = contribution.mortgage_history && Array.isArray(contribution.mortgage_history) && contribution.mortgage_history.length > 0;
      const hasOwnerDetails = contribution.current_owner_name && contribution.property_title_type;
      
      if (!hasTax && !hasMortgage && !hasOwnerDetails) {
        return 'permit';
      }
    }
    
    // Par défaut, utiliser le formulaire CCC complet
    return 'ccc';
  };

  useEffect(() => {
    if (user) {
      fetchContributions();
    }
  }, [user]);

  // Récupérer le code CCC quand le dialog s'ouvre
  useEffect(() => {
    if (isDetailsOpen && selectedContribution?.status === 'approved') {
      fetchCCCCode(selectedContribution.id);
    } else {
      setCccCode(null);
    }
  }, [isDetailsOpen, selectedContribution]);

  const fetchContributions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cadastral_contributions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContributions(data || []);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des contributions');
      console.error('Error fetching contributions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCCCCode = async (contributionId: string) => {
    try {
      const { data } = await supabase
        .from('cadastral_contributor_codes')
        .select('code')
        .eq('contribution_id', contributionId)
        .maybeSingle();
      
      if (data) {
        setCccCode(data.code);
      }
    } catch (error) {
      console.error('Error fetching CCC code:', error);
    }
  };

  // Détermine le type de contribution (hypothèque, permis, etc.)
  const getContributionTypeLabel = (contribution: Contribution) => {
    if (contribution.mortgage_history && Array.isArray(contribution.mortgage_history) && contribution.mortgage_history.length > 0) {
      return { label: 'Hypothèque', icon: '🏦', color: 'text-amber-600' };
    }
    if (contribution.building_permits && Array.isArray(contribution.building_permits) && contribution.building_permits.length > 0) {
      return { label: 'Autorisation de bâtir', icon: '🏗️', color: 'text-blue-600' };
    }
    if (contribution.permit_request_data) {
      return { label: "Demande d'autorisation", icon: '📝', color: 'text-purple-600' };
    }
    if (contribution.tax_history && Array.isArray(contribution.tax_history) && contribution.tax_history.length > 0) {
      return { label: 'Historique fiscal', icon: '📊', color: 'text-green-600' };
    }
    if (contribution.boundary_history && Array.isArray(contribution.boundary_history) && contribution.boundary_history.length > 0) {
      return { label: 'Bornage', icon: '📍', color: 'text-red-600' };
    }
    if (contribution.contribution_type === 'dispute_report') {
      return { label: 'Litige foncier', icon: '⚖️', color: 'text-orange-600' };
    }
    if (contribution.contribution_type === 'update') {
      return { label: 'Mise à jour', icon: '✏️', color: 'text-blue-600' };
    }
    return { label: 'Nouvelle parcelle', icon: '🗺️', color: 'text-primary' };
  };

  const getStatusBadge = (status: string, isSuspicious: boolean) => {
    if (isSuspicious) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Suspect
      </Badge>;
    }

    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-500 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Approuvée
        </Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Rejetée
        </Badge>;
      case 'returned':
        return <Badge variant="outline" className="flex items-center gap-1 border-amber-500 text-amber-600">
          <RotateCcw className="h-3 w-3" />
          À corriger
        </Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          En attente
        </Badge>;
    }
  };

  const getStats = () => {
    const returned = contributions.filter(c => c.status === 'returned').length;
    return {
      total: contributions.length,
      pending: contributions.filter(c => c.status === 'pending').length + returned,
      approved: contributions.filter(c => c.status === 'approved').length,
      rejected: contributions.filter(c => c.status === 'rejected').length,
      returned,
    };
  };

  // Handle edit contribution - detect form type and open appropriate dialog
  const handleEditContribution = (contribution: Contribution) => {
    // Détecter le type de formulaire approprié
    const formType = detectOriginalFormType(contribution);
    setEditFormType(formType);
    
    // Pour le formulaire CCC complet, stocker les données dans localStorage
    if (formType === 'ccc') {
      // ✅ FIX P0-1: Utiliser la même clé que le Dialog (cadastral_contribution_)
      const STORAGE_KEY = `cadastral_contribution_${contribution.parcel_number}`;
      
      // ✅ FIX P0-2: Aligner la structure du draft avec celle attendue par loadFormDataFromStorage()
      // Le Dialog attend formData avec les clés CadastralContributionData (camelCase)
      const formDataToSave = {
        formData: {
          parcelNumber: contribution.parcel_number,
          propertyTitleType: contribution.property_title_type || '',
          province: contribution.province || '',
          ville: (contribution as any).ville || '',
          commune: (contribution as any).commune || '',
          quartier: (contribution as any).quartier || '',
          avenue: (contribution as any).avenue || '',
          territoire: (contribution as any).territoire || '',
          collectivite: (contribution as any).collectivite || '',
          groupement: (contribution as any).groupement || '',
          village: (contribution as any).village || '',
          areaSqm: contribution.area_sqm || undefined, // ✅ FIX: 'areaSqm' au lieu de 'area'
          titleReferenceNumber: (contribution as any).title_reference_number || '',
          titleIssueDate: (contribution as any).title_issue_date || '',
          leaseType: (contribution as any).lease_type || '',
          declaredUsage: (contribution as any).declared_usage || '',
          constructionNature: (contribution as any).construction_nature || '',
          constructionType: (contribution as any).construction_type || '',
          constructionYear: (contribution as any).construction_year || undefined,
          whatsappNumber: (contribution as any).whatsapp_number || '',
          
          isTitleInCurrentOwnerName: (contribution as any).is_title_in_current_owner_name,
        },
        // ✅ FIX: Restaurer currentOwners avec la structure complète attendue par le Dialog
        currentOwners: ((contribution as any).current_owners_details && Array.isArray((contribution as any).current_owners_details) && (contribution as any).current_owners_details.length > 0) 
          ? (contribution as any).current_owners_details.map((owner: any) => ({
              lastName: owner.lastName || '',
              middleName: owner.middleName || '',
              firstName: owner.firstName || '',
              legalStatus: owner.legalStatus || 'Personne physique',
              gender: owner.gender || '',
              entityType: owner.entityType || '',
              entitySubType: owner.entitySubType || '',
              entitySubTypeOther: owner.entitySubTypeOther || '',
              stateExploitedBy: owner.stateExploitedBy || '',
              rightType: owner.rightType || '',
              since: owner.since || ''
            }))
          : [{
              lastName: contribution.current_owner_name?.split(' ')[0] || '',
              middleName: '',
              firstName: contribution.current_owner_name?.split(' ').slice(1).join(' ') || '',
              legalStatus: (contribution as any).current_owner_legal_status || 'Personne physique',
              gender: '',
              entityType: '',
              entitySubType: '',
              entitySubTypeOther: '',
              stateExploitedBy: '',
              rightType: '',
              since: (contribution as any).current_owner_since || ''
            }],
        // ✅ FIX: Mapper previousOwners depuis ownership_history (snake_case → camelCase)
        previousOwners: ((contribution as any).ownership_history && Array.isArray((contribution as any).ownership_history)) 
          ? (contribution as any).ownership_history.map((o: any) => ({
              name: o.owner_name || o.ownerName || '',
              legalStatus: o.legal_status || o.legalStatus || 'Personne physique',
              entityType: '',
              entitySubType: '',
              entitySubTypeOther: '',
              stateExploitedBy: '',
              startDate: o.ownership_start_date || o.startDate || '',
              endDate: o.ownership_end_date || o.endDate || '',
              mutationType: o.mutation_type || o.mutationType || 'Vente'
            }))
          : [],
        // ✅ FIX: Mapper taxRecords depuis tax_history (snake_case → camelCase)
        taxRecords: ((contribution as any).tax_history && Array.isArray((contribution as any).tax_history))
          ? (contribution as any).tax_history.map((t: any) => ({
              taxType: t.tax_type || t.taxType || 'Taxe foncière',
              taxYear: String(t.tax_year || t.taxYear || ''),
              taxAmount: String(t.amount_usd || t.amountUsd || ''),
              paymentStatus: t.payment_status || t.paymentStatus || 'Non payée',
              paymentDate: t.payment_date || t.paymentDate || '',
              receiptFile: null
            }))
          : [],
        // ✅ FIX: Mapper mortgageRecords depuis mortgage_history (snake_case → camelCase)
        mortgageRecords: ((contribution as any).mortgage_history && Array.isArray((contribution as any).mortgage_history))
          ? (contribution as any).mortgage_history.map((m: any) => ({
              mortgageAmount: String(m.mortgage_amount_usd || m.mortgageAmountUsd || ''),
              duration: String(m.duration_months || m.durationMonths || ''),
              creditorName: m.creditor_name || m.creditorName || '',
              creditorType: m.creditor_type || m.creditorType || 'Banque',
              contractDate: m.contract_date || m.contractDate || '',
              mortgageStatus: m.mortgage_status || m.mortgageStatus || 'Active',
              receiptFile: null
            }))
          : [],
        // ✅ FIX: Mapper buildingPermits depuis building_permits (snake_case → camelCase)
        buildingPermits: ((contribution as any).building_permits && Array.isArray((contribution as any).building_permits))
          ? (contribution as any).building_permits.map((p: any) => ({
              permitType: p.permit_type || p.permitType || 'construction',
              permitNumber: p.permit_number || p.permitNumber || '',
              issuingService: p.issuing_service || p.issuingService || '',
              issueDate: p.issue_date || p.issueDate || '',
              validityMonths: String(p.validity_period_months || p.validityMonths || '12'),
              administrativeStatus: p.administrative_status || p.administrativeStatus || 'En attente',
              issuingServiceContact: p.issuing_service_contact || p.issuingServiceContact || '',
              attachmentFile: null
            }))
          : [],
        gpsCoordinates: (contribution as any).gps_coordinates || [],
        parcelSides: (contribution as any).parcel_sides || [],
        // ✅ FIX: Déterminer le sectionType depuis parcel_type
        sectionType: (contribution as any).parcel_type === 'SR' ? 'rurale' : (contribution as any).parcel_type === 'SU' ? 'urbaine' : '',
        timestamp: new Date().toISOString(),
        editingContributionId: contribution.id
      };
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formDataToSave));
      } catch (error) {
        console.error('Error saving contribution for edit:', error);
        toast.error('Erreur lors de la préparation de la modification');
        return;
      }
    }
    
    setContributionToEdit(contribution);
    setIsEditDialogOpen(true);
  };

  // Handle delete contribution
  const handleDeleteContribution = async () => {
    if (!contributionToDelete) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('cadastral_contributions')
        .delete()
        .eq('id', contributionToDelete.id)
        .eq('user_id', user?.id)
        .in('status', ['pending', 'returned']); // Allow deleting pending and returned contributions
      
      if (error) throw error;
      
      toast.success('Contribution supprimée avec succès');
      setContributions(prev => prev.filter(c => c.id !== contributionToDelete.id));
      setIsDeleteDialogOpen(false);
      setContributionToDelete(null);
    } catch (error: any) {
      console.error('Error deleting contribution:', error);
      toast.error('Erreur lors de la suppression de la contribution');
    } finally {
      setDeleting(false);
    }
  };

  const stats = getStats();

  // Filter contributions based on search query
  const filteredContributions = React.useMemo(() => {
    if (!searchQuery.trim()) return contributions;
    const query = searchQuery.toLowerCase();
    return contributions.filter(c => 
      c.parcel_number.toLowerCase().includes(query) ||
      c.ville?.toLowerCase().includes(query) ||
      c.province?.toLowerCase().includes(query) ||
      c.current_owner_name?.toLowerCase().includes(query)
    );
  }, [contributions, searchQuery]);

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Alerte pour les contributions renvoyées */}
      {stats.returned > 0 && (
        <Alert className="mb-4 border-amber-500 bg-amber-50 dark:bg-amber-950/30">
          <RotateCcw className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>{stats.returned} contribution(s) renvoyée(s)</strong> pour correction. 
            Veuillez modifier et resoumettre vos contributions marquées "À corriger".
          </AlertDescription>
        </Alert>
      )}

      {/* Stats compactes */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Attente", value: stats.pending, color: "text-amber-600" },
          { label: "Validées", value: stats.approved, color: "text-green-600" },
          { label: "Rejetées", value: stats.rejected, color: "text-destructive" },
        ].map((stat) => (
          <div key={stat.label} className="bg-background rounded-2xl p-3 shadow-sm border text-center">
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Liste des contributions */}
      <div className="bg-background rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-3 border-b flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Mes contributions CCC</h3>
          </div>
          <Link to="/carte-cadastrale">
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs rounded-lg">
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline">Contribuer</span>
            </Button>
          </Link>
        </div>
        
        {/* Search bar */}
        {contributions.length > 0 && (
          <div className="px-3 pt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher par parcelle, ville, propriétaire..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs rounded-xl"
              />
            </div>
          </div>
        )}
        
        <div className="p-3">
          {filteredContributions.length === 0 ? (
            <div className="text-center py-8">
              <div className="h-12 w-12 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Aucun résultat' : 'Aucune contribution'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContributions
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((contribution) => {
                  const typeInfo = getContributionTypeLabel(contribution);
                  return (
                    <div 
                      key={contribution.id} 
                      className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      <div 
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => {
                          setSelectedContribution(contribution);
                          setIsDetailsOpen(true);
                        }}
                      >
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-lg">{typeInfo.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{contribution.parcel_number}</p>
                            <span className={`text-[10px] ${typeInfo.color} font-medium`}>{typeInfo.label}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {[contribution.ville, contribution.province].filter(Boolean).join(', ') || 'Non spécifié'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          {getStatusBadge(contribution.status, contribution.is_suspicious)}
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            {new Date(contribution.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                          </p>
                        </div>
                        {/* Edit & Delete buttons for pending and returned contributions */}
                        {(contribution.status === 'pending' || contribution.status === 'returned') && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 w-7 p-0 ${contribution.status === 'returned' ? 'text-amber-600 hover:text-amber-700' : 'text-muted-foreground hover:text-primary'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditContribution(contribution);
                              }}
                              title={contribution.status === 'returned' ? 'Corriger' : 'Modifier'}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setContributionToDelete(contribution);
                                setIsDeleteDialogOpen(true);
                              }}
                              title="Supprimer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              
              {/* Pagination */}
              {filteredContributions.length > itemsPerPage && (
                <div className="flex items-center justify-between pt-3 border-t mt-3">
                  <p className="text-xs text-muted-foreground">
                    {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredContributions.length)} sur {filteredContributions.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs px-2">{currentPage}/{Math.ceil(filteredContributions.length / itemsPerPage)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredContributions.length / itemsPerPage), p + 1))}
                      disabled={currentPage >= Math.ceil(filteredContributions.length / itemsPerPage)}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={(open) => {
        setIsDetailsOpen(open);
        if (!open) {
          setCccCode(null);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de la contribution</DialogTitle>
          </DialogHeader>
          {selectedContribution && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Numéro de parcelle</label>
                  <p className="text-base font-medium">{selectedContribution.parcel_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Statut</label>
                  <div className="mt-1">
                    {getStatusBadge(selectedContribution.status, selectedContribution.is_suspicious)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type de contribution</label>
                  <p className="text-base flex items-center gap-2">
                    <span>{getContributionTypeLabel(selectedContribution).icon}</span>
                    <span>{getContributionTypeLabel(selectedContribution).label}</span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date de soumission</label>
                  <p className="text-base">
                    {new Date(selectedContribution.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>

              {/* Fraud warning */}
              {selectedContribution.is_suspicious && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <p className="text-sm font-medium text-destructive">Contribution suspecte</p>
                  </div>
                  <p className="text-sm">Score de fraude: {selectedContribution.fraud_score}/100</p>
                  {selectedContribution.fraud_reason && (
                    <p className="text-sm mt-2">{selectedContribution.fraud_reason}</p>
                  )}
                </div>
              )}

              {/* Rejection reasons */}
              {selectedContribution.status === 'rejected' && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <p className="text-sm font-medium text-destructive">Raisons du rejet</p>
                  </div>
                  {selectedContribution.rejection_reasons && Array.isArray(selectedContribution.rejection_reasons) && selectedContribution.rejection_reasons.length > 0 ? (
                    <ul className="text-sm space-y-1">
                      {selectedContribution.rejection_reasons.map((reason: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-destructive">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  ) : selectedContribution.rejection_reason ? (
                    <p className="text-sm">{selectedContribution.rejection_reason}</p>
                  ) : (
                    <p className="text-sm">Aucune raison spécifiée</p>
                  )}
                  {selectedContribution.rejection_date && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Rejetée le {new Date(selectedContribution.rejection_date).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              )}

              {/* Appeal status */}
              {selectedContribution.appeal_submitted && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Recours soumis</p>
                  </div>
                  <p className="text-sm">
                    Statut: <Badge variant={selectedContribution.appeal_status === 'approved' ? 'default' : 'secondary'}>
                      {selectedContribution.appeal_status === 'approved' ? 'Approuvé' :
                       selectedContribution.appeal_status === 'rejected' ? 'Rejeté' : 'En attente'}
                    </Badge>
                  </p>
                  {selectedContribution.appeal_submission_date && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Soumis le {new Date(selectedContribution.appeal_submission_date).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              )}

              {/* CCC Code for approved contributions */}
              {selectedContribution.status === 'approved' && cccCode && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Code CCC généré</p>
                  </div>
                  <p className="text-sm font-mono font-bold">{cccCode}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Consultez l'onglet "Codes" pour plus de détails
                  </p>
                </div>
              )}

              {/* Mortgage details for update contributions */}
              {selectedContribution.mortgage_history && Array.isArray(selectedContribution.mortgage_history) && selectedContribution.mortgage_history.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
                    🏦 Détails de l'hypothèque
                  </p>
                  {selectedContribution.mortgage_history.map((mortgage: any, idx: number) => (
                    <div key={idx} className="text-sm space-y-1">
                      <p><strong>Montant:</strong> {mortgage.mortgage_amount_usd?.toLocaleString() || mortgage.mortgageAmountUsd?.toLocaleString() || 'N/A'} USD</p>
                      <p><strong>Créancier:</strong> {mortgage.creditor_name || mortgage.creditorName || 'N/A'}</p>
                      <p><strong>Type:</strong> {mortgage.creditor_type || mortgage.creditorType || 'N/A'}</p>
                      <p><strong>Durée:</strong> {mortgage.duration_months || mortgage.duration || 'N/A'} mois</p>
                      <p><strong>Date contrat:</strong> {mortgage.contract_date || mortgage.contractDate || 'N/A'}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Permit request details */}
              {selectedContribution.permit_request_data && (
                <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-2">
                    📝 Détails de la demande d'autorisation
                  </p>
                  <div className="text-sm space-y-1">
                    <p><strong>Type:</strong> {selectedContribution.permit_request_data.permit_type || selectedContribution.permit_request_data.permitType || 'Autorisation de bâtir'}</p>
                    <p><strong>Surface:</strong> {selectedContribution.permit_request_data.construction_area || selectedContribution.permit_request_data.constructionArea || 'N/A'} m²</p>
                    {selectedContribution.permit_request_data.construction_type && (
                      <p><strong>Type construction:</strong> {selectedContribution.permit_request_data.construction_type}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Building permits details */}
              {selectedContribution.building_permits && Array.isArray(selectedContribution.building_permits) && selectedContribution.building_permits.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
                    🏗️ Détails de l'autorisation de bâtir
                  </p>
                  {selectedContribution.building_permits.map((permit: any, idx: number) => (
                    <div key={idx} className="text-sm space-y-1">
                      <p><strong>N° Permis:</strong> {permit.permit_number || permit.permitNumber || 'N/A'}</p>
                      <p><strong>Date émission:</strong> {permit.issue_date || permit.issueDate || 'N/A'}</p>
                      <p><strong>Service émetteur:</strong> {permit.issuing_service || permit.issuingService || 'N/A'}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Changed fields for updates */}
              {selectedContribution.contribution_type === 'update' && selectedContribution.changed_fields && 
               Array.isArray(selectedContribution.changed_fields) && selectedContribution.changed_fields.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">Champs modifiés:</p>
                  <ul className="text-sm space-y-1">
                    {selectedContribution.changed_fields.map((field: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400">•</span>
                        <span>{field}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type de titre</label>
                  <p className="text-base">{selectedContribution.property_title_type || 'Non spécifié'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Propriétaire actuel</label>
                  <p className="text-base">{selectedContribution.current_owner_name || 'Non spécifié'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Surface (m²)</label>
                  <p className="text-base">{selectedContribution.area_sqm ? `${selectedContribution.area_sqm} m²` : 'Non spécifié'}</p>
                </div>
                {selectedContribution.reviewed_at && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Révisée le</label>
                    <p className="text-base">
                      {new Date(selectedContribution.reviewed_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[340px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Supprimer cette contribution ?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Vous êtes sur le point de supprimer la contribution pour la parcelle{' '}
              <span className="font-medium text-foreground">{contributionToDelete?.parcel_number}</span>.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-9 text-sm rounded-xl" disabled={deleting}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteContribution}
              className="h-9 text-sm rounded-xl bg-destructive hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Contribution Dialog - Open appropriate form based on type */}
      {contributionToEdit && editFormType === 'ccc' && (
        <CadastralContributionDialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setContributionToEdit(null);
              fetchContributions();
            }
          }}
          parcelNumber={contributionToEdit.parcel_number}
          editingContributionId={contributionToEdit.id}
        />
      )}

      {/* Note: Tax, Mortgage, and Permit forms require parcelId which we don't have here */}
      {/* For these specialized forms, redirect user to the cadastral map to edit */}
      {contributionToEdit && editFormType !== 'ccc' && (
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setContributionToEdit(null);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Modifier cette contribution</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Cette contribution a été soumise via un formulaire spécialisé 
                ({editFormType === 'tax' ? 'Historique fiscal' : 
                  editFormType === 'mortgage' ? 'Hypothèque' : 'Autorisation de bâtir'}).
              </p>
              <p className="text-sm text-muted-foreground">
                Pour la modifier, veuillez vous rendre sur la carte cadastrale, 
                rechercher la parcelle <strong>{contributionToEdit.parcel_number}</strong>, 
                et utiliser le menu d'actions correspondant.
              </p>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Fermer
                </Button>
                <Link to="/carte-cadastrale">
                  <Button onClick={() => setIsEditDialogOpen(false)}>
                    Aller à la carte
                  </Button>
                </Link>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
