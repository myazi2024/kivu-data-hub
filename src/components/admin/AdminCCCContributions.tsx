import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, Eye, Gift, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Contribution {
  id: string;
  user_id: string;
  parcel_number: string;
  status: string;
  is_suspicious: boolean;
  fraud_score: number;
  fraud_reason: string | null;
  rejection_reason: string | null;
  created_at: string;
  // Données complètes
  property_title_type: string | null;
  current_owner_name: string | null;
  area_sqm: number | null;
  province: string | null;
  ownership_history: any;
  boundary_history: any;
  tax_history: any;
  mortgage_history: any;
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

  const handleApprove = async (contributionId: string) => {
    try {
      const { error } = await supabase
        .from('cadastral_contributions')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', contributionId);

      if (error) throw error;

      toast.success('Contribution approuvée ! Le code CCC sera généré automatiquement.');
      fetchContributions();
      setIsDetailsOpen(false);
    } catch (error: any) {
      console.error('Erreur lors de l\'approbation:', error);
      toast.error('Erreur lors de l\'approbation');
    }
  };

  const handleReject = async (contributionId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Veuillez fournir une raison de rejet');
      return;
    }

    try {
      const { error } = await supabase
        .from('cadastral_contributions')
        .update({ 
          status: 'rejected',
          rejection_reason: rejectionReason,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', contributionId);

      if (error) throw error;

      toast.success('Contribution rejetée');
      fetchContributions();
      setIsDetailsOpen(false);
      setRejectionReason('');
    } catch (error: any) {
      console.error('Erreur lors du rejet:', error);
      toast.error('Erreur lors du rejet');
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
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Badge variant="secondary">{stats.pending}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approuvés</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rejetés</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Suspects</p>
                <p className="text-2xl font-bold">{stats.suspicious}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert */}
      {stats.pending > 0 && (
        <Alert>
          <Gift className="h-4 w-4" />
          <AlertDescription>
            {stats.pending} contribution(s) en attente de validation. 
            Un code CCC sera automatiquement généré pour chaque contribution approuvée.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Gestion des Contributions CCC
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="pending">En attente</TabsTrigger>
              <TabsTrigger value="approved">Approuvés</TabsTrigger>
              <TabsTrigger value="rejected">Rejetés</TabsTrigger>
              <TabsTrigger value="suspicious">Suspects</TabsTrigger>
              <TabsTrigger value="all">Tous</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcelle</TableHead>
                    <TableHead>Contributeur</TableHead>
                    <TableHead>Complétion</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Score Fraude</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContributions.map((contribution) => {
                    const completeness = calculateCompleteness(contribution);
                    return (
                      <TableRow key={contribution.id}>
                        <TableCell className="font-mono">{contribution.parcel_number}</TableCell>
                        <TableCell className="text-sm">{contribution.user_id.substring(0, 8)}...</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-secondary rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ width: `${completeness}%` }}
                              />
                            </div>
                            <span className="text-sm">{completeness}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(contribution.status)}</TableCell>
                        <TableCell>
                          {contribution.is_suspicious ? (
                            <Badge variant="destructive">{contribution.fraud_score}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(contribution.created_at).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
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
                    );
                  })}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de la Contribution</DialogTitle>
          </DialogHeader>
          {selectedContribution && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Numéro de parcelle</Label>
                  <p className="font-mono">{selectedContribution.parcel_number}</p>
                </div>
                <div>
                  <Label>Statut</Label>
                  <div className="mt-1">{getStatusBadge(selectedContribution.status)}</div>
                </div>
              </div>

              {selectedContribution.is_suspicious && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Contribution suspecte (Score: {selectedContribution.fraud_score})</strong>
                    <br />
                    {selectedContribution.fraud_reason}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Informations fournies</Label>
                <div className="text-sm space-y-1 p-3 bg-secondary rounded">
                  <p><strong>Type de titre:</strong> {selectedContribution.property_title_type || 'Non renseigné'}</p>
                  <p><strong>Propriétaire:</strong> {selectedContribution.current_owner_name || 'Non renseigné'}</p>
                  <p><strong>Superficie:</strong> {selectedContribution.area_sqm ? `${selectedContribution.area_sqm} m²` : 'Non renseigné'}</p>
                  <p><strong>Province:</strong> {selectedContribution.province || 'Non renseigné'}</p>
                  <p><strong>Historique propriété:</strong> {selectedContribution.ownership_history ? 'Oui' : 'Non'}</p>
                  <p><strong>Historique bornage:</strong> {selectedContribution.boundary_history ? 'Oui' : 'Non'}</p>
                  <p><strong>Historique taxes:</strong> {selectedContribution.tax_history ? 'Oui' : 'Non'}</p>
                  <p><strong>Historique hypothèques:</strong> {selectedContribution.mortgage_history ? 'Oui' : 'Non'}</p>
                </div>
              </div>

              {selectedContribution.status === 'pending' && (
                <>
                  <div>
                    <Label htmlFor="rejection_reason">Raison de rejet (optionnel)</Label>
                    <Textarea
                      id="rejection_reason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Expliquez pourquoi cette contribution est rejetée..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(selectedContribution.id)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeter
                    </Button>
                    <Button
                      onClick={() => handleApprove(selectedContribution.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approuver
                    </Button>
                  </div>
                </>
              )}

              {selectedContribution.status === 'rejected' && selectedContribution.rejection_reason && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Raison du rejet:</strong><br />
                    {selectedContribution.rejection_reason}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCCCContributions;
