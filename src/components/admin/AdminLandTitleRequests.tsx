import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveTable,
  ResponsiveTableHeader,
  ResponsiveTableBody,
  ResponsiveTableRow,
  ResponsiveTableCell,
  ResponsiveTableHead,
} from '@/components/ui/responsive-table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, Search, Eye, CheckCircle, Loader2, RefreshCw, MapPin, Download } from 'lucide-react';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { usePagination } from '@/hooks/usePagination';
import { StatusBadge, StatusType } from '@/components/shared/StatusBadge';
import { generateAndUploadCertificate } from '@/utils/certificateService';
import { exportToCSV } from '@/utils/csvExport';
import { LandTitleRequestRow, getRequestFullName, getRequestLocation, ADMIN_LIST_COLUMNS } from '@/types/landTitleRequest';
import LandTitleDetailsDialog from './land-title/LandTitleDetailsDialog';
import LandTitleProcessDialog, { ProcessAction } from './land-title/LandTitleProcessDialog';

const AdminLandTitleRequests: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LandTitleRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('_all');
  const [paymentFilter, setPaymentFilter] = useState<string>('_all');
  
  // Dialog states
  const [selectedRequest, setSelectedRequest] = useState<LandTitleRequestRow | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  
  // Process form
  const [processAction, setProcessAction] = useState<ProcessAction>('approve');
  const [processingNotes, setProcessingNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Full detail for selected request (lazy loaded)
  const [detailData, setDetailData] = useState<LandTitleRequestRow | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      // Only fetch needed columns for list view
      const { data, error } = await supabase
        .from('land_title_requests')
        .select(ADMIN_LIST_COLUMNS)
        .not('reference_number', 'ilike', 'TEST-%')
        .order('created_at', { ascending: false })
        .limit(2000);

      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = [...new Set((data || []).map(r => r.user_id).filter(Boolean))];
      let profilesData: any[] = [];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        profilesData = profiles || [];
      }

      const combinedData = (data || []).map(request => ({
        ...request,
        profiles: profilesData.find(p => p.user_id === request.user_id) || null
      }));

      setRequests(combinedData as LandTitleRequestRow[]);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  // Fetch full detail when viewing a request
  const fetchDetail = async (id: string) => {
    const { data, error } = await supabase
      .from('land_title_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (!error && data) setDetailData(data as LandTitleRequestRow);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filteredRequests = useMemo(() => requests.filter(request => {
    const matchesSearch = 
      request.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requester_first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requester_last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.province.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === '_all' || request.status === statusFilter;
    const matchesPayment = paymentFilter === '_all' || request.payment_status === paymentFilter;
    
    return matchesSearch && matchesStatus && matchesPayment;
  }), [requests, searchQuery, statusFilter, paymentFilter]);

  const pagination = usePagination(filteredRequests, { initialPageSize: 15 });

  const handleProcessRequest = async () => {
    if (!selectedRequest || !user) return;

    // Server-side guard: prevent approval if not paid
    if (processAction === 'approve' && selectedRequest.payment_status !== 'paid') {
      toast.error('Impossible d\'approuver une demande non payée');
      return;
    }

    setProcessing(true);
    try {
      let newStatus: string;
      switch (processAction) {
        case 'approve': newStatus = 'approved'; break;
        case 'reject': newStatus = 'rejected'; break;
        case 'in_review': newStatus = 'in_review'; break;
        default: newStatus = 'pending';
      }

      const { error } = await supabase
        .from('land_title_requests')
        .update({
          status: newStatus,
          processing_notes: processingNotes || null,
          rejection_reason: processAction === 'reject' ? rejectionReason : null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // Auto-generate certificate on approval
      if (processAction === 'approve') {
        toast.info('Génération automatique du certificat...');
        const fullName = getRequestFullName(selectedRequest);
        const certResult = await generateAndUploadCertificate(
          'titre_foncier',
          {
            referenceNumber: selectedRequest.reference_number,
            recipientName: fullName,
            recipientEmail: selectedRequest.requester_email || undefined,
            parcelNumber: `${selectedRequest.province}/${selectedRequest.commune || selectedRequest.territoire || ''}`,
            issueDate: new Date().toISOString(),
            approvedBy: 'Bureau d\'Information Cadastrale',
            additionalData: { requestId: selectedRequest.id },
          },
          [
            { label: 'Province:', value: selectedRequest.province },
            { label: 'Localisation:', value: getRequestLocation(selectedRequest) },
            { label: 'Surface:', value: selectedRequest.area_sqm ? `${selectedRequest.area_sqm} m²` : 'N/A' },
            { label: 'Type:', value: selectedRequest.section_type === 'urbaine' ? 'Urbain' : 'Rural' },
            { label: 'Montant payé:', value: `$${selectedRequest.total_amount_usd}` },
          ],
          user.id
        );
        if (certResult) {
          toast.success('Certificat de titre foncier généré automatiquement');
        }
      }

      // Create notification for user
      await supabase.from('notifications').insert({
        user_id: selectedRequest.user_id,
        type: processAction === 'approve' ? 'success' : processAction === 'reject' ? 'error' : 'info',
        title: `Demande de titre foncier ${processAction === 'approve' ? 'approuvée' : processAction === 'reject' ? 'rejetée' : 'en cours d\'examen'}`,
        message: processAction === 'approve' 
          ? `Votre demande ${selectedRequest.reference_number} a été approuvée. Le certificat est disponible dans votre espace.`
          : `Votre demande ${selectedRequest.reference_number} a été ${processAction === 'reject' ? 'rejetée' : 'mise en cours d\'examen'}.`,
        action_url: '/user-dashboard?tab=land-titles'
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

  const getPaymentBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'warning', label: 'Non payé' },
      paid: { variant: 'success', label: 'Payé' },
      failed: { variant: 'destructive', label: 'Échoué' },
      cancelled: { variant: 'outline', label: 'Annulé' }
    };
    const config = statusMap[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant} className="text-[10px]">{config.label}</Badge>;
  };

  // Stats (memoized)
  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    inReview: requests.filter(r => r.status === 'in_review').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    paid: requests.filter(r => r.payment_status === 'paid').length,
    revenue: requests.filter(r => r.payment_status === 'paid').reduce((sum, r) => sum + r.total_amount_usd, 0)
  }), [requests]);

  const handleExportCSV = () => {
    exportToCSV({
      filename: `titres-fonciers-${format(new Date(), 'yyyy-MM-dd')}.csv`,
      headers: ['Référence', 'Demandeur', 'Province', 'Zone', 'Montant USD', 'Paiement', 'Statut', 'Date'],
      data: filteredRequests.map(r => [
        r.reference_number,
        getRequestFullName(r),
        r.province,
        r.section_type === 'urbaine' ? 'Urbaine' : 'Rurale',
        r.total_amount_usd,
        r.payment_status,
        r.status,
        format(new Date(r.created_at), 'dd/MM/yyyy')
      ])
    });
    toast.success('Export CSV réussi');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Demandes de Titres Fonciers
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs">
            <Download className="h-3.5 w-3.5 mr-1" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchRequests} className="text-xs">
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          { label: 'Total', value: stats.total, color: '' },
          { label: 'En attente', value: stats.pending, color: 'text-orange-600' },
          { label: 'En examen', value: stats.inReview, color: 'text-blue-600' },
          { label: 'Approuvées', value: stats.approved, color: 'text-green-600' },
          { label: 'Rejetées', value: stats.rejected, color: 'text-red-600' },
          { label: 'Payées', value: stats.paid, color: 'text-emerald-600' },
          { label: 'Revenus', value: `$${stats.revenue.toFixed(0)}`, color: 'text-primary' },
        ].map(s => (
          <Card key={s.label} className="rounded-xl">
            <CardContent className="p-3">
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par référence, nom, province..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm rounded-xl"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px] h-9 rounded-xl">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="_all" className="rounded-lg">Tous les statuts</SelectItem>
            <SelectItem value="pending" className="rounded-lg">En attente</SelectItem>
            <SelectItem value="in_review" className="rounded-lg">En examen</SelectItem>
            <SelectItem value="approved" className="rounded-lg">Approuvée</SelectItem>
            <SelectItem value="rejected" className="rounded-lg">Rejetée</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-full sm:w-[140px] h-9 rounded-xl">
            <SelectValue placeholder="Paiement" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="_all" className="rounded-lg">Tous</SelectItem>
            <SelectItem value="pending" className="rounded-lg">Non payé</SelectItem>
            <SelectItem value="paid" className="rounded-lg">Payé</SelectItem>
            <SelectItem value="failed" className="rounded-lg">Échoué</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="rounded-2xl">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Aucune demande de titre foncier</p>
              <p className="text-xs">Les demandes apparaîtront ici</p>
            </div>
          ) : (
            <>
              <ResponsiveTable>
                <ResponsiveTableHeader>
                  <ResponsiveTableRow>
                    <ResponsiveTableHead priority="high">Référence</ResponsiveTableHead>
                    <ResponsiveTableHead priority="medium">Demandeur</ResponsiveTableHead>
                    <ResponsiveTableHead priority="low">Localisation</ResponsiveTableHead>
                    <ResponsiveTableHead priority="medium">Montant</ResponsiveTableHead>
                    <ResponsiveTableHead priority="high">Paiement</ResponsiveTableHead>
                    <ResponsiveTableHead priority="high">Statut</ResponsiveTableHead>
                    <ResponsiveTableHead priority="low">Date</ResponsiveTableHead>
                    <ResponsiveTableHead priority="high">Actions</ResponsiveTableHead>
                  </ResponsiveTableRow>
                </ResponsiveTableHeader>
                <ResponsiveTableBody>
                  {pagination.paginatedData.map(request => (
                    <ResponsiveTableRow key={request.id}>
                      <ResponsiveTableCell priority="high" label="Référence">
                        <span className="font-mono text-xs font-semibold">{request.reference_number}</span>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell priority="medium" label="Demandeur">
                        <div>
                          <div className="text-xs font-medium">{getRequestFullName(request)}</div>
                          <div className="text-[10px] text-muted-foreground">{request.requester_phone}</div>
                        </div>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell priority="low" label="Localisation">
                        <div className="text-xs">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {request.province}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                            {getRequestLocation(request)}
                          </div>
                        </div>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell priority="medium" label="Montant">
                        <span className="text-xs font-semibold">${request.total_amount_usd}</span>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell priority="high" label="Paiement">
                        {getPaymentBadge(request.payment_status)}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell priority="high" label="Statut">
                        <StatusBadge status={request.status as StatusType} compact />
                      </ResponsiveTableCell>
                      <ResponsiveTableCell priority="low" label="Date">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(request.created_at), 'dd/MM/yy', { locale: fr })}
                        </span>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell priority="high" label="Actions">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              setSelectedRequest(request);
                              fetchDetail(request.id);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {request.payment_status === 'paid' && (request.status === 'pending' || request.status === 'in_review') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-primary"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowProcessDialog(true);
                              }}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </ResponsiveTableCell>
                    </ResponsiveTableRow>
                  ))}
                </ResponsiveTableBody>
              </ResponsiveTable>
              
              {pagination.totalItems > 0 && (
                <div className="p-3 border-t">
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
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <LandTitleDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        selectedRequest={selectedRequest}
        detailData={detailData}
        getPaymentBadge={getPaymentBadge}
      />

      <LandTitleProcessDialog
        open={showProcessDialog}
        onOpenChange={setShowProcessDialog}
        selectedRequest={selectedRequest}
        processAction={processAction}
        setProcessAction={setProcessAction}
        processingNotes={processingNotes}
        setProcessingNotes={setProcessingNotes}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        processing={processing}
        onConfirm={handleProcessRequest}
      />
    </div>
  );
};

export default AdminLandTitleRequests;
