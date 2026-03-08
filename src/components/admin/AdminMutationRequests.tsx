import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  FileEdit, Search, Filter, Eye, CheckCircle, XCircle, Clock, 
  Loader2, RefreshCw, DollarSign, MapPin, User, Calendar,
  Settings, Plus, Trash2, Edit2, Save, Download
} from 'lucide-react';
import { generateAndUploadCertificate } from '@/utils/certificateService';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { exportToCSV } from '@/utils/csvExport';
import { getMutationTypeLabel } from '@/components/cadastral/mutation/MutationConstants';

import type { MutationFee, MutationRequest } from '@/types/mutation';

const AdminMutationRequests: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState<MutationRequest[]>([]);
  const [fees, setFees] = useState<MutationFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('_all');
  
  // Dialog states
  const [selectedRequest, setSelectedRequest] = useState<MutationRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [showFeeDialog, setShowFeeDialog] = useState(false);
  const [editingFee, setEditingFee] = useState<MutationFee | null>(null);
  
  // Process form
  const [processAction, setProcessAction] = useState<'approve' | 'reject' | 'hold'>('approve');
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
      setRequests((data || []) as unknown as MutationRequest[]);
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

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.parcel_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requester_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === '_all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const pagination = usePagination(filteredRequests, { initialPageSize: 15 });

  const handleExportCSV = () => {
    const statusLabels: Record<string, string> = {
      pending: 'En attente',
      in_review: 'En cours',
      approved: 'Approuvée',
      rejected: 'Rejetée',
      on_hold: 'Suspendue'
    };
    exportToCSV({
      filename: `mutations_${format(new Date(), 'yyyy-MM-dd')}.csv`,
      headers: ['Référence', 'Parcelle', 'Demandeur', 'Montant USD', 'Paiement', 'Statut', 'Date'],
      data: filteredRequests.map(r => [
        r.reference_number,
        r.parcel_number,
        r.requester_name,
        r.total_amount_usd.toString(),
        r.payment_status === 'paid' ? 'Payé' : 'Non payé',
        statusLabels[r.status] || r.status,
        format(new Date(r.created_at), 'dd/MM/yyyy'),
      ])
    });
  };

  const handleProcessRequest = async () => {
    if (!selectedRequest || !user) return;

    setProcessing(true);
    try {
      let newStatus: string;
      switch (processAction) {
        case 'approve': newStatus = 'approved'; break;
        case 'reject': newStatus = 'rejected'; break;
        case 'hold': newStatus = 'on_hold'; break;
        default: newStatus = 'pending';
      }

      const { error } = await supabase
        .from('mutation_requests')
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
            { label: 'Type mutation:', value: selectedRequest.mutation_type },
            { label: 'Bénéficiaire:', value: selectedRequest.beneficiary_name || 'N/A' },
            { label: 'Montant payé:', value: `$${selectedRequest.total_amount_usd}` },
          ],
          user.id
        );
        if (certResult) {
          toast.success('Certificat de mutation généré automatiquement');
        }
      }

      // Create notification for user
      await supabase.from('notifications').insert({
        user_id: selectedRequest.user_id,
        type: processAction === 'approve' ? 'success' : processAction === 'reject' ? 'error' : 'warning',
        title: `Demande de mutation ${processAction === 'approve' ? 'approuvée' : processAction === 'reject' ? 'rejetée' : 'mise en attente'}`,
        message: processAction === 'approve'
          ? `Votre demande ${selectedRequest.reference_number} a été approuvée. Le certificat est disponible dans votre espace.`
          : `Votre demande ${selectedRequest.reference_number} a été ${processAction === 'reject' ? 'rejetée' : 'mise en attente'}.`,
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
    if (!feeName || !feeAmount) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      if (editingFee) {
        const { error } = await supabase
          .from('mutation_fees_config')
          .update({
            fee_name: feeName,
            amount_usd: parseFloat(feeAmount),
            description: feeDescription || null,
            is_mandatory: feeMandatory,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingFee.id);

        if (error) throw error;
        toast.success('Frais modifié');
      } else {
        const { error } = await supabase
          .from('mutation_fees_config')
          .insert({
            fee_name: feeName,
            amount_usd: parseFloat(feeAmount),
            description: feeDescription || null,
            is_mandatory: feeMandatory,
            display_order: fees.length + 1
          });

        if (error) throw error;
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

  const handleDeleteFee = async (feeId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce frais ?')) return;

    try {
      const { error } = await supabase
        .from('mutation_fees_config')
        .update({ is_active: false })
        .eq('id', feeId);

      if (error) throw error;
      toast.success('Frais désactivé');
      fetchFees();
    } catch (error) {
      console.error('Error deleting fee:', error);
      toast.error('Erreur lors de la suppression');
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
      on_hold: { variant: 'secondary', label: 'Suspendue' }
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
        <span className="font-mono text-xs font-semibold">{request.reference_number}</span>
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

  // Stats
  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending' || r.status === 'in_review').length,
    approved: requests.filter(r => r.status === 'approved').length,
    revenue: requests.filter(r => r.payment_status === 'paid').reduce((sum, r) => sum + r.total_amount_usd, 0)
  };

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
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                <div className="text-xs text-muted-foreground">Revenus</div>
                <div className="text-xl font-bold text-primary">${stats.revenue.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
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
                <SelectItem value="_all">Tous</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="in_review">En cours</SelectItem>
                <SelectItem value="approved">Approuvée</SelectItem>
                <SelectItem value="rejected">Rejetée</SelectItem>
                <SelectItem value="on_hold">Suspendue</SelectItem>
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
                      <span className="font-bold text-primary">${fee.amount_usd}</span>
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
                        onClick={() => handleDeleteFee(fee.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
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
          {selectedRequest && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Référence</Label>
                    <p className="font-mono font-bold">{selectedRequest.reference_number}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Parcelle</Label>
                    <p className="font-mono">{selectedRequest.parcel_number}</p>
                  </div>
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
                    {selectedRequest.proposed_changes?.description || 'Non spécifié'}
                  </p>
                </div>

                {selectedRequest.justification && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Justification</Label>
                    <p className="text-sm mt-1">{selectedRequest.justification}</p>
                  </div>
                )}

                {/* Documents joints */}
                {selectedRequest.proposed_changes?.supporting_documents?.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Documents joints</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedRequest.proposed_changes.supporting_documents.map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                          Document {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certificat d'expertise */}
                {selectedRequest.proposed_changes?.expertise_certificate_url && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Certificat d'expertise</Label>
                    <div className="mt-1 space-y-1">
                      <a href={selectedRequest.proposed_changes.expertise_certificate_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline block">
                        Voir le certificat
                      </a>
                      {selectedRequest.proposed_changes.market_value_usd && (
                        <p className="text-xs">Valeur vénale: <strong>${selectedRequest.proposed_changes.market_value_usd.toLocaleString()}</strong></p>
                      )}
                      {selectedRequest.proposed_changes.expertise_certificate_date && (
                        <p className="text-xs text-muted-foreground">Date: {selectedRequest.proposed_changes.expertise_certificate_date}</p>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Décomposition des frais */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground font-semibold">Détail des frais</Label>
                  
                  {/* Fee items from request */}
                  {selectedRequest.fee_items?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span>{item.fee_name}</span>
                      <span className="font-mono">${item.amount_usd}</span>
                    </div>
                  ))}

                  {/* Mutation fees */}
                  {selectedRequest.proposed_changes?.mutation_fees && (
                    <>
                      <div className="flex justify-between text-xs">
                        <span>Frais de mutation ({selectedRequest.proposed_changes.mutation_fees.percentage}%)</span>
                        <span className="font-mono">${selectedRequest.proposed_changes.mutation_fees.mutation_fee}</span>
                      </div>
                      {selectedRequest.proposed_changes.mutation_fees.bank_fee > 0 && (
                        <div className="flex justify-between text-xs">
                          <span>Frais bancaires</span>
                          <span className="font-mono">${selectedRequest.proposed_changes.mutation_fees.bank_fee}</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Late fees */}
                  {selectedRequest.proposed_changes?.late_fees && (
                    <div className="flex justify-between text-xs text-orange-600">
                      <span>Retard ({selectedRequest.proposed_changes.late_fees.days}j)</span>
                      <span className="font-mono">${selectedRequest.proposed_changes.late_fees.fee}</span>
                    </div>
                  )}

                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Total</span>
                    <span className="text-lg font-bold text-primary">${selectedRequest.total_amount_usd.toFixed(2)}</span>
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
          )}
        </DialogContent>
      </Dialog>

      {/* Process Dialog */}
      <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Traiter la demande</DialogTitle>
            <DialogDescription className="text-xs">
              {selectedRequest?.reference_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProcessDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleProcessRequest}
              disabled={processing || (processAction === 'reject' && !rejectionReason)}
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
              <input
                type="checkbox"
                id="mandatory"
                checked={feeMandatory}
                onChange={(e) => setFeeMandatory(e.target.checked)}
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
