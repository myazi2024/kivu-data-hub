import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import MutationStatsCards from './mutation/MutationStatsCards';
import MutationFilters from './mutation/MutationFilters';
import MutationFeesConfig from './mutation/MutationFeesConfig';
import MutationDetailsDialog from './mutation/MutationDetailsDialog';
import MutationProcessDialog, { type MutationProcessAction } from './mutation/MutationProcessDialog';
import MutationFeeFormDialog from './mutation/MutationFeeFormDialog';
import {
  ResponsiveTable,
  ResponsiveTableHeader,
  ResponsiveTableBody,
  ResponsiveTableRow,
  ResponsiveTableCell,
  ResponsiveTableHead
} from '@/components/ui/responsive-table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FileEdit, Eye, CheckCircle, RefreshCw, Download, Loader2, PlayCircle, AlertTriangle
} from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { exportToCSV } from '@/utils/csvExport';
import { getMutationTypeLabel, MUTATION_TYPES, MUTATION_STATUS_LABELS } from '@/components/cadastral/mutation/MutationConstants';
import { useAdminAnalytics } from '@/lib/adminAnalytics';
import { useMutationProcessing } from '@/hooks/useMutationProcessing';
import { useDebounce } from '@/hooks/useDebounce';
import { escapeIlike } from '@/utils/escapeIlike';

import type { MutationFee, MutationRequest, MutationRequestWithProfile } from '@/types/mutation';

const AdminMutationRequests: React.FC = () => {
  const { user, profile } = useAuth();
  const { trackAdminAction } = useAdminAnalytics();
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState<MutationRequestWithProfile[]>([]);
  const [fees, setFees] = useState<MutationFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<string>('_all');
  const [typeFilter, setTypeFilter] = useState<string>('_all');

  // Dialog states
  const [selectedRequest, setSelectedRequest] = useState<MutationRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [showFeeDialog, setShowFeeDialog] = useState(false);
  const [editingFee, setEditingFee] = useState<MutationFee | null>(null);

  // Process form
  const [processAction, setProcessAction] = useState<MutationProcessAction>('approve');
  const [processingNotes, setProcessingNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Confirmation dialogs (AlertDialog replaces window.confirm)
  const [feeToToggle, setFeeToToggle] = useState<MutationFee | null>(null);
  const [requestToTakeCharge, setRequestToTakeCharge] = useState<MutationRequest | null>(null);
  const [takingCharge, setTakingCharge] = useState(false);

  // Fee form
  const [feeName, setFeeName] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [feeDescription, setFeeDescription] = useState('');
  const [feeMandatory, setFeeMandatory] = useState(true);


  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      let q = supabase
        .from('mutation_requests')
        .select(`
          *,
          profiles:user_id (full_name, email)
        `)
        .not('reference_number', 'ilike', 'TEST-%');

      // Server-side filters
      if (statusFilter !== '_all') q = q.eq('status', statusFilter);
      if (typeFilter !== '_all') q = q.eq('mutation_type', typeFilter);

      const term = debouncedSearch.trim();
      if (term.length > 0) {
        const safe = escapeIlike(term);
        q = q.or(
          `reference_number.ilike.%${safe}%,parcel_number.ilike.%${safe}%,requester_name.ilike.%${safe}%`
        );
      }

      const { data, error } = await q
        .order('created_at', { ascending: false })
        .limit(2000);

      if (error) throw error;
      setRequests((data || []) as unknown as MutationRequestWithProfile[]);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, typeFilter]);

  const fetchFees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('mutation_fees_config')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setFees((data || []) as MutationFee[]);
    } catch (error) {
      console.error('Error fetching fees:', error);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  useEffect(() => { fetchFees(); }, [fetchFees]);

  // Server-side filters already applied; only pagination is local now.
  const filteredRequests = requests;
  const pagination = usePagination(filteredRequests, { initialPageSize: 15 });

  // Mutation processing hook (RPC-backed)
  const { processing, takeCharge, processDecision } = useMutationProcessing(fetchRequests);

  const handleExportCSV = () => {
    exportToCSV({
      filename: `mutations_${format(new Date(), 'yyyy-MM-dd')}.csv`,
      headers: ['Référence', 'Parcelle', 'Type', 'Demandeur', 'Montant USD', 'Paiement', 'Statut', 'Date'],
      data: filteredRequests.map(r => [
        r.reference_number || '-',
        r.parcel_number,
        getMutationTypeLabel(r.mutation_type),
        r.requester_name,
        Number(r.total_amount_usd).toFixed(2),
        r.payment_status === 'paid' ? 'Payé' : 'Non payé',
        MUTATION_STATUS_LABELS[r.status] || r.status,
        format(new Date(r.created_at), 'dd/MM/yyyy'),
      ])
    });
  };

  const handleProcessRequest = async () => {
    if (!selectedRequest || !user) return;

    // Server-side validation: only process paid requests
    if (selectedRequest.payment_status !== 'paid') {
      toast.error('Impossible de traiter une demande non payée.');
      return;
    }

    // FIX: Validate rejection reason is not just whitespace
    if (processAction === 'reject' && !rejectionReason.trim()) {
      toast.error('Veuillez indiquer un motif de rejet valide.');
      return;
    }

    setProcessing(true);
    try {
      let newStatus: string;
      switch (processAction) {
        case 'approve': newStatus = 'approved'; break;
        case 'reject': newStatus = 'rejected'; break;
        case 'hold': newStatus = 'on_hold'; break;
        case 'return': newStatus = 'returned'; break;
        default: newStatus = 'pending';
      }

      const adminName = profile?.full_name || user.email || 'Admin';

      const { error } = await supabase
        .from('mutation_requests')
        .update({
          status: newStatus,
          processing_notes: processingNotes.trim() || null,
          rejection_reason: processAction === 'reject' ? rejectionReason.trim() : null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // Audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        admin_name: adminName,
        action: `mutation_request_${processAction}`,
        table_name: 'mutation_requests',
        record_id: selectedRequest.id,
        old_values: { status: selectedRequest.status },
        new_values: { 
          status: newStatus, 
          processing_notes: processingNotes.trim() || null,
          rejection_reason: processAction === 'reject' ? rejectionReason.trim() : null
        }
      });

      // Auto-generate certificate on approval
      if (processAction === 'approve') {
        toast.info('Génération automatique du certificat de mutation...');
        const certResult = await generateAndUploadCertificate(
          'mutation_fonciere',
          {
            referenceNumber: selectedRequest.reference_number,
            recipientName: selectedRequest.requester_name,
            recipientEmail: selectedRequest.requester_email || undefined,
            parcelNumber: selectedRequest.parcel_number,
            issueDate: new Date().toISOString(),
            approvedBy: 'Bureau d\'Information Cadastrale',
            additionalData: { requestId: selectedRequest.id },
          },
          [
            { label: 'Type mutation:', value: getMutationTypeLabel(selectedRequest.mutation_type) },
            { label: 'Bénéficiaire:', value: selectedRequest.beneficiary_name || 'N/A' },
            { label: 'Montant payé:', value: `$${Number(selectedRequest.total_amount_usd).toFixed(2)}` },
          ],
          user.id
        );
        if (certResult) {
          toast.success('Certificat de mutation généré automatiquement');
        }
      }

      // Create notification for user — include processing notes for on_hold
      const notificationMessage = processAction === 'approve'
        ? `Votre demande ${selectedRequest.reference_number} a été approuvée. Le certificat est disponible dans votre espace.`
        : processAction === 'reject'
          ? `Votre demande ${selectedRequest.reference_number} a été rejetée. Motif : ${rejectionReason.trim()}`
          : processAction === 'return'
            ? `Votre demande ${selectedRequest.reference_number} a été renvoyée pour correction.${processingNotes.trim() ? ` Motif : ${processingNotes.trim()}` : ' Veuillez vérifier et corriger votre demande.'}`
            : `Votre demande ${selectedRequest.reference_number} a été mise en attente.${processingNotes.trim() ? ` Raison : ${processingNotes.trim()}` : ' Veuillez patienter.'}`;

      await supabase.from('notifications').insert({
        user_id: selectedRequest.user_id,
        type: processAction === 'approve' ? 'success' : processAction === 'reject' ? 'error' : processAction === 'return' ? 'info' : 'warning',
        title: `Demande de mutation ${processAction === 'approve' ? 'approuvée' : processAction === 'reject' ? 'rejetée' : processAction === 'return' ? 'renvoyée pour correction' : 'mise en attente'}`,
        message: notificationMessage,
        action_url: '/user-dashboard?tab=mutations'
      });

      toast.success('Demande traitée avec succès');

      trackAdminAction({
        module: 'mutation',
        action: processAction,
        ref: { request_id: selectedRequest.id, reference_number: selectedRequest.reference_number },
      });

      setShowProcessDialog(false);
      setProcessingNotes('');
      setRejectionReason('');
      fetchRequests();
    } catch (error) {
      console.error('Error processing request:', error);
      toast.error('Erreur lors du traitement');
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveFee = async () => {
    if (!feeName.trim()) {
      toast.error('Veuillez remplir le nom du frais');
      return;
    }
    const parsedAmount = parseFloat(feeAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Le montant doit être un nombre positif valide');
      return;
    }

    try {
      const adminName = profile?.full_name || user?.email || 'Admin';

      if (editingFee) {
        const { error } = await supabase
          .from('mutation_fees_config')
          .update({
            fee_name: feeName.trim(),
            amount_usd: parsedAmount,
            description: feeDescription.trim() || null,
            is_mandatory: feeMandatory,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingFee.id);

        if (error) throw error;

        // Audit log for fee modification
        await supabase.from('audit_logs').insert({
          user_id: user?.id,
          admin_name: adminName,
          action: 'mutation_fee_updated',
          table_name: 'mutation_fees_config',
          record_id: editingFee.id,
          old_values: { fee_name: editingFee.fee_name, amount_usd: editingFee.amount_usd, is_mandatory: editingFee.is_mandatory },
          new_values: { fee_name: feeName.trim(), amount_usd: parsedAmount, is_mandatory: feeMandatory }
        });

        toast.success('Frais modifié');
      } else {
        const { data: newFee, error } = await supabase
          .from('mutation_fees_config')
          .insert({
            fee_name: feeName.trim(),
            amount_usd: parsedAmount,
            description: feeDescription.trim() || null,
            is_mandatory: feeMandatory,
            display_order: fees.length + 1
          })
          .select()
          .single();

        if (error) throw error;

        // Audit log for fee creation
        await supabase.from('audit_logs').insert({
          user_id: user?.id,
          admin_name: adminName,
          action: 'mutation_fee_created',
          table_name: 'mutation_fees_config',
          record_id: newFee?.id,
          new_values: { fee_name: feeName.trim(), amount_usd: parsedAmount, is_mandatory: feeMandatory }
        });

        toast.success('Frais ajouté');
      }

      setShowFeeDialog(false);
      resetFeeForm();
      fetchFees();
    } catch (error) {
      console.error('Error saving fee:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleToggleFeeActive = async (feeId: string, currentlyActive: boolean) => {
    const action = currentlyActive ? 'désactiver' : 'réactiver';
    if (!confirm(`Êtes-vous sûr de vouloir ${action} ce frais ?`)) return;

    try {
      const adminName = profile?.full_name || user?.email || 'Admin';

      const { error } = await supabase
        .from('mutation_fees_config')
        .update({ is_active: !currentlyActive, updated_at: new Date().toISOString() })
        .eq('id', feeId);

      if (error) throw error;

      // Audit log for fee activation/deactivation
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        admin_name: adminName,
        action: currentlyActive ? 'mutation_fee_deactivated' : 'mutation_fee_reactivated',
        table_name: 'mutation_fees_config',
        record_id: feeId,
        old_values: { is_active: currentlyActive },
        new_values: { is_active: !currentlyActive }
      });

      toast.success(currentlyActive ? 'Frais désactivé' : 'Frais réactivé');
      fetchFees();
    } catch (error) {
      console.error('Error toggling fee:', error);
      toast.error(`Erreur lors de la ${action}`);
    }
  };

  const resetFeeForm = () => {
    setFeeName('');
    setFeeAmount('');
    setFeeDescription('');
    setFeeMandatory(true);
    setEditingFee(null);
  };

  const openEditFee = (fee: MutationFee) => {
    setEditingFee(fee);
    setFeeName(fee.fee_name);
    setFeeAmount(fee.amount_usd.toString());
    setFeeDescription(fee.description || '');
    setFeeMandatory(fee.is_mandatory);
    setShowFeeDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'warning', label: 'En attente' },
      in_review: { variant: 'info', label: 'En cours' },
      approved: { variant: 'success', label: 'Approuvée' },
      rejected: { variant: 'destructive', label: 'Rejetée' },
      on_hold: { variant: 'secondary', label: 'Suspendue' },
      cancelled: { variant: 'destructive', label: 'Annulée' },
      returned: { variant: 'outline', label: 'À corriger' },
    };
    return statusMap[status] || { variant: 'default', label: status };
  };

  const getPaymentBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'warning', label: 'Non payé' },
      paid: { variant: 'success', label: 'Payé' },
      failed: { variant: 'destructive', label: 'Échoué' }
    };
    return statusMap[status] || { variant: 'default', label: status };
  };

  const columns = [
    {
      key: 'reference_number',
      header: 'Référence',
      priority: 1,
      render: (request: MutationRequest) => (
        <span className="font-mono text-xs font-semibold">{request.reference_number || '-'}</span>
      )
    },
    {
      key: 'parcel_number',
      header: 'Parcelle',
      priority: 2,
      render: (request: MutationRequest) => (
        <span className="font-mono text-xs">{request.parcel_number}</span>
      )
    },
    {
      key: 'mutation_type',
      header: 'Type',
      priority: 3,
      render: (request: MutationRequest) => (
        <span className="text-xs">{getMutationTypeLabel(request.mutation_type)}</span>
      )
    },
    {
      key: 'total_amount_usd',
      header: 'Montant',
      priority: 4,
      render: (request: MutationRequest) => (
        <span className="text-xs font-semibold">${Number(request.total_amount_usd).toFixed(2)}</span>
      )
    },
    {
      key: 'payment_status',
      header: 'Paiement',
      priority: 5,
      render: (request: MutationRequest) => {
        const badge = getPaymentBadge(request.payment_status);
        return <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>;
      }
    },
    {
      key: 'status',
      header: 'Statut',
      priority: 1,
      render: (request: MutationRequest) => {
        const badge = getStatusBadge(request.status);
        return <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>;
      }
    },
    {
      key: 'created_at',
      header: 'Date',
      priority: 6,
      render: (request: MutationRequest) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(request.created_at), 'dd/MM/yy', { locale: fr })}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      priority: 1,
      render: (request: MutationRequest) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => {
              setSelectedRequest(request);
              setShowDetailsDialog(true);
            }}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
           {(request.payment_status === 'paid' && ['in_review', 'on_hold'].includes(request.status)) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                setSelectedRequest(request);
                setShowProcessDialog(true);
              }}
            >
              <CheckCircle className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )
    }
  ];

  // Enhanced stats with all statuses
  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending' || r.status === 'in_review').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    cancelled: requests.filter(r => r.status === 'cancelled').length,
    onHold: requests.filter(r => r.status === 'on_hold').length,
    revenue: requests.filter(r => r.payment_status === 'paid').reduce((sum, r) => sum + Number(r.total_amount_usd), 0)
  }), [requests]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <FileEdit className="h-5 w-5 text-primary" />
          Demandes de mutation
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchRequests}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualiser
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="requests" className="text-xs">Demandes</TabsTrigger>
          <TabsTrigger value="config" className="text-xs">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <MutationStatsCards stats={stats} />

          <MutationFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            typeFilter={typeFilter}
            onTypeChange={setTypeFilter}
          />

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <ResponsiveTable>
                <ResponsiveTableHeader>
                  <ResponsiveTableRow>
                    {columns.map(col => (
                      <ResponsiveTableHead key={col.key} priority={col.priority === 1 ? 'high' : col.priority <= 3 ? 'medium' : 'low'}>
                        {col.header}
                      </ResponsiveTableHead>
                    ))}
                  </ResponsiveTableRow>
                </ResponsiveTableHeader>
                <ResponsiveTableBody>
                  {pagination.paginatedData.map(request => (
                    <ResponsiveTableRow key={request.id}>
                      {columns.map(col => (
                        <ResponsiveTableCell 
                          key={col.key} 
                          priority={col.priority === 1 ? 'high' : col.priority <= 3 ? 'medium' : 'low'}
                          label={col.header}
                        >
                          {col.render(request)}
                        </ResponsiveTableCell>
                      ))}
                    </ResponsiveTableRow>
                  ))}
                </ResponsiveTableBody>
              </ResponsiveTable>

              <PaginationControls
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                totalItems={pagination.totalItems}
                hasNextPage={pagination.hasNextPage}
                hasPreviousPage={pagination.hasPreviousPage}
                onPageChange={pagination.goToPage}
                onPageSizeChange={pagination.changePageSize}
                onNextPage={pagination.goToNextPage}
                onPreviousPage={pagination.goToPreviousPage}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <MutationFeesConfig
            fees={fees}
            onAdd={() => { resetFeeForm(); setShowFeeDialog(true); }}
            onEdit={openEditFee}
            onToggleActive={handleToggleFeeActive}
          />
        </TabsContent>
      </Tabs>

      <MutationDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        request={selectedRequest}
        getPaymentBadge={getPaymentBadge}
      />

      <MutationProcessDialog
        open={showProcessDialog}
        onOpenChange={setShowProcessDialog}
        request={selectedRequest}
        processAction={processAction}
        onActionChange={setProcessAction}
        processingNotes={processingNotes}
        onNotesChange={setProcessingNotes}
        rejectionReason={rejectionReason}
        onRejectionReasonChange={setRejectionReason}
        processing={processing}
        onConfirm={handleProcessRequest}
      />

      <MutationFeeFormDialog
        open={showFeeDialog}
        onOpenChange={setShowFeeDialog}
        editingFee={editingFee}
        feeName={feeName}
        onNameChange={setFeeName}
        feeAmount={feeAmount}
        onAmountChange={setFeeAmount}
        feeDescription={feeDescription}
        onDescriptionChange={setFeeDescription}
        feeMandatory={feeMandatory}
        onMandatoryChange={setFeeMandatory}
        onSave={handleSaveFee}
      />
    </div>
  );
};

export default AdminMutationRequests;
