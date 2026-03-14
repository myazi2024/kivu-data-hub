import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  FileText, Search, Eye, CheckCircle, XCircle, Clock, 
  Loader2, RefreshCw, DollarSign, MapPin, User, Calendar,
  Download, FileCheck, AlertTriangle
} from 'lucide-react';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { usePagination } from '@/hooks/usePagination';
import { StatusBadge, StatusType } from '@/components/shared/StatusBadge';
import { generateAndUploadCertificate } from '@/utils/certificateService';
import { exportToCSV } from '@/utils/csvExport';
import { LandTitleRequestRow, getRequestFullName, getRequestLocation, ADMIN_LIST_COLUMNS } from '@/types/landTitleRequest';

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
  const [processAction, setProcessAction] = useState<'approve' | 'reject' | 'in_review'>('approve');
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
        .order('created_at', { ascending: false });

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

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Demande {selectedRequest?.reference_number}
            </DialogTitle>
            <DialogDescription>
              Détails de la demande de titre foncier
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <StatusBadge status={selectedRequest.status as StatusType} />
                {getPaymentBadge(selectedRequest.payment_status)}
              </div>

              <Tabs defaultValue="requester" className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-auto">
                  <TabsTrigger value="requester" className="text-xs py-2">Demandeur</TabsTrigger>
                  <TabsTrigger value="location" className="text-xs py-2">Localisation</TabsTrigger>
                  <TabsTrigger value="fees" className="text-xs py-2">Frais</TabsTrigger>
                  <TabsTrigger value="docs" className="text-xs py-2">Documents</TabsTrigger>
                </TabsList>

                <TabsContent value="requester" className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Type de demande</p>
                      <p className="text-sm font-medium capitalize">{(detailData || selectedRequest).request_type || 'initial'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Titre déduit</p>
                      <p className="text-sm font-medium">{(detailData || selectedRequest).deduced_title_type || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Nom complet</p>
                      <p className="text-sm font-medium">{getRequestFullName(selectedRequest)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="text-sm font-medium capitalize">{selectedRequest.requester_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Téléphone</p>
                      <p className="text-sm font-medium">{selectedRequest.requester_phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">{selectedRequest.requester_email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Type construction</p>
                      <p className="text-sm font-medium">{(detailData || selectedRequest).construction_type || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Nature construction</p>
                      <p className="text-sm font-medium">{(detailData || selectedRequest).construction_nature || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Matériaux</p>
                      <p className="text-sm font-medium">{(detailData || selectedRequest).construction_materials || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Usage déclaré</p>
                      <p className="text-sm font-medium">{(detailData || selectedRequest).declared_usage || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Nationalité</p>
                      <p className="text-sm font-medium">{(detailData || selectedRequest).nationality || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Durée d'occupation</p>
                      <p className="text-sm font-medium">{(detailData || selectedRequest).occupation_duration || '-'}</p>
                    </div>
                  </div>
                  
                  {!selectedRequest.is_owner_same_as_requester && (
                    <>
                      <Separator />
                      <p className="text-xs font-semibold text-muted-foreground">Propriétaire (différent du demandeur)</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Nom</p>
                          <p className="text-sm font-medium">
                            {[(detailData || selectedRequest).owner_first_name, (detailData || selectedRequest).owner_middle_name, (detailData || selectedRequest).owner_last_name].filter(Boolean).join(' ')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Statut juridique</p>
                          <p className="text-sm font-medium">{(detailData || selectedRequest).owner_legal_status || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Téléphone</p>
                          <p className="text-sm font-medium">{(detailData || selectedRequest).owner_phone || '-'}</p>
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="location" className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Province</p>
                      <p className="text-sm font-medium">{selectedRequest.province}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Type de zone</p>
                      <Badge variant="outline" className="text-xs">
                        {selectedRequest.section_type === 'urbaine' ? 'Urbaine' : 'Rurale'}
                      </Badge>
                    </div>
                    {selectedRequest.section_type === 'urbaine' ? (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground">Ville</p>
                          <p className="text-sm font-medium">{selectedRequest.ville || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Commune</p>
                          <p className="text-sm font-medium">{selectedRequest.commune || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Quartier</p>
                          <p className="text-sm font-medium">{selectedRequest.quartier || '-'}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground">Territoire</p>
                          <p className="text-sm font-medium">{selectedRequest.territoire || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Collectivité</p>
                          <p className="text-sm font-medium">{selectedRequest.collectivite || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Groupement</p>
                          <p className="text-sm font-medium">{selectedRequest.groupement || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Village</p>
                          <p className="text-sm font-medium">{selectedRequest.village || '-'}</p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Superficie</p>
                      <p className="text-sm font-medium">{selectedRequest.area_sqm ? `${selectedRequest.area_sqm} m²` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Circonscription</p>
                      <p className="text-sm font-medium">{(detailData || selectedRequest).circonscription_fonciere || '-'}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="fees" className="space-y-3 mt-4">
                  <div className="space-y-2">
                    {detailData && Array.isArray(detailData.fee_items) && detailData.fee_items.map((fee: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg">
                        <span className="text-xs">{fee.name || fee.fee_name}</span>
                        <span className="text-xs font-semibold">${fee.amount}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between items-center p-2 bg-primary/10 rounded-lg">
                      <span className="text-sm font-semibold">Total</span>
                      <span className="text-sm font-bold text-primary">${selectedRequest.total_amount_usd}</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="docs" className="space-y-3 mt-4">
                  <div className="space-y-2">
                    {detailData?.requester_id_document_url && (
                      <a href={detailData.requester_id_document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                        <Download className="h-4 w-4" />
                        <span className="text-xs">Pièce d'identité demandeur</span>
                      </a>
                    )}
                    {detailData?.owner_id_document_url && (
                      <a href={detailData.owner_id_document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                        <Download className="h-4 w-4" />
                        <span className="text-xs">Pièce d'identité propriétaire</span>
                      </a>
                    )}
                    {detailData?.procuration_document_url && (
                      <a href={detailData.procuration_document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                        <Download className="h-4 w-4" />
                        <span className="text-xs">Procuration / Mandat</span>
                      </a>
                    )}
                    {detailData?.proof_of_ownership_url && (
                      <a href={detailData.proof_of_ownership_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                        <Download className="h-4 w-4" />
                        <span className="text-xs">Preuve de propriété</span>
                      </a>
                    )}
                    {!detailData?.requester_id_document_url && !detailData?.owner_id_document_url && !detailData?.proof_of_ownership_url && !detailData?.procuration_document_url && (
                      <p className="text-xs text-muted-foreground text-center py-4">Aucun document joint</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {(detailData || selectedRequest).processing_notes && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Notes de traitement</p>
                  <p className="text-sm">{(detailData || selectedRequest).processing_notes}</p>
                </div>
              )}

              {(detailData || selectedRequest).rejection_reason && (
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <p className="text-xs text-destructive mb-1">Motif de rejet</p>
                  <p className="text-sm">{(detailData || selectedRequest).rejection_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Process Dialog */}
      <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Traiter la demande</DialogTitle>
            <DialogDescription>
              {selectedRequest?.reference_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <Select value={processAction} onValueChange={(v: any) => setProcessAction(v)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="in_review" className="rounded-lg">Mettre en examen</SelectItem>
                  <SelectItem value="approve" className="rounded-lg">Approuver</SelectItem>
                  <SelectItem value="reject" className="rounded-lg">Rejeter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {processAction === 'approve' && selectedRequest?.payment_status !== 'paid' && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>Cette demande n'est pas encore payée. L'approbation sera bloquée.</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes de traitement</label>
              <Textarea
                value={processingNotes}
                onChange={(e) => setProcessingNotes(e.target.value)}
                placeholder="Ajoutez des notes..."
                className="rounded-xl"
              />
            </div>

            {processAction === 'reject' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-destructive">Motif de rejet *</label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Expliquez le motif du rejet..."
                  className="rounded-xl border-destructive"
                  required
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowProcessDialog(false)} className="rounded-xl">
              Annuler
            </Button>
            <Button 
              onClick={handleProcessRequest} 
              disabled={processing || (processAction === 'reject' && !rejectionReason) || (processAction === 'approve' && selectedRequest?.payment_status !== 'paid')}
              className="rounded-xl"
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLandTitleRequests;
