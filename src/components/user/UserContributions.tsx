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
  is_suspicious: boolean;
  fraud_score: number;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  property_title_type: string | null;
  current_owner_name: string | null;
  area_sqm: number | null;
  province: string | null;
  ville: string | null;
}

export const UserContributions: React.FC = () => {
  const { user } = useAuth();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchContributions();
    }
  }, [user]);

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-xs md:text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl md:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-xs md:text-sm font-medium">En attente</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl md:text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-xs md:text-sm font-medium">Approuvées</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl md:text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-xs md:text-sm font-medium">Rejetées</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl md:text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Mes contributions CCC
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              <div className="md:hidden space-y-3">
                {contributions.map((contribution) => (
                  <Card key={contribution.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{contribution.parcel_number}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {[contribution.ville, contribution.province].filter(Boolean).join(', ') || 'Non spécifié'}
                          </p>
                        </div>
                        {getStatusBadge(contribution.status, contribution.is_suspicious)}
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-xs text-muted-foreground">
                          {new Date(contribution.created_at).toLocaleDateString('fr-FR')}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedContribution(contribution);
                            setIsDetailsOpen(true);
                          }}
                          className="h-8"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          <span className="text-xs">Détails</span>
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

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
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
              </div>

              {selectedContribution.rejection_reason && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-destructive mb-2">Raison du rejet :</p>
                  <p className="text-sm">{selectedContribution.rejection_reason}</p>
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
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date de soumission</label>
                  <p className="text-base">
                    {new Date(selectedContribution.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
