import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { RefreshCw, Building, Eye, DollarSign, Clock, CheckCircle2, Search, Download } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { exportToCSV } from '@/utils/csvExport';
import { formatCurrency } from '@/utils/formatters';
import { generateMortgageReference, normalizeMortgageStatus } from '@/utils/mortgageReferences';

import MortgageStatsCards from './mortgage/MortgageStatsCards';
import MortgageRequestCard from './mortgage/MortgageRequestCard';
import MortgageDetailsDialog from './mortgage/MortgageDetailsDialog';
import MortgageRequestDetailsDialog from './mortgage/MortgageRequestDetailsDialog';
import { ApproveConfirmDialog, RejectDialog, ReturnDialog } from './mortgage/MortgageAdminDialogs';
import { getMortgageStatusType, getCreditorTypeLabel, getRequestTypeLabel, normalizeStatusForFilter } from './mortgage/mortgageHelpers';

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
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [pendingApproveRequest, setPendingApproveRequest] = useState<MortgageRequest | null>(null);
  const [selectedMortgage, setSelectedMortgage] = useState<Mortgage | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<MortgageRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('_all');
  const [searchTerm, setSearchTerm] = useState('');
  const [requestSearchTerm, setRequestSearchTerm] = useState('');
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>('_all');
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('requests');

  useEffect(() => { fetchData(); }, []);

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

  // Filter approved mortgages - uses normalized status for correct matching
  const filteredMortgages = mortgages.filter(m => {
    const matchesSearch = searchTerm === '' ||
      m.creditor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.parcel_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const normalizedStatus = normalizeMortgageStatus(m.mortgage_status);
    const matchesStatus = filterStatus === '_all' || normalizedStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

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

  const processedRequests = requests.filter(r => {
    const isProcessed = r.status === 'approved' || r.status === 'rejected' || r.status === 'returned';
    const matchesSearch = historySearchTerm === '' ||
      r.parcel_number?.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
      r.mortgage_history[0]?.request_reference_number?.toLowerCase().includes(historySearchTerm.toLowerCase());
    return isProcessed && matchesSearch;
  });

  const pagination = usePagination(filteredMortgages, { initialPageSize: 15 });
  const requestsPagination = usePagination(pendingRequests, { initialPageSize: 15 });
  const historyPagination = usePagination(processedRequests, { initialPageSize: 15 });

  const activeCount = mortgages.filter(m => normalizeMortgageStatus(m.mortgage_status) === 'active').length;
  const paidCount = mortgages.filter(m => normalizeMortgageStatus(m.mortgage_status) === 'paid').length;
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const totalAmount = mortgages.filter(m => normalizeMortgageStatus(m.mortgage_status) === 'active').reduce((sum, m) => sum + (m.mortgage_amount_usd || 0), 0);

  const handleApproveClick = (request: MortgageRequest) => {
    setPendingApproveRequest(request);
    setApproveConfirmOpen(true);
  };

  const handleApproveConfirmed = async () => {
    if (!pendingApproveRequest) return;
    const request = pendingApproveRequest;
    setProcessingAction(true);
    try {
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

      if (request.contribution_type === 'mortgage_registration' && request.original_parcel_id) {
        const refNumber = generateMortgageReference('HYP');
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

      if (request.contribution_type === 'mortgage_cancellation' && mortgage.mortgage_reference_number) {
        await supabase
          .from('cadastral_mortgages')
          .update({ mortgage_status: 'paid' })
          .eq('reference_number', mortgage.mortgage_reference_number.toUpperCase());
      }

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

  // Return to user for correction
  const handleReturn = async () => {
    if (!selectedRequest || !returnReason.trim()) {
      toast.error('Veuillez indiquer les corrections attendues');
      return;
    }
    setProcessingAction(true);
    try {
      const { error } = await supabase
        .from('cadastral_contributions')
        .update({
          status: 'returned' as any,
          rejection_reason: returnReason.trim(),
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id || null,
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      try {
        await supabase.from('audit_logs').insert({
          action: 'mortgage_request_returned',
          user_id: user?.id || null,
          record_id: selectedRequest.id,
          table_name: 'cadastral_contributions',
          new_values: { parcel_number: selectedRequest.parcel_number, status: 'returned', reason: returnReason.trim() } as any,
        });
      } catch { /* Non-blocking */ }

      toast.success('Demande renvoyée pour correction');
      setReturnDialogOpen(false);
      setRequestDetailsOpen(false);
      setReturnReason('');
      fetchData();
    } catch (error) {
      console.error('Return error:', error);
      toast.error('Erreur lors du renvoi');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleReturnClick = (request: MortgageRequest) => {
    setSelectedRequest(request);
    setReturnDialogOpen(true);
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

      <MortgageStatsCards
        activeCount={activeCount}
        paidCount={paidCount}
        pendingCount={pendingCount}
        totalAmount={totalAmount}
        onTabChange={setActiveTab}
      />

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
            <h3 className="text-xs font-semibold mb-3">Demandes en attente ({pendingRequests.length})</h3>
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
                  {requestsPagination.paginatedData.map((req) => (
                    <MortgageRequestCard
                      key={req.id}
                      request={req}
                      processingAction={processingAction}
                      onView={() => { setSelectedRequest(req); setRequestDetailsOpen(true); }}
                      onApprove={() => handleApproveClick(req)}
                      onReject={() => { setSelectedRequest(req); setRejectDialogOpen(true); }}
                      onReturn={() => handleReturnClick(req)}
                    />
                  ))}
                </div>
                {requestsPagination.totalPages > 1 && (
                  <div className="mt-4">
                    <PaginationControls currentPage={requestsPagination.currentPage} totalPages={requestsPagination.totalPages} pageSize={requestsPagination.pageSize} totalItems={requestsPagination.totalItems} hasPreviousPage={requestsPagination.hasPreviousPage} hasNextPage={requestsPagination.hasNextPage} onPageChange={requestsPagination.goToPage} onPageSizeChange={requestsPagination.changePageSize} onNextPage={requestsPagination.goToNextPage} onPreviousPage={requestsPagination.goToPreviousPage} />
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
                  <SelectItem value="en_defaut">En défaut</SelectItem>
                  <SelectItem value="renegociee">Renégociées</SelectItem>
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

        {/* HISTORY TAB */}
        <TabsContent value="history" className="mt-3">
          <Card className="p-2.5 bg-background rounded-xl shadow-sm border mb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={historySearchTerm} onChange={(e) => { setHistorySearchTerm(e.target.value); historyPagination.goToPage(1); }} placeholder="Rechercher par parcelle ou référence..." className="h-8 text-xs pl-8" />
            </div>
          </Card>

          <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
            <h3 className="text-xs font-semibold mb-3">Historique des demandes traitées ({processedRequests.length})</h3>
            {processedRequests.length === 0 ? (
              <div className="text-center py-8"><p className="text-xs text-muted-foreground">Aucune demande traitée</p></div>
            ) : (
              <>
                <div className="space-y-2">
                  {historyPagination.paginatedData.map((req) => (
                    <div key={req.id} className="p-2.5 rounded-xl border bg-card">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
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
                      {req.status === 'returned' && req.rejection_reason && (
                        <p className="text-[10px] text-amber-600 mt-1">Corrections demandées: {req.rejection_reason}</p>
                      )}
                    </div>
                  ))}
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

      {/* Dialogs */}
      <MortgageDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} mortgage={selectedMortgage} />

      <MortgageRequestDetailsDialog
        open={requestDetailsOpen}
        onOpenChange={setRequestDetailsOpen}
        request={selectedRequest}
        processingAction={processingAction}
        onApprove={handleApproveClick}
        onReject={() => setRejectDialogOpen(true)}
        onReturn={handleReturnClick}
      />

      <ApproveConfirmDialog
        open={approveConfirmOpen}
        onOpenChange={setApproveConfirmOpen}
        request={pendingApproveRequest}
        processingAction={processingAction}
        onConfirm={handleApproveConfirmed}
        onCancel={() => { setApproveConfirmOpen(false); setPendingApproveRequest(null); }}
      />

      <RejectDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        processingAction={processingAction}
        onConfirm={handleReject}
        onCancel={() => { setRejectDialogOpen(false); setRejectionReason(''); }}
      />

      <ReturnDialog
        open={returnDialogOpen}
        onOpenChange={setReturnDialogOpen}
        returnReason={returnReason}
        setReturnReason={setReturnReason}
        processingAction={processingAction}
        onConfirm={handleReturn}
        onCancel={() => { setReturnDialogOpen(false); setReturnReason(''); }}
      />
    </div>
  );
};

export default AdminMortgages;
