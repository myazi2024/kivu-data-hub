import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePagination } from '@/hooks/usePagination';
import { exportToCSV } from '@/utils/csvExport';
import {
  Grid3X3,
  Search,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  MapPin,
  User,
  CreditCard,
  Loader2,
  RefreshCw,
  Square,
  Ruler
} from 'lucide-react';

interface LotData {
  id: string;
  lotNumber: string;
  length: string;
  width: string;
  areaSqm: number;
  perimeter: number;
  isBuilt: boolean;
  hasFence: boolean;
  fenceType?: string;
  constructionType?: string;
  intendedUse?: string;
  notes?: string;
}

interface SubdivisionRequest {
  id: string;
  reference_number: string;
  user_id: string;
  parcel_number: string;
  parent_parcel_area_sqm: number;
  parent_parcel_location: string;
  parent_parcel_owner_name: string;
  parent_parcel_title_reference: string;
  requester_first_name: string;
  requester_last_name: string;
  requester_phone: string;
  requester_email: string;
  requester_type: string;
  number_of_lots: number;
  lots_data: LotData[];
  purpose_of_subdivision: string;
  submission_fee_usd: number;
  processing_fee_usd: number;
  total_amount_usd: number;
  status: string;
  submission_payment_status: string;
  final_payment_status: string;
  processing_notes: string;
  rejection_reason: string;
  reviewed_by: string;
  reviewed_at: string;
  created_at: string;
  updated_at: string;
}

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  in_review: 'En cours d\'examen',
  approved: 'Approuvée',
  rejected: 'Rejetée',
  on_hold: 'Suspendue',
  completed: 'Terminée'
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500',
  in_review: 'bg-blue-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  on_hold: 'bg-gray-500',
  completed: 'bg-emerald-600'
};

const AdminSubdivisionRequests: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SubdivisionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('_all');
  
  // Dialog states
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SubdivisionRequest | null>(null);
  const [processAction, setProcessAction] = useState<'approve' | 'reject' | 'hold'>('approve');
  const [processingNotes, setProcessingNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingFee, setProcessingFee] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subdivision_requests' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as unknown as SubdivisionRequest[]);
    } catch (error) {
      console.error('Error fetching subdivision requests:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.parcel_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requester_last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requester_first_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === '_all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const pagination = usePagination(filteredRequests, { initialPageSize: 15 });

  const handleExportCSV = () => {
    exportToCSV({
      filename: `lotissements_${format(new Date(), 'yyyy-MM-dd')}.csv`,
      headers: ['Référence', 'Parcelle', 'Propriétaire', 'Surface m²', 'Nb Lots', 'Montant USD', 'Statut', 'Date'],
      data: filteredRequests.map(r => [
        r.reference_number,
        r.parcel_number,
        r.parent_parcel_owner_name,
        r.parent_parcel_area_sqm.toString(),
        r.number_of_lots.toString(),
        r.total_amount_usd.toString(),
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

      const updateData: any = {
        status: newStatus,
        processing_notes: processingNotes || null,
        rejection_reason: processAction === 'reject' ? rejectionReason : null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (processAction === 'approve' && processingFee) {
        updateData.processing_fee_usd = parseFloat(processingFee);
        updateData.total_amount_usd = selectedRequest.submission_fee_usd + parseFloat(processingFee);
        updateData.final_payment_status = 'pending';
      }

      const { error } = await supabase
        .from('subdivision_requests' as any)
        .update(updateData)
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // Create notification for user
      await supabase.from('notifications').insert({
        user_id: selectedRequest.user_id,
        type: processAction === 'approve' ? 'success' : processAction === 'reject' ? 'error' : 'warning',
        title: `Demande de lotissement ${processAction === 'approve' ? 'approuvée' : processAction === 'reject' ? 'rejetée' : 'mise en attente'}`,
        message: processAction === 'approve' 
          ? `Votre demande ${selectedRequest.reference_number} a été approuvée. Veuillez payer les frais de traitement de ${processingFee}$ pour finaliser.`
          : `Votre demande ${selectedRequest.reference_number} a été ${processAction === 'reject' ? 'rejetée' : 'mise en attente'}.`,
        action_url: '/user-dashboard?tab=subdivisions'
      });

      toast.success('Demande traitée avec succès');
      setShowProcessDialog(false);
      setProcessingNotes('');
      setRejectionReason('');
      setProcessingFee('');
      fetchRequests();
    } catch (error) {
      console.error('Error processing request:', error);
      toast.error('Erreur lors du traitement');
    } finally {
      setProcessing(false);
    }
  };

  const openDetailsDialog = (request: SubdivisionRequest) => {
    setSelectedRequest(request);
    setShowDetailsDialog(true);
  };

  const openProcessDialog = (request: SubdivisionRequest, action: 'approve' | 'reject' | 'hold') => {
    setSelectedRequest(request);
    setProcessAction(action);
    setShowProcessDialog(true);
  };

  // Statistics
  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    totalLots: requests.reduce((sum, r) => sum + r.number_of_lots, 0),
    revenue: requests.filter(r => r.submission_payment_status === 'completed').reduce((sum, r) => sum + r.submission_fee_usd, 0)
  };

  const columns = [
    {
      key: 'reference_number',
      header: 'Référence',
      priority: 1,
      render: (request: SubdivisionRequest) => (
        <span className="font-mono text-xs font-semibold">{request.reference_number}</span>
      )
    },
    {
      key: 'parcel_number',
      header: 'Parcelle',
      priority: 2,
      render: (request: SubdivisionRequest) => (
        <span className="font-mono text-xs">{request.parcel_number}</span>
      )
    },
    {
      key: 'owner',
      header: 'Propriétaire',
      priority: 3,
      render: (request: SubdivisionRequest) => (
        <span className="text-sm">{request.parent_parcel_owner_name}</span>
      )
    },
    {
      key: 'area',
      header: 'Surface',
      priority: 4,
      render: (request: SubdivisionRequest) => (
        <span className="text-sm">{request.parent_parcel_area_sqm.toLocaleString()} m²</span>
      )
    },
    {
      key: 'lots',
      header: 'Lots',
      priority: 2,
      render: (request: SubdivisionRequest) => (
        <Badge variant="outline">{request.number_of_lots} lots</Badge>
      )
    },
    {
      key: 'status',
      header: 'Statut',
      priority: 1,
      render: (request: SubdivisionRequest) => (
        <Badge className={statusColors[request.status]}>
          {statusLabels[request.status]}
        </Badge>
      )
    },
    {
      key: 'created_at',
      header: 'Date',
      priority: 3,
      render: (request: SubdivisionRequest) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(request.created_at), 'dd/MM/yyyy', { locale: fr })}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      priority: 1,
      render: (request: SubdivisionRequest) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => openDetailsDialog(request)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {request.status === 'pending' && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-green-600 hover:text-green-700"
                onClick={() => openProcessDialog(request, 'approve')}
              >
                <CheckCircle className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-600 hover:text-red-700"
                onClick={() => openProcessDialog(request, 'reject')}
              >
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Grid3X3 className="h-6 w-6 text-primary" />
            Demandes de Lotissement
          </h1>
          <p className="text-sm text-muted-foreground">
            Gérez les demandes de division de parcelles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchRequests}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total demandes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Approuvées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-blue-600">{stats.totalLots}</div>
            <p className="text-xs text-muted-foreground">Lots créés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-emerald-600">${stats.revenue}</div>
            <p className="text-xs text-muted-foreground">Revenus</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par référence, parcelle, propriétaire..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="in_review">En cours</SelectItem>
                <SelectItem value="approved">Approuvées</SelectItem>
                <SelectItem value="rejected">Rejetées</SelectItem>
                <SelectItem value="on_hold">Suspendues</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Parcelle</TableHead>
                  <TableHead className="hidden md:table-cell">Propriétaire</TableHead>
                  <TableHead className="hidden lg:table-cell">Surface</TableHead>
                  <TableHead>Lots</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Aucune demande de lotissement trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  pagination.paginatedData.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-xs font-semibold">{request.reference_number}</TableCell>
                      <TableCell className="font-mono text-xs">{request.parcel_number}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{request.parent_parcel_owner_name}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{request.parent_parcel_area_sqm?.toLocaleString()} m²</TableCell>
                      <TableCell><Badge variant="outline">{request.number_of_lots} lots</Badge></TableCell>
                      <TableCell><Badge className={statusColors[request.status]}>{statusLabels[request.status]}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {format(new Date(request.created_at), 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetailsDialog(request)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {request.status === 'pending' && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => openProcessDialog(request, 'approve')}>
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => openProcessDialog(request, 'reject')}>
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 border-t flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {pagination.currentPage} sur {pagination.totalPages} ({pagination.totalItems} résultats)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={pagination.goToPreviousPage} disabled={!pagination.hasPreviousPage}>Précédent</Button>
              <Button variant="outline" size="sm" onClick={pagination.goToNextPage} disabled={!pagination.hasNextPage}>Suivant</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5 text-primary" />
              Détails de la demande
            </DialogTitle>
            <DialogDescription>
              Référence: {selectedRequest?.reference_number}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            {selectedRequest && (
              <div className="space-y-6 p-1">
                {/* Parcelle mère */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Parcelle Mère
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Numéro:</span>
                      <p className="font-mono">{selectedRequest.parcel_number}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Surface:</span>
                      <p>{selectedRequest.parent_parcel_area_sqm.toLocaleString()} m²</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Propriétaire:</span>
                      <p>{selectedRequest.parent_parcel_owner_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Titre foncier:</span>
                      <p>{selectedRequest.parent_parcel_title_reference || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Demandeur */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Demandeur
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Nom:</span>
                      <p>{selectedRequest.requester_first_name} {selectedRequest.requester_last_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <p className="capitalize">{selectedRequest.requester_type}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Téléphone:</span>
                      <p>{selectedRequest.requester_phone}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p>{selectedRequest.requester_email || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Lots */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Square className="h-4 w-4" />
                    Lots définis ({selectedRequest.number_of_lots})
                  </h4>
                  <div className="space-y-2">
                    {selectedRequest.lots_data?.map((lot, index) => (
                      <div key={lot.id || index} className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{lot.lotNumber}</span>
                          <div className="flex gap-2">
                            {lot.isBuilt && <Badge variant="secondary">Construit</Badge>}
                            {lot.hasFence && <Badge variant="outline">Clôturé</Badge>}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Long:</span> {lot.length}m
                          </div>
                          <div>
                            <span className="text-muted-foreground">Larg:</span> {lot.width}m
                          </div>
                          <div>
                            <span className="text-muted-foreground">Surface:</span> {lot.areaSqm}m²
                          </div>
                          <div>
                            <span className="text-muted-foreground">Périm:</span> {lot.perimeter}m
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                {/* Paiement */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Paiement
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Frais de dossier:</span>
                      <p>${selectedRequest.submission_fee_usd}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Statut paiement:</span>
                      <Badge className={selectedRequest.submission_payment_status === 'completed' ? 'bg-green-500' : 'bg-amber-500'}>
                        {selectedRequest.submission_payment_status === 'completed' ? 'Payé' : 'En attente'}
                      </Badge>
                    </div>
                    {selectedRequest.processing_fee_usd > 0 && (
                      <>
                        <div>
                          <span className="text-muted-foreground">Frais traitement:</span>
                          <p>${selectedRequest.processing_fee_usd}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total:</span>
                          <p className="font-bold">${selectedRequest.total_amount_usd}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Fermer
            </Button>
            {selectedRequest?.status === 'pending' && (
              <>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    setShowDetailsDialog(false);
                    openProcessDialog(selectedRequest, 'reject');
                  }}
                >
                  Rejeter
                </Button>
                <Button 
                  onClick={() => {
                    setShowDetailsDialog(false);
                    openProcessDialog(selectedRequest, 'approve');
                  }}
                >
                  Approuver
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process Dialog */}
      <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {processAction === 'approve' ? 'Approuver la demande' : 
               processAction === 'reject' ? 'Rejeter la demande' : 'Mettre en attente'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.reference_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {processAction === 'approve' && (
              <div className="space-y-2">
                <Label>Frais de traitement (USD) *</Label>
                <Input
                  type="number"
                  value={processingFee}
                  onChange={(e) => setProcessingFee(e.target.value)}
                  placeholder="Ex: 150"
                />
                <p className="text-xs text-muted-foreground">
                  Ce montant sera demandé à l'utilisateur pour finaliser la demande.
                </p>
              </div>
            )}
            
            {processAction === 'reject' && (
              <div className="space-y-2">
                <Label>Raison du rejet *</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Expliquez la raison du rejet..."
                  rows={3}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Notes de traitement</Label>
              <Textarea
                value={processingNotes}
                onChange={(e) => setProcessingNotes(e.target.value)}
                placeholder="Notes internes..."
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProcessDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleProcessRequest}
              disabled={processing || (processAction === 'approve' && !processingFee) || (processAction === 'reject' && !rejectionReason)}
              className={processAction === 'reject' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {processing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Traitement...</>
              ) : (
                processAction === 'approve' ? 'Approuver' : processAction === 'reject' ? 'Rejeter' : 'Suspendre'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubdivisionRequests;
