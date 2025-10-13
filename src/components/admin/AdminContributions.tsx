import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, AlertTriangle, Eye, Search } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Contribution {
  id: string;
  parcel_number: string;
  user_id: string;
  current_owner_name?: string;
  property_title_type?: string;
  status: 'pending' | 'approved' | 'rejected';
  is_suspicious: boolean;
  fraud_score: number;
  rejection_reason?: string;
  created_at: string;
  profiles?: {
    full_name?: string;
    email: string;
  };
}

interface AdminContributionsProps {
  onRefresh?: () => void;
}

const AdminContributions: React.FC<AdminContributionsProps> = ({ onRefresh }) => {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const { toast } = useToast();

  const fetchContributions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cadastral_contributions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Récupérer les profils des utilisateurs
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(contrib => contrib.user_id).filter(Boolean))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        const contributionsWithProfiles = data.map(contrib => ({
          ...contrib,
          profiles: profilesMap.get(contrib.user_id)
        }));
        setContributions(contributionsWithProfiles as any);
      } else {
        setContributions([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des contributions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les contributions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContributions();
  }, []);

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

      toast({
        title: "Succès",
        description: "Contribution approuvée. Un code CCC sera généré automatiquement.",
      });

      fetchContributions();
      onRefresh?.();
    } catch (error) {
      console.error('Erreur lors de l\'approbation:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'approuver la contribution",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (contributionId: string) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez fournir une raison de rejet",
        variant: "destructive",
      });
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

      toast({
        title: "Succès",
        description: "Contribution rejetée",
      });

      setIsDialogOpen(false);
      setRejectionReason('');
      fetchContributions();
      onRefresh?.();
    } catch (error) {
      console.error('Erreur lors du rejet:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rejeter la contribution",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string, isSuspicious: boolean) => {
    if (isSuspicious) {
      return <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Suspect
      </Badge>;
    }

    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-600">Approuvé</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeté</Badge>;
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredContributions = contributions.filter(contrib => {
    if (filterStatus !== 'all' && contrib.status !== filterStatus) return false;
    if (searchQuery && !contrib.parcel_number.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Contributions Cadastrales</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="N° parcelle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[200px]"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="approved">Approuvés</SelectItem>
                  <SelectItem value="rejected">Rejetés</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Parcelle</TableHead>
                <TableHead>Contributeur</TableHead>
                <TableHead>Propriétaire</TableHead>
                <TableHead>Type de titre</TableHead>
                <TableHead>Score fraude</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContributions.map((contribution) => (
                <TableRow key={contribution.id}>
                  <TableCell className="font-mono text-sm">{contribution.parcel_number}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{(contribution.profiles as any)?.full_name || 'N/A'}</div>
                      <div className="text-xs text-muted-foreground">{(contribution.profiles as any)?.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{contribution.current_owner_name || '-'}</TableCell>
                  <TableCell>{contribution.property_title_type || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={contribution.fraud_score > 50 ? "destructive" : "secondary"}>
                      {contribution.fraud_score}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(contribution.status, contribution.is_suspicious)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(contribution.created_at), 'dd MMM yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedContribution(contribution);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {contribution.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprove(contribution.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedContribution(contribution);
                              setIsDialogOpen(true);
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredContributions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucune contribution trouvée
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails de la contribution</DialogTitle>
          </DialogHeader>
          
          {selectedContribution && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">N° Parcelle</div>
                  <div className="font-mono">{selectedContribution.parcel_number}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Statut</div>
                  <div>{getStatusBadge(selectedContribution.status, selectedContribution.is_suspicious)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Score de fraude</div>
                  <div>{selectedContribution.fraud_score}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Date de soumission</div>
                  <div>{format(new Date(selectedContribution.created_at), 'dd MMMM yyyy HH:mm', { locale: fr })}</div>
                </div>
              </div>

              {selectedContribution.status === 'pending' && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Raison du rejet (optionnel)</label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Expliquez pourquoi cette contribution est rejetée..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="default"
                      onClick={() => handleApprove(selectedContribution.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approuver
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(selectedContribution.id)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeter
                    </Button>
                  </div>
                </div>
              )}

              {selectedContribution.status === 'rejected' && selectedContribution.rejection_reason && (
                <div className="pt-4 border-t">
                  <div className="text-sm font-medium text-muted-foreground mb-2">Raison du rejet</div>
                  <div className="p-3 bg-muted rounded-md">{selectedContribution.rejection_reason}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminContributions;
