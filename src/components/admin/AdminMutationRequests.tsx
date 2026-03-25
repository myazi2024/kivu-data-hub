import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  FileEdit, Search, Eye, CheckCircle, XCircle, 
  Loader2, RefreshCw, DollarSign, MapPin, User, Calendar,
  Settings, Plus, Trash2, Edit2, Save, Download, RotateCcw
} from 'lucide-react';
import { generateAndUploadCertificate } from '@/utils/certificateService';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { exportToCSV } from '@/utils/csvExport';
import { getMutationTypeLabel, MUTATION_TYPES, MUTATION_STATUS_LABELS } from '@/components/cadastral/mutation/MutationConstants';

import type { MutationFee, MutationRequest, MutationRequestWithProfile } from '@/types/mutation';

const AdminMutationRequests: React.FC = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState<MutationRequestWithProfile[]>([]);
  const [fees, setFees] = useState<MutationFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('_all');
  const [typeFilter, setTypeFilter] = useState<string>('_all');
  
  // Dialog states
  const [selectedRequest, setSelectedRequest] = useState<MutationRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [showFeeDialog, setShowFeeDialog] = useState(false);
  const [editingFee, setEditingFee] = useState<MutationFee | null>(null);
  
  // Process form
  const [processAction, setProcessAction] = useState<'approve' | 'reject' | 'hold' | 'return'>('approve');
  const [processingNotes, setProcessingNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Fee form
  const [feeName, setFeeName] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [feeDescription, setFeeDescription] = useState('');
  const [feeMandatory, setFeeMandatory] = useState(true);


  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mutation_requests')
        .select(`
          *,
          profiles:user_id (full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as unknown as MutationRequestWithProfile[]);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const fetchFees = async () => {
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
  };

  useEffect(() => {
    fetchRequests();
    fetchFees();
  }, []);

  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      const refNum = request.reference_number || '';
      const matchesSearch = 
        refNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.parcel_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.requester_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === '_all' || request.status === statusFilter;
      const matchesType = typeFilter === '_all' || request.mutation_type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [requests, searchQuery, statusFilter, typeFilter]);

  const pagination = usePagination(filteredRequests, { initialPageSize: 15 });

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

  const safeProposedChanges = (request: MutationRequest | null) => {
    if (!request?.proposed_changes) return {} as Record<string, any>;
    return request.proposed_changes;
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
          {/* Stats - all statuses */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground">En attente</div>
                <div className="text-xl font-bold text-orange-600">{stats.pending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground">Approuvées</div>
                <div className="text-xl font-bold text-green-600">{stats.approved}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground">Rejetées</div>
                <div className="text-xl font-bold text-destructive">{stats.rejected}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground">Annulées</div>
                <div className="text-xl font-bold text-muted-foreground">{stats.cancelled}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground">Suspendues</div>
                <div className="text-xl font-bold text-amber-600">{stats.onHold}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground">Revenus</div>
                <div className="text-xl font-bold text-primary">${stats.revenue.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters - with type filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px] h-9">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tous statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="in_review">En cours</SelectItem>
                <SelectItem value="approved">Approuvée</SelectItem>
                <SelectItem value="rejected">Rejetée</SelectItem>
                <SelectItem value="on_hold">Suspendue</SelectItem>
                <SelectItem value="cancelled">Annulée</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[150px] h-9">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tous types</SelectItem>
                {MUTATION_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configuration des frais
                </CardTitle>
                <Button 
                  size="sm" 
                  onClick={() => {
                    resetFeeForm();
                    setShowFeeDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Active fees */}
                {fees.filter(f => f.is_active).map((fee) => (
                  <div 
                    key={fee.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{fee.fee_name}</span>
                        {fee.is_mandatory && (
                          <Badge variant="secondary" className="text-[10px]">Obligatoire</Badge>
                        )}
                      </div>
                      {fee.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{fee.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">${Number(fee.amount_usd).toFixed(2)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => openEditFee(fee)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={() => handleToggleFeeActive(fee.id, true)}
                        title="Désactiver"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Inactive fees — reactivation */}
                {fees.filter(f => !f.is_active).length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <p className="text-xs font-medium text-muted-foreground">Frais désactivés</p>
                    {fees.filter(f => !f.is_active).map((fee) => (
                      <div 
                        key={fee.id}
                        className="flex items-center justify-between p-3 border rounded-lg opacity-60"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm line-through">{fee.fee_name}</span>
                            <Badge variant="outline" className="text-[10px]">Inactif</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-sm">${Number(fee.amount_usd).toFixed(2)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-green-600"
                            onClick={() => handleToggleFeeActive(fee.id, false)}
                            title="Réactiver"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Détails de la demande</DialogTitle>
          </DialogHeader>
          {selectedRequest && (() => {
            const changes = safeProposedChanges(selectedRequest);
            return (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Référence</Label>
                    <p className="font-mono font-bold">{selectedRequest.reference_number || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Parcelle</Label>
                    <p className="font-mono">{selectedRequest.parcel_number}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Type de mutation</Label>
                  <p className="font-medium">{getMutationTypeLabel(selectedRequest.mutation_type)}</p>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Demandeur</Label>
                  <p className="font-medium">{selectedRequest.requester_name}</p>
                  {selectedRequest.requester_email && (
                    <p className="text-xs text-muted-foreground">{selectedRequest.requester_email}</p>
                  )}
                  {selectedRequest.requester_phone && (
                    <p className="text-xs text-muted-foreground">{selectedRequest.requester_phone}</p>
                  )}
                </div>

                {selectedRequest.beneficiary_name && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Bénéficiaire</Label>
                    <p className="font-medium">{selectedRequest.beneficiary_name}</p>
                  </div>
                )}

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Modifications demandées</Label>
                  <p className="text-sm mt-1">
                    {changes.description || 'Non spécifié'}
                  </p>
                </div>

                {selectedRequest.justification && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Justification</Label>
                    <p className="text-sm mt-1">{selectedRequest.justification}</p>
                  </div>
                )}

                {/* Documents joints — read from column first, fallback to JSON */}
                {(() => {
                  const docs = Array.isArray(selectedRequest.supporting_documents) && selectedRequest.supporting_documents.length > 0
                    ? selectedRequest.supporting_documents
                    : Array.isArray(changes.supporting_documents) ? changes.supporting_documents : [];
                  if (docs.length === 0) return null;
                  return (
                    <div>
                      <Label className="text-xs text-muted-foreground">Documents joints</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {docs.map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                            Document {i + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Certificat d'expertise — read from columns first, fallback to JSON */}
                {(() => {
                  const certUrl = selectedRequest.expertise_certificate_url || changes.expertise_certificate_url;
                  const marketVal = selectedRequest.market_value_usd ?? changes.market_value_usd;
                  const certDate = selectedRequest.expertise_certificate_date || changes.expertise_certificate_date;
                  if (!certUrl) return null;
                  return (
                    <div>
                      <Label className="text-xs text-muted-foreground">Certificat d'expertise</Label>
                      <div className="mt-1 space-y-1">
                        <a href={certUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline block">
                          Voir le certificat
                        </a>
                        {marketVal && (
                          <p className="text-xs">Valeur vénale: <strong>${Number(marketVal).toLocaleString()}</strong></p>
                        )}
                        {certDate && (
                          <p className="text-xs text-muted-foreground">Date: {certDate}</p>
                        )}
                        {selectedRequest.title_age && (
                          <p className="text-xs text-muted-foreground">Ancienneté titre: {selectedRequest.title_age === '10_or_more' ? '≥ 10 ans' : '< 10 ans'}</p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <Separator />

                {/* Décomposition des frais */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground font-semibold">Détail des frais</Label>
                  
                  {Array.isArray(selectedRequest.fee_items) && selectedRequest.fee_items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span>{item.fee_name}</span>
                      <span className="font-mono">${Number(item.amount_usd).toFixed(2)}</span>
                    </div>
                  ))}

                  {/* Mutation fees — columns first, fallback JSON */}
                  {(() => {
                    const mutFee = selectedRequest.mutation_fee_amount ?? changes.mutation_fees?.mutation_fee;
                    const bankFee = selectedRequest.bank_fee_amount ?? changes.mutation_fees?.bank_fee;
                    if (!mutFee) return null;
                    return (
                      <>
                        <div className="flex justify-between text-xs">
                          <span>Frais de mutation</span>
                          <span className="font-mono">${Number(mutFee).toFixed(2)}</span>
                        </div>
                        {Number(bankFee) > 0 && (
                          <div className="flex justify-between text-xs">
                            <span>Frais bancaires</span>
                            <span className="font-mono">${Number(bankFee).toFixed(2)}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* Late fees — columns first, fallback JSON */}
                  {(() => {
                    const lateFee = selectedRequest.late_fee_amount ?? changes.late_fees?.fee;
                    const lateDays = selectedRequest.late_fee_days ?? changes.late_fees?.days;
                    if (!lateFee) return null;
                    return (
                      <div className="flex justify-between text-xs text-orange-600">
                        <span>Retard ({lateDays}j)</span>
                        <span className="font-mono">${Number(lateFee).toFixed(2)}</span>
                      </div>
                    );
                  })()}

                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Total</span>
                    <span className="text-lg font-bold text-primary">${Number(selectedRequest.total_amount_usd).toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <Label className="text-xs text-muted-foreground">Paiement</Label>
                  <div className="mt-1">
                    {(() => {
                      const badge = getPaymentBadge(selectedRequest.payment_status);
                      return <Badge variant={badge.variant}>{badge.label}</Badge>;
                    })()}
                  </div>
                </div>
              </div>
            </ScrollArea>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Process Dialog */}
      <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Traiter la demande</DialogTitle>
            <DialogDescription className="text-xs">
              {selectedRequest?.reference_number || '-'} — {selectedRequest ? getMutationTypeLabel(selectedRequest.mutation_type) : ''} — Parcelle {selectedRequest?.parcel_number}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              {/* Quick context */}
              <Card className="bg-muted/50 border-0">
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Demandeur</span>
                    <span className="font-medium">{selectedRequest.requester_name}</span>
                  </div>
                  {selectedRequest.beneficiary_name && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Bénéficiaire</span>
                      <span className="font-medium">{selectedRequest.beneficiary_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Montant payé</span>
                    <span className="font-bold text-primary">${Number(selectedRequest.total_amount_usd).toFixed(2)}</span>
                  </div>
                  {selectedRequest.proposed_changes && (selectedRequest.proposed_changes as any).market_value_usd && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Valeur vénale</span>
                      <span>${Number((selectedRequest.proposed_changes as any).market_value_usd).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedRequest.justification && (
                    <div className="pt-1 border-t">
                      <span className="text-[10px] text-muted-foreground">Justification :</span>
                      <p className="text-xs mt-0.5">{selectedRequest.justification}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label className="text-xs">Action</Label>
                <Select value={processAction} onValueChange={(v: any) => setProcessAction(v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approve">Approuver</SelectItem>
                    <SelectItem value="reject">Rejeter</SelectItem>
                    <SelectItem value="hold">Mettre en attente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {processAction === 'reject' && (
                <div className="space-y-2">
                  <Label className="text-xs">Motif du rejet *</Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Indiquez le motif du rejet..."
                    className="min-h-[80px]"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs">Notes de traitement</Label>
                <Textarea
                  value={processingNotes}
                  onChange={(e) => setProcessingNotes(e.target.value)}
                  placeholder="Notes internes..."
                  className="min-h-[60px]"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProcessDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleProcessRequest}
              disabled={processing || (processAction === 'reject' && !rejectionReason.trim())}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fee Dialog */}
      <Dialog open={showFeeDialog} onOpenChange={setShowFeeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editingFee ? 'Modifier le frais' : 'Ajouter un frais'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Nom du frais *</Label>
              <Input
                value={feeName}
                onChange={(e) => setFeeName(e.target.value)}
                placeholder="Ex: Frais de dossier"
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Montant (USD) *</Label>
              <Input
                type="number"
                value={feeAmount}
                onChange={(e) => setFeeAmount(e.target.value)}
                placeholder="25.00"
                className="h-9"
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={feeDescription}
                onChange={(e) => setFeeDescription(e.target.value)}
                placeholder="Description optionnelle..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="mandatory"
                checked={feeMandatory}
                onCheckedChange={(checked) => setFeeMandatory(!!checked)}
              />
              <Label htmlFor="mandatory" className="text-xs cursor-pointer">
                Frais obligatoire
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeeDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveFee}>
              <Save className="h-4 w-4 mr-1" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMutationRequests;
