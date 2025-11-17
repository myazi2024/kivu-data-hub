import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Eye, FileText, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

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
}

export const UserContributions: React.FC = () => {
  const { user } = useAuth();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [cccCode, setCccCode] = useState<string | null>(null);

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
      case 'pending':
      default:
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          En attente
        </Badge>;
    }
  };

  const getStats = () => {
    return {
      total: contributions.length,
      pending: contributions.filter(c => c.status === 'pending').length,
      approved: contributions.filter(c => c.status === 'approved').length,
      rejected: contributions.filter(c => c.status === 'rejected').length,
    };
  };

  const stats = getStats();

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-3 md:mb-6">
        <Card>
          <CardHeader className="pb-1 md:pb-3 pt-2 md:pt-6">
            <CardTitle className="text-[10px] md:text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent className="pb-2 md:pb-3">
            <div className="text-lg md:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-1 md:pb-3 pt-2 md:pt-6">
            <CardTitle className="text-[10px] md:text-sm font-medium">En attente</CardTitle>
          </CardHeader>
          <CardContent className="pb-2 md:pb-3">
            <div className="text-lg md:text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-1 md:pb-3 pt-2 md:pt-6">
            <CardTitle className="text-[10px] md:text-sm font-medium">Approuvées</CardTitle>
          </CardHeader>
          <CardContent className="pb-2 md:pb-3">
            <div className="text-lg md:text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-1 md:pb-3 pt-2 md:pt-6">
            <CardTitle className="text-[10px] md:text-sm font-medium">Rejetées</CardTitle>
          </CardHeader>
          <CardContent className="pb-2 md:pb-3">
            <div className="text-lg md:text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <FileText className="h-4 w-4 md:h-5 md:w-5" />
            Mes contributions CCC
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          {contributions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Vous n'avez pas encore de contributions</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numéro parcelle</TableHead>
                      <TableHead>Localisation</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contributions.map((contribution) => (
                      <TableRow key={contribution.id}>
                        <TableCell className="font-medium">{contribution.parcel_number}</TableCell>
                        <TableCell>
                          {[contribution.ville, contribution.province].filter(Boolean).join(', ') || 'Non spécifié'}
                        </TableCell>
                        <TableCell>
                          {new Date(contribution.created_at).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(contribution.status, contribution.is_suspicious)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedContribution(contribution);
                              setIsDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-2">
                {contributions.map((contribution) => (
                  <Card key={contribution.id} className="p-2">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">{contribution.parcel_number}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {[contribution.ville, contribution.province].filter(Boolean).join(', ') || 'Non spécifié'}
                          </p>
                        </div>
                        {getStatusBadge(contribution.status, contribution.is_suspicious)}
                      </div>
                      
                      <div className="flex items-center justify-between pt-1 border-t">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(contribution.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedContribution(contribution);
                            setIsDetailsOpen(true);
                          }}
                          className="h-7"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
                  <p className="text-base">
                    {selectedContribution.contribution_type === 'new' ? 'Nouvelle parcelle' : 'Mise à jour'}
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
    </>
  );
};
