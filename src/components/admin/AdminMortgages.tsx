import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { RefreshCw, Building, Eye, DollarSign, Clock, CheckCircle2, Search, Download, XCircle, FileX2, Landmark, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { StatusBadge, StatusType } from '@/components/shared/StatusBadge';
import { exportToCSV } from '@/utils/csvExport';
import { formatCurrency } from '@/utils/formatters';

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

interface MortgageRequest {
  id: string;
  parcel_number: string;
  contribution_type: string;
  mortgage_history: any[];
  status: string;
  created_at: string;
  user_id: string;
  original_parcel_id?: string;
  rejection_reason?: string | null;
  change_justification?: string | null;
}

const AdminMortgages = () => {
  const { user } = useAuth();
  const [mortgages, setMortgages] = useState<Mortgage[]>([]);
  const [requests, setRequests] = useState<MortgageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [requestDetailsOpen, setRequestDetailsOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  // Fix #14: Confirmation dialog before approval
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [pendingApproveRequest, setPendingApproveRequest] = useState<MortgageRequest | null>(null);
  const [selectedMortgage, setSelectedMortgage] = useState<Mortgage | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<MortgageRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('_all');
  const [searchTerm, setSearchTerm] = useState('');
  // Fix #17/#18: Search and filter for requests tab
  const [requestSearchTerm, setRequestSearchTerm] = useState('');
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>('_all');
  const [activeTab, setActiveTab] = useState<string>('requests');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: approvedData, error: approvedError } = await supabase
        .from('cadastral_mortgages')
        .select('*, cadastral_parcels(parcel_number)')
        .order('created_at', { ascending: false });

      if (approvedError) throw approvedError;
      setMortgages((approvedData || []).map(m => ({
        ...m,
        parcel_number: (m.cadastral_parcels as any)?.parcel_number || 'N/A'
      })));

      const { data: requestData, error: requestError } = await supabase
        .from('cadastral_contributions')
        .select('id, parcel_number, contribution_type, mortgage_history, status, created_at, user_id, original_parcel_id, rejection_reason, change_justification')
        .in('contribution_type', ['mortgage_registration', 'mortgage_cancellation'])
        .order('created_at', { ascending: false });

      if (requestError) throw requestError;
      setRequests((requestData || []).filter(item => {
        const history = item.mortgage_history;
        return Array.isArray(history) && history.length > 0;
      }).map(item => ({ ...item, mortgage_history: item.mortgage_history as any[] })));
    } catch (error) {
      console.error('Error fetching mortgages:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const getMortgageStatusType = (status: string): StatusType => {
    switch (status?.toLowerCase()) {
      case 'active': return 'active';
      case 'paid': return 'paid';
      case 'defaulted': case 'en défaut': case 'en_defaut': return 'defaulted';
      case 'pending': return 'pending';
      case 'rejected': return 'rejected';
      case 'approved': return 'active';
      default: return 'pending';
    }
  };

  const getCreditorTypeLabel = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'bank': case 'banque': return 'Banque';
      case 'microfinance': return 'Microfinance';
      case 'private': case 'particulier': return 'Particulier';
      case 'coopérative': return 'Coopérative';
      default: return type || 'Non spécifié';
    }
  };

  // Filter approved mortgages
  const filteredMortgages = mortgages.filter(m => {
    const matchesSearch = searchTerm === '' ||
      m.creditor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.parcel_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === '_all' || m.mortgage_status?.toLowerCase() === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Fix #17/#18: Filter requests by type and search
  const pendingRequests = requests.filter(r => {
    const isPending = r.status === 'pending';
    const matchesType = requestTypeFilter === '_all' || r.contribution_type === requestTypeFilter;
    const mortgage = r.mortgage_history[0];
    const matchesSearch = requestSearchTerm === '' ||
      r.parcel_number?.toLowerCase().includes(requestSearchTerm.toLowerCase()) ||
      (mortgage?.creditor_name || mortgage?.creditorName || '').toLowerCase().includes(requestSearchTerm.toLowerCase()) ||
      (mortgage?.request_reference_number || '').toLowerCase().includes(requestSearchTerm.toLowerCase());
    return isPending && matchesType && matchesSearch;
  });
  const processedRequests = requests.filter(r => r.status === 'approved' || r.status === 'rejected');

  const pagination = usePagination(filteredMortgages, { initialPageSize: 15 });
  const requestsPagination = usePagination(pendingRequests, { initialPageSize: 15 });
  // Fix #10: Paginate history tab
  const historyPagination = usePagination(processedRequests, { initialPageSize: 15 });

  const activeCount = mortgages.filter(m => m.mortgage_status?.toLowerCase() === 'active').length;
  const paidCount = mortgages.filter(m => m.mortgage_status?.toLowerCase() === 'paid').length;
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const totalAmount = mortgages.filter(m => m.mortgage_status?.toLowerCase() === 'active').reduce((sum, m) => sum + (m.mortgage_amount_usd || 0), 0);

  // Fix #14: Show confirmation before approval
  const handleApproveClick = (request: MortgageRequest) => {
    setPendingApproveRequest(request);
    setApproveConfirmOpen(true);
  };

  // Fix #3/#4/#9: APPROVE with admin ID, reference_number, and declared status
  const handleApproveConfirmed = async () => {
    if (!pendingApproveRequest) return;
    const request = pendingApproveRequest;
    setProcessingAction(true);
    try {
      // Fix #3: Include reviewed_by with admin user ID
      const { error: updateError } = await supabase
        .from('cadastral_contributions')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id || null,
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      const mortgage = request.mortgage_history[0];

      // If registration: insert into cadastral_mortgages
      if (request.contribution_type === 'mortgage_registration' && request.original_parcel_id) {
        // Fix #4: Generate a reference_number for the approved mortgage
        const refNumber = `HYP-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
        // Fix #9: Use the declared mortgage_status from submission
        const declaredStatus = mortgage.mortgage_status || 'active';

        const { error: insertError } = await supabase
          .from('cadastral_mortgages')
          .insert({
            parcel_id: request.original_parcel_id,
            creditor_name: mortgage.creditor_name || mortgage.creditorName || '',
            creditor_type: mortgage.creditor_type || mortgage.creditorType || 'Banque',
            mortgage_amount_usd: mortgage.mortgage_amount_usd || mortgage.mortgageAmountUsd || 0,
            duration_months: mortgage.duration_months || mortgage.durationMonths || 0,
            contract_date: mortgage.contract_date || mortgage.contractDate || new Date().toISOString().split('T')[0],
            mortgage_status: declaredStatus,
            reference_number: refNumber,
          });

        if (insertError) {
          console.error('Error inserting mortgage:', insertError);
          toast.warning('Contribution approuvée, mais erreur lors de la création de l\'hypothèque.');
        }
      }

      // If cancellation: update mortgage status to 'paid'
      if (request.contribution_type === 'mortgage_cancellation' && mortgage.mortgage_reference_number) {
        await supabase
          .from('cadastral_mortgages')
          .update({ mortgage_status: 'paid' })
          .eq('reference_number', mortgage.mortgage_reference_number.toUpperCase());
      }

      // Fix #3: Audit log with admin identity
      try {
        await supabase.from('audit_logs').insert({
          action: `mortgage_${request.contribution_type === 'mortgage_cancellation' ? 'cancellation' : 'registration'}_approved`,
          user_id: user?.id || null,
          record_id: request.id,
          table_name: 'cadastral_contributions',
          new_values: { parcel_number: request.parcel_number, status: 'approved' } as any,
        });
      } catch { /* Non-blocking */ }

      toast.success('Demande approuvée avec succès');
      setApproveConfirmOpen(false);
      setPendingApproveRequest(null);
      setRequestDetailsOpen(false);
      fetchData();
    } catch (error) {
      console.error('Approve error:', error);
      toast.error('Erreur lors de l\'approbation');
    } finally {
      setProcessingAction(false);
    }
  };

  // Fix #3: REJECT with admin ID
  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error('Veuillez indiquer un motif de rejet');
      return;
    }
    setProcessingAction(true);
    try {
      const { error } = await supabase
        .from('cadastral_contributions')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason.trim(),
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id || null,
          rejected_by: user?.id || null,
          rejection_date: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      try {
        await supabase.from('audit_logs').insert({
          action: 'mortgage_request_rejected',
          user_id: user?.id || null,
          record_id: selectedRequest.id,
          table_name: 'cadastral_contributions',
          new_values: { parcel_number: selectedRequest.parcel_number, status: 'rejected', reason: rejectionReason.trim() } as any,
        });
      } catch { /* Non-blocking */ }

      toast.success('Demande rejetée');
      setRejectDialogOpen(false);
      setRequestDetailsOpen(false);
      setRejectionReason('');
      fetchData();
    } catch (error) {
      console.error('Reject error:', error);
      toast.error('Erreur lors du rejet');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Référence', 'Parcelle', 'Créancier', 'Type', 'Montant USD', 'Durée', 'Statut', 'Date contrat', 'Date création'];
    const data = filteredMortgages.map(m => [
      m.reference_number || '', m.parcel_number || '', m.creditor_name,
      getCreditorTypeLabel(m.creditor_type), m.mortgage_amount_usd, m.duration_months,
      m.mortgage_status, m.contract_date, m.created_at
    ]);
    exportToCSV({ filename: 'hypotheques.csv', headers, data });
  };

  const getRequestTypeLabel = (type: string) => {
    return type === 'mortgage_cancellation' ? 'Radiation' : 'Enregistrement';
  };

  const getRequestTypeIcon = (type: string) => {
    return type === 'mortgage_cancellation'
      ? <FileX2 className="h-3.5 w-3.5 text-destructive" />
      : <Landmark className="h-3.5 w-3.5 text-amber-600" />;
  };

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header */}
      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm md:text-base font-bold">Gestion des Hypothèques</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">Suivi et validation des hypothèques</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 text-xs">
              <Download className="h-3 w-3 mr-1" /> Exporter
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-8 text-xs">
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center cursor-pointer hover:bg-accent/50" onClick={() => setActiveTab('approved')}>
          <p className="text-lg md:text-xl font-bold text-blue-500">{activeCount}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Actives</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center cursor-pointer hover:bg-accent/50" onClick={() => setActiveTab('approved')}>
          <p className="text-lg md:text-xl font-bold text-green-500">{paidCount}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Soldées</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center cursor-pointer hover:bg-accent/50" onClick={() => setActiveTab('requests')}>
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
        <TabsList className="grid w-full grid-cols-3 h-9">
          <TabsTrigger value="requests" className="text-xs">
            <Clock className="h-3 w-3 mr-1" /> Demandes ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Validées ({mortgages.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            <Search className="h-3 w-3 mr-1" /> Historique ({processedRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* REQUESTS TAB */}
        <TabsContent value="requests" className="mt-3">
          {/* Fix #17/#18: Search and filter for requests */}
          <Card className="p-2.5 bg-background rounded-xl shadow-sm border mb-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={requestSearchTerm} onChange={(e) => { setRequestSearchTerm(e.target.value); requestsPagination.goToPage(1); }} placeholder="Rechercher parcelle, créancier..." className="h-8 text-xs pl-8" />
              </div>
              <Select value={requestTypeFilter} onValueChange={(v) => { setRequestTypeFilter(v); requestsPagination.goToPage(1); }}>
                <SelectTrigger className="h-8 text-xs w-full sm:w-44"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Tous les types</SelectItem>
                  <SelectItem value="mortgage_registration">Enregistrements</SelectItem>
                  <SelectItem value="mortgage_cancellation">Radiations</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
            <h3 className="text-xs font-semibold mb-3">Demandes en attente de validation ({pendingRequests.length})</h3>
            {loading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Aucune demande en attente</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {requestsPagination.paginatedData.map((req) => {
                    const mortgage = req.mortgage_history[0];
                    return (
                      <div key={req.id} className="p-2.5 md:p-3 rounded-xl border bg-card hover:bg-accent/50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {getRequestTypeIcon(req.contribution_type)}
                              <span className="text-xs font-semibold">{getRequestTypeLabel(req.contribution_type)}</span>
                              <StatusBadge status={getMortgageStatusType(req.status)} compact />
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Parcelle: {req.parcel_number} • {mortgage?.creditor_name || mortgage?.creditorName || 'N/A'}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[10px]">
                              <DollarSign className="h-2.5 w-2.5 text-green-500" />
                              <span className="font-semibold">{formatCurrency(mortgage?.mortgage_amount_usd || mortgage?.mortgageAmountUsd || mortgage?.total_amount_paid || 0)}</span>
                              <span className="text-muted-foreground">{format(new Date(req.created_at), 'dd/MM/yy', { locale: fr })}</span>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedRequest(req); setRequestDetailsOpen(true); }}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {/* Fix #14: Use confirmation dialog */}
                            <Button variant="default" size="icon" className="h-7 w-7 bg-green-600 hover:bg-green-700" onClick={() => handleApproveClick(req)} disabled={processingAction}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => { setSelectedRequest(req); setRejectDialogOpen(true); }} disabled={processingAction}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {requestsPagination.totalPages > 1 && (
                  <div className="mt-4">
                    <PaginationControls
                      currentPage={requestsPagination.currentPage} totalPages={requestsPagination.totalPages}
                      pageSize={requestsPagination.pageSize} totalItems={requestsPagination.totalItems}
                      hasPreviousPage={requestsPagination.hasPreviousPage} hasNextPage={requestsPagination.hasNextPage}
                      onPageChange={requestsPagination.goToPage} onPageSizeChange={requestsPagination.changePageSize}
                      onNextPage={requestsPagination.goToNextPage} onPreviousPage={requestsPagination.goToPreviousPage}
                    />
                  </div>
                )}
              </>
            )}
          </Card>
        </TabsContent>

        {/* APPROVED TAB */}
        <TabsContent value="approved" className="mt-3">
          <Card className="p-2.5 bg-background rounded-xl shadow-sm border mb-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); pagination.goToPage(1); }} placeholder="Rechercher..." className="h-8 text-xs pl-8" />
              </div>
              <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); pagination.goToPage(1); }}>
                <SelectTrigger className="h-8 text-xs w-full sm:w-40"><SelectValue placeholder="Filtrer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Toutes</SelectItem>
                  <SelectItem value="active">Actives</SelectItem>
                  <SelectItem value="paid">Soldées</SelectItem>
                  <SelectItem value="defaulted">En défaut</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
            <h3 className="text-xs font-semibold mb-3">Hypothèques validées ({filteredMortgages.length})</h3>
            {loading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
            ) : pagination.paginatedData.length === 0 ? (
              <div className="text-center py-8">
                <Building className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Aucune hypothèque trouvée</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {pagination.paginatedData.map((mortgage) => (
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
                          {mortgage.reference_number && <div className="mt-1 text-[10px] font-mono text-primary">Réf: {mortgage.reference_number}</div>}
                          <div className="flex items-center gap-2 mt-1 text-[10px]">
                            <DollarSign className="h-2.5 w-2.5 text-green-500" />
                            <span className="font-semibold">{formatCurrency(mortgage.mortgage_amount_usd || 0)}</span>
                            <span className="text-muted-foreground">• {mortgage.duration_months} mois</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[9px] text-muted-foreground">{format(new Date(mortgage.contract_date), 'dd/MM/yy', { locale: fr })}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSelectedMortgage(mortgage); setDetailsOpen(true); }}><Eye className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <PaginationControls currentPage={pagination.currentPage} totalPages={pagination.totalPages} pageSize={pagination.pageSize} totalItems={pagination.totalItems} hasPreviousPage={pagination.hasPreviousPage} hasNextPage={pagination.hasNextPage} onPageChange={pagination.goToPage} onPageSizeChange={pagination.changePageSize} onNextPage={pagination.goToNextPage} onPreviousPage={pagination.goToPreviousPage} />
                </div>
              </>
            )}
          </Card>
        </TabsContent>

        {/* HISTORY TAB - Fix #10: Paginated */}
        <TabsContent value="history" className="mt-3">
          <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
            <h3 className="text-xs font-semibold mb-3">Historique des demandes traitées ({processedRequests.length})</h3>
            {processedRequests.length === 0 ? (
              <div className="text-center py-8"><p className="text-xs text-muted-foreground">Aucune demande traitée</p></div>
            ) : (
              <>
                <div className="space-y-2">
                  {historyPagination.paginatedData.map((req) => {
                    const mortgage = req.mortgage_history[0];
                    return (
                      <div key={req.id} className="p-2.5 rounded-xl border bg-card">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {getRequestTypeIcon(req.contribution_type)}
                            <span className="text-xs font-medium">{getRequestTypeLabel(req.contribution_type)}</span>
                            <span className="text-[10px] text-muted-foreground">{req.parcel_number}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-muted-foreground">{format(new Date(req.created_at), 'dd/MM/yy', { locale: fr })}</span>
                            <StatusBadge status={getMortgageStatusType(req.status)} compact />
                          </div>
                        </div>
                        {req.status === 'rejected' && req.rejection_reason && (
                          <p className="text-[10px] text-destructive mt-1">Motif: {req.rejection_reason}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {historyPagination.totalPages > 1 && (
                  <div className="mt-4">
                    <PaginationControls currentPage={historyPagination.currentPage} totalPages={historyPagination.totalPages} pageSize={historyPagination.pageSize} totalItems={historyPagination.totalItems} hasPreviousPage={historyPagination.hasPreviousPage} hasNextPage={historyPagination.hasNextPage} onPageChange={historyPagination.goToPage} onPageSizeChange={historyPagination.changePageSize} onNextPage={historyPagination.goToNextPage} onPreviousPage={historyPagination.goToPreviousPage} />
                  </div>
                )}
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Mortgage Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader><DialogTitle className="text-sm">Détails de l'hypothèque</DialogTitle></DialogHeader>
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
                  <p className="text-xs font-semibold">{formatCurrency(selectedMortgage.mortgage_amount_usd)}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Durée</p>
                  <p className="text-xs font-semibold">{selectedMortgage.duration_months} mois</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Parcelle</p>
                  <p className="text-xs font-mono">{selectedMortgage.parcel_number}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Date contrat</p>
                  <p className="text-xs">{format(new Date(selectedMortgage.contract_date), 'dd MMM yyyy', { locale: fr })}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Request Details Dialog */}
      <Dialog open={requestDetailsOpen} onOpenChange={setRequestDetailsOpen}>
        <DialogContent className="max-w-[380px] rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-sm">Détails de la demande</DialogTitle></DialogHeader>
          {selectedRequest && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2">
                {getRequestTypeIcon(selectedRequest.contribution_type)}
                <span className="text-sm font-semibold">{getRequestTypeLabel(selectedRequest.contribution_type)}</span>
                <StatusBadge status={getMortgageStatusType(selectedRequest.status)} compact />
              </div>

              <div className="p-2.5 rounded-lg bg-muted/50 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Parcelle:</span><p className="font-mono font-medium">{selectedRequest.parcel_number}</p></div>
                  <div><span className="text-muted-foreground">Date:</span><p>{format(new Date(selectedRequest.created_at), 'dd MMM yyyy', { locale: fr })}</p></div>
                </div>
              </div>

              {selectedRequest.mortgage_history.map((mortgage: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg border space-y-2">
                  {mortgage.request_reference_number && <div className="text-xs"><span className="text-muted-foreground">Réf demande:</span> <span className="font-mono">{mortgage.request_reference_number}</span></div>}
                  {mortgage.creditor_name && <div className="text-xs"><span className="text-muted-foreground">Créancier:</span> <span className="font-medium">{mortgage.creditor_name}</span></div>}
                  {(mortgage.mortgage_amount_usd || mortgage.mortgageAmountUsd) && <div className="text-xs"><span className="text-muted-foreground">Montant:</span> <span className="font-semibold">{formatCurrency(mortgage.mortgage_amount_usd || mortgage.mortgageAmountUsd)}</span></div>}
                  {mortgage.mortgage_reference_number && <div className="text-xs"><span className="text-muted-foreground">Réf hypothèque:</span> <span className="font-mono">{mortgage.mortgage_reference_number}</span></div>}
                  {mortgage.mortgage_status && <div className="text-xs"><span className="text-muted-foreground">Statut déclaré:</span> <span>{mortgage.mortgage_status}</span></div>}
                  {mortgage.cancellation_reason_label && <div className="text-xs"><span className="text-muted-foreground">Motif:</span> <span>{mortgage.cancellation_reason_label}</span></div>}
                  {mortgage.requester_name && <div className="text-xs"><span className="text-muted-foreground">Demandeur:</span> <span>{mortgage.requester_name}</span></div>}
                  {mortgage.total_amount_paid > 0 && <div className="text-xs"><span className="text-muted-foreground">Frais payés:</span> <span className="font-semibold text-green-600">{formatCurrency(mortgage.total_amount_paid)}</span></div>}
                  {mortgage.payment_transaction_id && <div className="text-xs"><span className="text-muted-foreground">ID Transaction:</span> <span className="font-mono text-[10px]">{mortgage.payment_transaction_id}</span></div>}
                  {mortgage.document_url && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Justificatif:</span>
                      <a href={mortgage.document_url} target="_blank" rel="noopener noreferrer" className="ml-1 text-primary hover:underline text-[10px]">Voir le document</a>
                    </div>
                  )}
                  {mortgage.supporting_documents?.length > 0 && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Documents ({mortgage.supporting_documents.length}):</span>
                      <div className="mt-1 space-y-1">
                        {mortgage.supporting_documents.map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline text-[10px] truncate">{url.split('/').pop()}</a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {selectedRequest.change_justification && (
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Commentaire</p>
                  <p className="text-xs">{selectedRequest.change_justification}</p>
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 h-9 text-xs bg-green-600 hover:bg-green-700" onClick={() => handleApproveClick(selectedRequest)} disabled={processingAction}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approuver
                  </Button>
                  <Button variant="destructive" className="flex-1 h-9 text-xs" onClick={() => setRejectDialogOpen(true)} disabled={processingAction}>
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeter
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fix #14: Approval Confirmation Dialog */}
      <Dialog open={approveConfirmOpen} onOpenChange={setApproveConfirmOpen}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader><DialogTitle className="text-sm">Confirmer l'approbation</DialogTitle></DialogHeader>
          {pendingApproveRequest && (
            <div className="space-y-3 py-2">
              <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 rounded-xl">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-xs text-green-700 dark:text-green-300">
                  <p className="font-medium mb-1">
                    {pendingApproveRequest.contribution_type === 'mortgage_cancellation'
                      ? "L'hypothèque sera marquée comme soldée et radiée du registre."
                      : "Une nouvelle hypothèque sera créée dans le registre avec un numéro de référence."
                    }
                  </p>
                  <p>Parcelle: <strong>{pendingApproveRequest.parcel_number}</strong></p>
                </AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setApproveConfirmOpen(false); setPendingApproveRequest(null); }}>Annuler</Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleApproveConfirmed} disabled={processingAction}>
              {processingAction ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
              Confirmer l'approbation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader><DialogTitle className="text-sm">Motif du rejet</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs">Veuillez indiquer le motif du rejet *</Label>
            <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Motif du rejet..." className="text-sm rounded-xl" rows={3} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setRejectDialogOpen(false); setRejectionReason(''); }}>Annuler</Button>
            <Button variant="destructive" size="sm" onClick={handleReject} disabled={processingAction || !rejectionReason.trim()}>Confirmer le rejet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMortgages;
