import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Building, Eye, DollarSign, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Mortgage {
  id: string;
  parcel_id: string;
  creditor_name: string;
  creditor_type: string;
  mortgage_amount_usd: number;
  mortgage_status: string;
  contract_date: string;
  duration_months: number;
  created_at: string;
  parcel_number?: string;
  reference_number?: string;
}

interface PendingMortgage {
  id: string;
  parcel_number: string;
  mortgage_history: any[];
  status: string;
  created_at: string;
  user_id: string;
}

const AdminMortgages = () => {
  const [mortgages, setMortgages] = useState<Mortgage[]>([]);
  const [pendingMortgages, setPendingMortgages] = useState<PendingMortgage[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pendingDetailsOpen, setPendingDetailsOpen] = useState(false);
  const [selectedMortgage, setSelectedMortgage] = useState<Mortgage | null>(null);
  const [selectedPending, setSelectedPending] = useState<PendingMortgage | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('approved');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchMortgages();
  }, []);

  const fetchMortgages = async () => {
    setLoading(true);
    try {
      // Récupérer les hypothèques validées
      const { data: approvedData, error: approvedError } = await supabase
        .from('cadastral_mortgages')
        .select(`
          *,
          cadastral_parcels(parcel_number)
        `)
        .order('created_at', { ascending: false });

      if (approvedError) throw approvedError;
      
      const mortgagesWithParcel = (approvedData || []).map(m => ({
        ...m,
        parcel_number: (m.cadastral_parcels as any)?.parcel_number || 'N/A'
      }));
      
      setMortgages(mortgagesWithParcel);

      // Récupérer les hypothèques en attente de validation (contributions)
      const { data: pendingData, error: pendingError } = await supabase
        .from('cadastral_contributions')
        .select('id, parcel_number, mortgage_history, status, created_at, user_id')
        .not('mortgage_history', 'is', null)
        .in('status', ['pending', 'rejected'])
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;
      
      // Filtrer les contributions qui ont des hypothèques valides
      const validPending = (pendingData || []).filter(item => {
        const history = item.mortgage_history;
        return Array.isArray(history) && history.length > 0;
      }).map(item => ({
        ...item,
        mortgage_history: item.mortgage_history as any[]
      }));
      
      setPendingMortgages(validPending);
    } catch (error) {
      console.error('Error fetching mortgages:', error);
      toast.error('Erreur lors du chargement des hypothèques');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'active':
        return <Badge variant="outline" className="text-[9px] bg-blue-100 text-blue-700 border-blue-200">Actif</Badge>;
      case 'paid':
        return <Badge variant="outline" className="text-[9px] bg-green-100 text-green-700 border-green-200">Soldé</Badge>;
      case 'defaulted':
      case 'en défaut':
        return <Badge variant="outline" className="text-[9px] bg-red-100 text-red-700 border-red-200">Défaut</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-[9px] bg-yellow-100 text-yellow-700 border-yellow-200">En attente</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-[9px] bg-red-100 text-red-700 border-red-200">Rejeté</Badge>;
      default:
        return <Badge variant="outline" className="text-[9px]">{status}</Badge>;
    }
  };

  const getCreditorTypeLabel = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'bank':
      case 'banque': return 'Banque';
      case 'microfinance': return 'Microfinance';
      case 'private':
      case 'particulier': return 'Particulier';
      case 'coopérative': return 'Coopérative';
      default: return type || 'Non spécifié';
    }
  };

  const filteredMortgages = filterStatus === 'all' 
    ? mortgages 
    : mortgages.filter(m => m.mortgage_status?.toLowerCase() === filterStatus);

  const activeCount = mortgages.filter(m => m.mortgage_status?.toLowerCase() === 'active').length;
  const paidCount = mortgages.filter(m => m.mortgage_status?.toLowerCase() === 'paid').length;
  const pendingCount = pendingMortgages.filter(m => m.status === 'pending').length;
  const totalAmount = mortgages.filter(m => m.mortgage_status?.toLowerCase() === 'active').reduce((sum, m) => sum + (m.mortgage_amount_usd || 0), 0);

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header */}
      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm md:text-base font-bold">Gestion des Hypothèques</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">Suivi des hypothèques sur les parcelles</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchMortgages} disabled={loading} className="h-8 text-xs">
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center cursor-pointer hover:bg-accent/50" onClick={() => { setActiveTab('approved'); setFilterStatus('active'); }}>
          <p className="text-lg md:text-xl font-bold text-blue-500">{activeCount}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Actives</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center cursor-pointer hover:bg-accent/50" onClick={() => { setActiveTab('approved'); setFilterStatus('paid'); }}>
          <p className="text-lg md:text-xl font-bold text-green-500">{paidCount}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Soldées</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center cursor-pointer hover:bg-accent/50" onClick={() => setActiveTab('pending')}>
          <p className="text-lg md:text-xl font-bold text-yellow-500">{pendingCount}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">En attente</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center">
          <p className="text-lg md:text-xl font-bold text-primary">${(totalAmount / 1000).toFixed(0)}k</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Total actif</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-9">
          <TabsTrigger value="approved" className="text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Validées ({mortgages.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            En attente ({pendingCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approved" className="mt-3">
          {/* Filter */}
          <Card className="p-2.5 bg-background rounded-xl shadow-sm border mb-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les hypothèques</SelectItem>
                <SelectItem value="active">Actives</SelectItem>
                <SelectItem value="paid">Soldées</SelectItem>
                <SelectItem value="defaulted">En défaut</SelectItem>
              </SelectContent>
            </Select>
          </Card>

          {/* Approved Mortgages List */}
          <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
            <h3 className="text-xs font-semibold mb-3">Hypothèques validées ({filteredMortgages.length})</h3>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : filteredMortgages.length === 0 ? (
              <div className="text-center py-8">
                <Building className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Aucune hypothèque validée trouvée</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMortgages.map((mortgage) => (
                  <div key={mortgage.id} className="p-2.5 md:p-3 rounded-xl border bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Building className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-xs font-medium truncate">{mortgage.creditor_name}</span>
                          {getStatusBadge(mortgage.mortgage_status)}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="truncate">Parcelle: {mortgage.parcel_number}</span>
                          <span>•</span>
                          <span>{getCreditorTypeLabel(mortgage.creditor_type)}</span>
                        </div>
                        {mortgage.reference_number && (
                          <div className="mt-1 text-[10px] font-mono text-primary">
                            Réf: {mortgage.reference_number}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[10px]">
                          <DollarSign className="h-2.5 w-2.5 text-green-500" />
                          <span className="font-semibold">${(mortgage.mortgage_amount_usd || 0).toLocaleString()}</span>
                          <span className="text-muted-foreground">• {mortgage.duration_months} mois</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[9px] text-muted-foreground">
                          {format(new Date(mortgage.contract_date), 'dd/MM/yy', { locale: fr })}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSelectedMortgage(mortgage); setDetailsOpen(true); }}>
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-3">
          {/* Pending Mortgages List */}
          <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
            <h3 className="text-xs font-semibold mb-3">Hypothèques en attente de validation ({pendingMortgages.length})</h3>
            <p className="text-[10px] text-muted-foreground mb-3">
              Ces hypothèques sont en attente dans "Contributions CCC". Validez-les depuis cette section.
            </p>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : pendingMortgages.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Aucune hypothèque en attente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingMortgages.map((pending) => {
                  const mortgage = pending.mortgage_history[0];
                  return (
                    <div 
                      key={pending.id} 
                      className="p-2.5 md:p-3 rounded-xl border bg-card cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => { setSelectedPending(pending); setPendingDetailsOpen(true); }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Building className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                            <span className="text-xs font-medium truncate">
                              {mortgage?.creditor_name || mortgage?.creditorName || 'Non spécifié'}
                            </span>
                            {getStatusBadge(pending.status)}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="truncate">Parcelle: {pending.parcel_number}</span>
                            <span>•</span>
                            <span>{getCreditorTypeLabel(mortgage?.creditor_type || mortgage?.creditorType)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[10px]">
                            <DollarSign className="h-2.5 w-2.5 text-green-500" />
                            <span className="font-semibold">
                              ${(mortgage?.mortgage_amount_usd || mortgage?.mortgageAmountUsd || 0).toLocaleString()}
                            </span>
                            <span className="text-muted-foreground">
                              • {mortgage?.duration_months || mortgage?.durationMonths || 0} mois
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[9px] text-muted-foreground">
                            {format(new Date(pending.created_at), 'dd/MM/yy', { locale: fr })}
                          </span>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm">Détails de l'hypothèque</DialogTitle>
          </DialogHeader>
          {selectedMortgage && (
            <div className="space-y-3 py-2">
              {selectedMortgage.reference_number && (
                <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-[10px] text-muted-foreground mb-1">Numéro de référence</p>
                  <p className="text-sm font-mono font-bold text-primary">{selectedMortgage.reference_number}</p>
                </div>
              )}
              <div className="p-2.5 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground mb-1">Créancier</p>
                <p className="text-xs font-medium">{selectedMortgage.creditor_name}</p>
                <p className="text-[10px] text-muted-foreground">{getCreditorTypeLabel(selectedMortgage.creditor_type)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Montant</p>
                  <p className="text-sm font-bold text-primary">${(selectedMortgage.mortgage_amount_usd || 0).toLocaleString()}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Durée</p>
                  <p className="text-sm font-bold">{selectedMortgage.duration_months} mois</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Date contrat</p>
                  <p className="text-xs font-medium">{format(new Date(selectedMortgage.contract_date), 'dd/MM/yyyy', { locale: fr })}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Statut</p>
                  {getStatusBadge(selectedMortgage.mortgage_status)}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground mb-1">Parcelle</p>
                <p className="text-xs font-medium">{selectedMortgage.parcel_number}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDetailsOpen(false)} className="h-8 text-xs">Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pending Mortgage Details Dialog */}
      <Dialog open={pendingDetailsOpen} onOpenChange={setPendingDetailsOpen}>
        <DialogContent className="max-w-[380px] rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Traitement de l'hypothèque en attente</DialogTitle>
          </DialogHeader>
          {selectedPending && (() => {
            const mortgage = selectedPending.mortgage_history[0];
            return (
              <div className="space-y-3 py-2">
                <div className="p-2.5 rounded-lg bg-yellow-50 border border-yellow-200">
                  <p className="text-[10px] text-yellow-700 font-medium mb-1">Statut actuel</p>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedPending.status)}
                    <span className="text-xs text-yellow-800">
                      {selectedPending.status === 'pending' ? 'En attente de validation' : 'Rejeté - Peut être révisé'}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Parcelle concernée</p>
                  <p className="text-sm font-bold text-primary">{selectedPending.parcel_number}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Créancier</p>
                  <p className="text-xs font-medium">{mortgage?.creditor_name || mortgage?.creditorName || 'Non spécifié'}</p>
                  <p className="text-[10px] text-muted-foreground">{getCreditorTypeLabel(mortgage?.creditor_type || mortgage?.creditorType)}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground mb-1">Montant</p>
                    <p className="text-sm font-bold text-primary">
                      ${(mortgage?.mortgage_amount_usd || mortgage?.mortgageAmountUsd || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground mb-1">Durée</p>
                    <p className="text-sm font-bold">{mortgage?.duration_months || mortgage?.durationMonths || 0} mois</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground mb-1">Date contrat</p>
                    <p className="text-xs font-medium">
                      {mortgage?.contract_date || mortgage?.contractDate 
                        ? format(new Date(mortgage?.contract_date || mortgage?.contractDate), 'dd/MM/yyyy', { locale: fr })
                        : 'Non spécifié'
                      }
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground mb-1">Soumis le</p>
                    <p className="text-xs font-medium">{format(new Date(selectedPending.created_at), 'dd/MM/yyyy', { locale: fr })}</p>
                  </div>
                </div>

                <div className="pt-2 border-t space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground">Actions de traitement</p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 h-9 text-xs border-red-200 text-red-600 hover:bg-red-50"
                      disabled={processing}
                      onClick={async () => {
                        setProcessing(true);
                        try {
                          await supabase
                            .from('cadastral_contributions')
                            .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
                            .eq('id', selectedPending.id);
                          toast.success('Hypothèque rejetée');
                          setPendingDetailsOpen(false);
                          fetchMortgages();
                        } catch (error) {
                          toast.error('Erreur lors du rejet');
                        } finally {
                          setProcessing(false);
                        }
                      }}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Rejeter
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1 h-9 text-xs bg-green-600 hover:bg-green-700"
                      disabled={processing}
                      onClick={async () => {
                        setProcessing(true);
                        try {
                          // Trouver la parcelle
                          const { data: parcelData } = await supabase
                            .from('cadastral_parcels')
                            .select('id')
                            .eq('parcel_number', selectedPending.parcel_number)
                            .single();

                          if (!parcelData) {
                            toast.error('Parcelle non trouvée');
                            setProcessing(false);
                            return;
                          }

                          // Générer un numéro de référence
                          const referenceNumber = `HYP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

                          // Créer l'hypothèque validée
                          const { error: insertError } = await supabase
                            .from('cadastral_mortgages')
                            .insert({
                              parcel_id: parcelData.id,
                              creditor_name: mortgage?.creditor_name || mortgage?.creditorName || 'Non spécifié',
                              creditor_type: mortgage?.creditor_type || mortgage?.creditorType || 'Banque',
                              mortgage_amount_usd: mortgage?.mortgage_amount_usd || mortgage?.mortgageAmountUsd || 0,
                              duration_months: mortgage?.duration_months || mortgage?.durationMonths || 12,
                              contract_date: mortgage?.contract_date || mortgage?.contractDate || new Date().toISOString().split('T')[0],
                              mortgage_status: 'active',
                              reference_number: referenceNumber
                            });

                          if (insertError) throw insertError;

                          // Mettre à jour la contribution
                          await supabase
                            .from('cadastral_contributions')
                            .update({ status: 'approved', reviewed_at: new Date().toISOString() })
                            .eq('id', selectedPending.id);

                          toast.success(`Hypothèque validée avec le numéro ${referenceNumber}`);
                          setPendingDetailsOpen(false);
                          fetchMortgages();
                        } catch (error) {
                          console.error('Error approving mortgage:', error);
                          toast.error('Erreur lors de la validation');
                        } finally {
                          setProcessing(false);
                        }
                      }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      {processing ? 'Traitement...' : 'Valider'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPendingDetailsOpen(false)} className="h-8 text-xs">Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMortgages;
