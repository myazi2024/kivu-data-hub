import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  FileText, CheckCircle, XCircle, Clock, AlertTriangle,
  ChevronLeft, ChevronRight, Search, Plus, Pencil, Trash2, RotateCcw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import CadastralContributionDialog from '@/components/cadastral/CadastralContributionDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUserContributions, type ContributionRowFull } from '@/hooks/useUserContributions';
import { detectFormType, mapContributionToFormDraft } from '@/utils/contributionFormMapping';
import { UserContributionDeleteDialog } from '@/components/user/contributions/UserContributionDeleteDialog';
import { trackEvent } from '@/lib/analytics';
import { CADASTRAL_MAP_ROUTE } from '@/utils/userDashboardLinks';

type Contribution = ContributionRowFull;

export const UserContributions: React.FC = () => {
  useAuth();
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [contributionToEdit, setContributionToEdit] = useState<Contribution | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormType, setEditFormType] = useState<'ccc' | 'tax' | 'mortgage' | 'permit'>('ccc');
  const [contributionToDelete, setContributionToDelete] = useState<Contribution | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const {
    rows: contributions,
    total,
    pageSize: itemsPerPage,
    loading,
    deleteContribution,
    deleting,
  } = useUserContributions(currentPage);

  const cccCode = selectedContribution
    ? contributions.find(c => c.id === selectedContribution.id)?.ccc_code ?? null
    : null;

  const getContributionTypeLabel = (c: Contribution) => {
    if (Array.isArray(c.mortgage_history) && c.mortgage_history.length > 0)
      return { label: 'Hypothèque', icon: '🏦', color: 'text-amber-600' };
    if (Array.isArray(c.building_permits) && c.building_permits.length > 0)
      return { label: 'Autorisation de bâtir', icon: '🏗️', color: 'text-blue-600' };
    if (c.permit_request_data)
      return { label: "Demande d'autorisation", icon: '📝', color: 'text-purple-600' };
    if (Array.isArray(c.tax_history) && c.tax_history.length > 0)
      return { label: 'Historique fiscal', icon: '📊', color: 'text-green-600' };
    if (Array.isArray(c.boundary_history) && c.boundary_history.length > 0)
      return { label: 'Bornage', icon: '📍', color: 'text-red-600' };
    if (c.contribution_type === 'dispute_report')
      return { label: 'Litige foncier', icon: '⚖️', color: 'text-orange-600' };
    if (c.contribution_type === 'update')
      return { label: 'Mise à jour', icon: '✏️', color: 'text-blue-600' };
    return { label: 'Nouvelle parcelle', icon: '🗺️', color: 'text-primary' };
  };

  const getStatusBadge = (status: string, isSuspicious: boolean) => {
    if (isSuspicious) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Suspect
        </Badge>
      );
    }
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Approuvée</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Rejetée</Badge>;
      case 'returned':
        return <Badge variant="outline" className="flex items-center gap-1 border-amber-500 text-amber-600"><RotateCcw className="h-3 w-3" />À corriger</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />En attente</Badge>;
    }
  };

  const stats = React.useMemo(() => {
    const returned = contributions.filter(c => c.status === 'returned').length;
    return {
      total,
      pending: contributions.filter(c => c.status === 'pending').length + returned,
      approved: contributions.filter(c => c.status === 'approved').length,
      rejected: contributions.filter(c => c.status === 'rejected').length,
      returned,
    };
  }, [contributions, total]);

  const handleEditContribution = (contribution: Contribution) => {
    const formType = detectFormType(contribution);
    setEditFormType(formType);

    if (formType === 'ccc') {
      const STORAGE_KEY = `cadastral_contribution_${contribution.parcel_number}`;
      try {
        const draft = mapContributionToFormDraft(contribution);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      } catch (error) {
        console.error('Error saving contribution for edit:', error);
        toast.error('Erreur lors de la préparation de la modification');
        return;
      }
    }

    trackEvent('user_contribution_edit_open', { id: contribution.id, formType });
    setContributionToEdit(contribution);
    setIsEditDialogOpen(true);
  };

  const handleDeleteContribution = async () => {
    if (!contributionToDelete) return;
    try {
      await deleteContribution(contributionToDelete.id);
      trackEvent('user_contribution_delete', { id: contributionToDelete.id });
      toast.success('Contribution supprimée avec succès');
      setIsDeleteDialogOpen(false);
      setContributionToDelete(null);
    } catch (error) {
      console.error('Error deleting contribution:', error);
      toast.error('Erreur lors de la suppression de la contribution');
    }
  };

  // Filter (client-side over current page only — server-paginated).
  const filteredContributions = React.useMemo(() => {
    if (!searchQuery.trim()) return contributions;
    const q = searchQuery.toLowerCase();
    return contributions.filter(c =>
      c.parcel_number.toLowerCase().includes(q) ||
      c.ville?.toLowerCase().includes(q) ||
      c.province?.toLowerCase().includes(q) ||
      c.current_owner_name?.toLowerCase().includes(q)
    );
  }, [contributions, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin motion-reduce:animate-none rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {stats.returned > 0 && (
        <Alert className="mb-4 border-amber-500 bg-amber-50 dark:bg-amber-950/30">
          <RotateCcw className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>{stats.returned} contribution(s) renvoyée(s)</strong> pour correction.
            Veuillez modifier et resoumettre vos contributions marquées "À corriger".
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground' },
          { label: 'Attente', value: stats.pending, color: 'text-amber-600' },
          { label: 'Validées', value: stats.approved, color: 'text-green-600' },
          { label: 'Rejetées', value: stats.rejected, color: 'text-destructive' },
        ].map((stat) => (
          <div key={stat.label} className="bg-background rounded-2xl p-3 shadow-sm border text-center">
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-background rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-3 border-b flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Mes contributions CCC</h3>
          </div>
          <Link to={CADASTRAL_MAP_ROUTE}>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs rounded-lg">
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline">Contribuer</span>
            </Button>
          </Link>
        </div>

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
              {filteredContributions.map((contribution) => {
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
                          {new Date(contribution.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </p>
                      </div>
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t mt-3">
                  <p className="text-xs text-muted-foreground">
                    Page {currentPage} / {totalPages} — {total} au total
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
                    <span className="text-xs px-2">{currentPage}/{totalPages}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
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

      <Dialog
        open={isDetailsOpen}
        onOpenChange={(open) => {
          setIsDetailsOpen(open);
          if (!open) setSelectedContribution(null);
        }}
      >
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
                  <p className="text-base">{new Date(selectedContribution.created_at).toLocaleString('fr-FR')}</p>
                </div>
              </div>

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

              {selectedContribution.status === 'rejected' && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <p className="text-sm font-medium text-destructive">Raisons du rejet</p>
                  </div>
                  {Array.isArray(selectedContribution.rejection_reasons) && selectedContribution.rejection_reasons.length > 0 ? (
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

              {selectedContribution.appeal_submitted && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Recours soumis</p>
                  </div>
                  <p className="text-sm">
                    Statut:{' '}
                    <Badge variant={selectedContribution.appeal_status === 'approved' ? 'default' : 'secondary'}>
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
                    <p className="text-base">{new Date(selectedContribution.reviewed_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <UserContributionDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        parcelNumber={contributionToDelete?.parcel_number}
        deleting={deleting}
        onConfirm={handleDeleteContribution}
      />

      {contributionToEdit && editFormType === 'ccc' && (
        <CadastralContributionDialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) setContributionToEdit(null);
          }}
          parcelNumber={contributionToEdit.parcel_number}
          editingContributionId={contributionToEdit.id}
        />
      )}

      {contributionToEdit && editFormType !== 'ccc' && (
        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) setContributionToEdit(null);
          }}
        >
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
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Fermer
                </Button>
                <Link to={CADASTRAL_MAP_ROUTE}>
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
