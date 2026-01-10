import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Grid3X3,
  Search,
  Eye,
  Check,
  X,
  FileText,
  User,
  MapPin,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Download,
  DollarSign,
  Building2,
  Fence,
  Square,
  ChevronLeft,
  ChevronRight
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
}

interface SubdivisionRequest {
  id: string;
  reference_number: string;
  user_id: string;
  parcel_number: string;
  parcel_id?: string;
  parent_parcel_area_sqm: number;
  parent_parcel_location?: string;
  parent_parcel_owner_name: string;
  parent_parcel_title_reference?: string;
  parent_parcel_gps_coordinates?: { lat: string; lng: string };
  requester_first_name: string;
  requester_last_name: string;
  requester_middle_name?: string;
  requester_phone: string;
  requester_email?: string;
  requester_type: string;
  number_of_lots: number;
  lots_data: LotData[];
  purpose_of_subdivision?: string;
  submission_fee_usd: number;
  processing_fee_usd?: number;
  total_amount_usd: number;
  submission_payment_status: string;
  processing_payment_status?: string;
  status: string;
  rejection_reason?: string;
  processing_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  in_review: { label: 'En cours d\'examen', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  approved: { label: 'Approuvé', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  awaiting_payment: { label: 'Attente paiement', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  completed: { label: 'Terminé', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  cancelled: { label: 'Annulé', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
};

const purposeLabels: Record<string, string> = {
  vente: 'Vente de terrains',
  succession: 'Partage successoral',
  donation: 'Donation',
  investissement: 'Investissement immobilier',
  autre: 'Autre'
};

export function AdminSubdivisionRequests() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [requests, setRequests] = useState<SubdivisionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<SubdivisionRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [processingFee, setProcessingFee] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingNotes, setProcessingNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subdivision_requests' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as unknown as SubdivisionRequest[]) || []);
    } catch (err: any) {
      console.error('Error fetching subdivision requests:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les demandes de lotissement.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.parcel_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requester_last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requester_first_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const paginatedRequests = filteredRequests.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);

  const handleViewDetails = (request: SubdivisionRequest) => {
    setSelectedRequest(request);
    setShowDetailsDialog(true);
  };

  const handleAction = (request: SubdivisionRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setProcessingFee('');
    setRejectionReason('');
    setProcessingNotes('');
    setShowActionDialog(true);
  };

  const submitAction = async () => {
    if (!selectedRequest || !actionType || !user) return;
    
    setProcessing(true);
    try {
      const updates: any = {
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        processing_notes: processingNotes || null
      };

      if (actionType === 'approve') {
        const fee = parseFloat(processingFee);
        if (isNaN(fee) || fee < 0) {
          toast({
            title: 'Erreur',
            description: 'Veuillez entrer un montant valide pour les frais de traitement.',
            variant: 'destructive'
          });
          setProcessing(false);
          return;
        }
        updates.status = fee > 0 ? 'awaiting_payment' : 'approved';
        updates.processing_fee_usd = fee;
        updates.total_amount_usd = selectedRequest.submission_fee_usd + fee;
      } else {
        if (!rejectionReason.trim()) {
          toast({
            title: 'Erreur',
            description: 'Veuillez entrer le motif du rejet.',
            variant: 'destructive'
          });
          setProcessing(false);
          return;
        }
        updates.status = 'rejected';
        updates.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from('subdivision_requests' as any)
        .update(updates)
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // Créer notification pour l'utilisateur
      await supabase.from('notifications').insert({
        user_id: selectedRequest.user_id,
        type: actionType === 'approve' ? 'success' : 'error',
        title: actionType === 'approve' 
          ? 'Demande de lotissement approuvée' 
          : 'Demande de lotissement rejetée',
        message: actionType === 'approve'
          ? `Votre demande ${selectedRequest.reference_number} a été approuvée.${parseFloat(processingFee) > 0 ? ` Frais restants: $${processingFee}` : ''}`
          : `Votre demande ${selectedRequest.reference_number} a été rejetée. Motif: ${rejectionReason}`,
        action_url: '/user-dashboard?tab=subdivisions'
      });

      toast({
        title: actionType === 'approve' ? 'Demande approuvée' : 'Demande rejetée',
        description: `La demande ${selectedRequest.reference_number} a été ${actionType === 'approve' ? 'approuvée' : 'rejetée'}.`
      });

      setShowActionDialog(false);
      fetchRequests();
    } catch (err: any) {
      console.error('Error processing request:', err);
      toast({
        title: 'Erreur',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Grid3X3 className="h-6 w-6 text-primary" />
            Demandes de Lotissement
          </h2>
          <p className="text-muted-foreground">
            Gérez les demandes de subdivision de parcelles
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <Clock className="h-3 w-3" />
              {pendingCount} en attente
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={fetchRequests} className="gap-1">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par référence, parcelle ou nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(statusConfig).map(([value, config]) => (
                  <SelectItem key={value} value={value}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : paginatedRequests.length === 0 ? (
            <div className="text-center py-12">
              <Grid3X3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Aucune demande trouvée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 border rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">
                          {request.reference_number}
                        </Badge>
                        <Badge className={statusConfig[request.status]?.color || 'bg-gray-100'}>
                          {statusConfig[request.status]?.label || request.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="font-mono">{request.parcel_number}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          <span>{request.requester_last_name} {request.requester_first_name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Grid3X3 className="h-3.5 w-3.5" />
                          <span>{request.number_of_lots} lots</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{format(new Date(request.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(request)}
                        className="gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        Détails
                      </Button>
                      
                      {request.status === 'pending' && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleAction(request, 'approve')}
                            className="gap-1"
                          >
                            <Check className="h-4 w-4" />
                            Approuver
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleAction(request, 'reject')}
                            className="gap-1"
                          >
                            <X className="h-4 w-4" />
                            Rejeter
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {page} sur {totalPages} ({filteredRequests.length} résultats)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Détails */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5 text-primary" />
              Détails de la demande
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.reference_number}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <ScrollArea className="max-h-[calc(90vh-150px)]">
              <div className="space-y-6 p-1">
                {/* Statut */}
                <div className="flex items-center justify-between">
                  <Badge className={`${statusConfig[selectedRequest.status]?.color} text-sm px-3 py-1`}>
                    {statusConfig[selectedRequest.status]?.label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Créée le {format(new Date(selectedRequest.created_at), 'PPP', { locale: fr })}
                  </span>
                </div>

                {/* Parcelle mère */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Parcelle mère
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Numéro:</span>
                      <span className="ml-2 font-mono">{selectedRequest.parcel_number}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Surface:</span>
                      <span className="ml-2">{selectedRequest.parent_parcel_area_sqm?.toLocaleString()} m²</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Propriétaire:</span>
                      <span className="ml-2">{selectedRequest.parent_parcel_owner_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Motif:</span>
                      <span className="ml-2">{purposeLabels[selectedRequest.purpose_of_subdivision || ''] || 'Non spécifié'}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Lots */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Grid3X3 className="h-4 w-4" />
                      Lots créés ({selectedRequest.number_of_lots})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(selectedRequest.lots_data || []).map((lot: LotData, index: number) => (
                        <div key={lot.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{lot.lotNumber}</Badge>
                            <span>{lot.length}m × {lot.width}m</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {lot.isBuilt && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Building2 className="h-3 w-3" />
                                Construit
                              </Badge>
                            )}
                            {lot.hasFence && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Fence className="h-3 w-3" />
                                Clôturé
                              </Badge>
                            )}
                            <Badge className="gap-1">
                              <Square className="h-3 w-3" />
                              {lot.areaSqm.toLocaleString()} m²
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Demandeur */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Demandeur
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Nom:</span>
                      <span className="ml-2">
                        {selectedRequest.requester_last_name} {selectedRequest.requester_first_name} {selectedRequest.requester_middle_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Téléphone:</span>
                      <span className="ml-2">{selectedRequest.requester_phone}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <span className="ml-2">{selectedRequest.requester_email || 'Non renseigné'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <span className="ml-2 capitalize">{selectedRequest.requester_type}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Finances */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Finances
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Frais de dossier:</span>
                      <span>${selectedRequest.submission_fee_usd}</span>
                    </div>
                    {selectedRequest.processing_fee_usd != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Frais de traitement:</span>
                        <span>${selectedRequest.processing_fee_usd}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>${selectedRequest.total_amount_usd}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Rejet */}
                {selectedRequest.status === 'rejected' && selectedRequest.rejection_reason && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Motif du rejet:</strong> {selectedRequest.rejection_reason}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Action */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approuver la demande' : 'Rejeter la demande'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.reference_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {actionType === 'approve' ? (
              <div className="space-y-2">
                <Label htmlFor="processingFee">Frais de traitement ($)</Label>
                <Input
                  id="processingFee"
                  type="number"
                  value={processingFee}
                  onChange={(e) => setProcessingFee(e.target.value)}
                  placeholder="Ex: 100"
                />
                <p className="text-xs text-muted-foreground">
                  Entrez 0 si aucun frais supplémentaire n'est requis.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Motif du rejet *</Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Expliquez la raison du rejet..."
                  rows={3}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="processingNotes">Notes de traitement (optionnel)</Label>
              <Textarea
                id="processingNotes"
                value={processingNotes}
                onChange={(e) => setProcessingNotes(e.target.value)}
                placeholder="Notes internes..."
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>
              Annuler
            </Button>
            <Button
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={submitAction}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Traitement...
                </>
              ) : actionType === 'approve' ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Approuver
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Rejeter
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminSubdivisionRequests;
