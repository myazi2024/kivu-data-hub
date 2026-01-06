import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Building, Eye, DollarSign, Clock, CheckCircle2, Search, Download } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { StatusBadge, StatusType } from '@/components/shared/StatusBadge';
import { exportToCSV } from '@/utils/csvExport';

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
  original_parcel_id?: string;
}

const AdminMortgages = () => {
  const [mortgages, setMortgages] = useState<Mortgage[]>([]);
  const [pendingMortgages, setPendingMortgages] = useState<PendingMortgage[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pendingDetailsOpen, setPendingDetailsOpen] = useState(false);
  const [selectedMortgage, setSelectedMortgage] = useState<Mortgage | null>(null);
  const [selectedPending, setSelectedPending] = useState<PendingMortgage | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('_all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('approved');

  useEffect(() => {
    fetchMortgages();
  }, []);

  const fetchMortgages = async () => {
    setLoading(true);
    try {
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

      const { data: pendingData, error: pendingError } = await supabase
        .from('cadastral_contributions')
        .select('id, parcel_number, mortgage_history, status, created_at, user_id, original_parcel_id')
        .not('mortgage_history', 'is', null)
        .in('status', ['pending', 'rejected'])
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;
      
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

  const getMortgageStatusType = (status: string): StatusType => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'active': return 'active';
      case 'paid': return 'paid';
      case 'defaulted':
      case 'en défaut': return 'defaulted';
      case 'pending': return 'pending';
      case 'rejected': return 'rejected';
      default: return 'pending';
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

  const filteredMortgages = mortgages.filter(m => {
    const matchesSearch = searchTerm === '' || 
      m.creditor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.parcel_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === '_all' || m.mortgage_status?.toLowerCase() === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const pagination = usePagination(filteredMortgages, { initialPageSize: 15 });

  const paginatedMortgages = pagination.paginatedData;

  const activeCount = mortgages.filter(m => m.mortgage_status?.toLowerCase() === 'active').length;
  const paidCount = mortgages.filter(m => m.mortgage_status?.toLowerCase() === 'paid').length;
  const pendingCount = pendingMortgages.filter(m => m.status === 'pending').length;
  const totalAmount = mortgages.filter(m => m.mortgage_status?.toLowerCase() === 'active').reduce((sum, m) => sum + (m.mortgage_amount_usd || 0), 0);

  const handleExportCSV = () => {
    const headers = ['Référence', 'Parcelle', 'Créancier', 'Type créancier', 'Montant USD', 'Durée (mois)', 'Statut', 'Date contrat', 'Date création'];
    const data = filteredMortgages.map(m => [
      m.reference_number || '',
      m.parcel_number || '',
      m.creditor_name,
      getCreditorTypeLabel(m.creditor_type),
      m.mortgage_amount_usd,
      m.duration_months,
      m.mortgage_status,
      m.contract_date,
      m.created_at
    ]);
    exportToCSV({ filename: 'hypotheques.csv', headers, data });
  };

  const resetPagination = () => pagination.goToPage(1);

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header */}
      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm md:text-base font-bold">Gestion des Hypothèques</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">Suivi des hypothèques sur les parcelles</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 text-xs">
              <Download className="h-3 w-3 mr-1" />
              Exporter CSV
            </Button>
            <Button variant="outline" size="sm" onClick={fetchMortgages} disabled={loading} className="h-8 text-xs">
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
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
          {/* Filters */}
          <Card className="p-2.5 bg-background rounded-xl shadow-sm border mb-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  value={searchTerm} 
                  onChange={(e) => { setSearchTerm(e.target.value); resetPagination(); }} 
                  placeholder="Rechercher par créancier, parcelle, référence..." 
                  className="h-8 text-xs pl-8" 
                />
              </div>
              <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); resetPagination(); }}>
                <SelectTrigger className="h-8 text-xs w-full sm:w-40">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Toutes les hypothèques</SelectItem>
                  <SelectItem value="active">Actives</SelectItem>
                  <SelectItem value="paid">Soldées</SelectItem>
                  <SelectItem value="defaulted">En défaut</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Approved Mortgages List */}
          <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
            <h3 className="text-xs font-semibold mb-3">Hypothèques validées ({filteredMortgages.length})</h3>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : paginatedMortgages.length === 0 ? (
              <div className="text-center py-8">
                <Building className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Aucune hypothèque validée trouvée</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {paginatedMortgages.map((mortgage) => (
                    <div key={mortgage.id} className="p-2.5 md:p-3 rounded-xl border bg-card">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Building className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="text-xs font-medium truncate">{mortgage.creditor_name}</span>
                            <StatusBadge status={getMortgageStatusType(mortgage.mortgage_status)} compact />
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
                
                <div className="mt-4">
                  <PaginationControls
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    pageSize={pagination.pageSize}
                    totalItems={pagination.totalItems}
                    hasPreviousPage={pagination.hasPreviousPage}
                    hasNextPage={pagination.hasNextPage}
                    onPageChange={pagination.goToPage}
                    onPageSizeChange={pagination.changePageSize}
                    onNextPage={pagination.goToNextPage}
                    onPreviousPage={pagination.goToPreviousPage}
                  />
                </div>
              </>
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
                            <StatusBadge status={getMortgageStatusType(pending.status)} compact />
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
                  <StatusBadge status={getMortgageStatusType(selectedMortgage.mortgage_status)} />
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

      {/* Pending Details Dialog */}
      <Dialog open={pendingDetailsOpen} onOpenChange={setPendingDetailsOpen}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm">Détails hypothèque en attente</DialogTitle>
          </DialogHeader>
          {selectedPending && selectedPending.mortgage_history[0] && (
            <div className="space-y-3 py-2">
              <div className="p-2.5 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground mb-1">Parcelle</p>
                <p className="text-xs font-medium">{selectedPending.parcel_number}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground mb-1">Créancier</p>
                <p className="text-xs font-medium">
                  {selectedPending.mortgage_history[0]?.creditor_name || selectedPending.mortgage_history[0]?.creditorName}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Montant</p>
                  <p className="text-sm font-bold text-primary">
                    ${(selectedPending.mortgage_history[0]?.mortgage_amount_usd || selectedPending.mortgage_history[0]?.mortgageAmountUsd || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Statut</p>
                  <StatusBadge status={getMortgageStatusType(selectedPending.status)} />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Validez cette hypothèque depuis "Contributions CCC"
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPendingDetailsOpen(false)} className="h-8 text-xs">Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMortgages;