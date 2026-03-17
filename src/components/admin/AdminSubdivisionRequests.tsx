import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Grid3X3, Search, Eye, Check, X, FileText, User, MapPin,
  Clock, AlertTriangle, Loader2, RefreshCw, DollarSign,
  ChevronLeft, ChevronRight, Square
} from 'lucide-react';
import { generateAndUploadCertificate } from '@/utils/certificateService';
import { StatusBadge, StatusType } from '@/components/shared/StatusBadge';

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
  parent_parcel_gps_coordinates?: any;
  requester_first_name: string;
  requester_last_name: string;
  requester_middle_name?: string;
  requester_phone: string;
  requester_email?: string;
  requester_type?: string;
  number_of_lots: number;
  lots_data: any[];
  subdivision_plan_data?: any;
  purpose_of_subdivision?: string;
  submission_fee_usd: number;
  processing_fee_usd?: number;
  total_amount_usd: number;
  submission_payment_status?: string;
  status: string;
  rejection_reason?: string;
  processing_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

const SUBDIVISION_STATUS_MAP: Record<string, StatusType> = {
  pending: 'pending',
  in_review: 'in_review',
  approved: 'approved',
  rejected: 'rejected',
  awaiting_payment: 'processing',
  completed: 'completed',
};

export function AdminSubdivisionRequests() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [requests, setRequests] = useState<SubdivisionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('_all');
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
        .from('subdivision_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRequests((data || []) as SubdivisionRequest[]);
    } catch (err: any) {
      toast({ title: 'Erreur', description: 'Impossible de charger les demandes.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.parcel_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requester_last_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === '_all' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedRequests = filteredRequests.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const handleAction = (request: SubdivisionRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setProcessingFee('');
    setRejectionReason('');
    setProcessingNotes('');
    setShowActionDialog(true);
  };

  // Save individual lots to subdivision_lots table on approval
  const saveApprovedLots = async (request: SubdivisionRequest) => {
    const lotsData = request.lots_data || [];
    const parentGps = request.parent_parcel_gps_coordinates;
    
    for (const lot of lotsData) {
      // Convert normalized vertices to GPS if parent has GPS coords
      let gpsCoordinates = null;
      if (parentGps && Array.isArray(parentGps) && parentGps.length >= 3 && lot.vertices) {
        const bb = {
          minLat: Math.min(...parentGps.map((c: any) => c.lat)),
          maxLat: Math.max(...parentGps.map((c: any) => c.lat)),
          minLng: Math.min(...parentGps.map((c: any) => c.lng)),
          maxLng: Math.max(...parentGps.map((c: any) => c.lng)),
        };
        gpsCoordinates = lot.vertices.map((v: any) => ({
          lat: bb.minLat + v.y * (bb.maxLat - bb.minLat),
          lng: bb.minLng + v.x * (bb.maxLng - bb.minLng),
        }));
      }
      
      await supabase.from('subdivision_lots').insert({
        subdivision_request_id: request.id,
        parcel_number: request.parcel_number,
        lot_number: lot.lotNumber || lot.id,
        lot_label: `Lot ${lot.lotNumber}`,
        area_sqm: lot.areaSqm || 0,
        perimeter_m: lot.perimeterM || 0,
        intended_use: lot.intendedUse || 'residential',
        owner_name: lot.ownerName || null,
        is_built: lot.isBuilt || false,
        has_fence: lot.hasFence || false,
        gps_coordinates: gpsCoordinates,
        plan_coordinates: lot.vertices || null,
        color: lot.color || '#22c55e',
      } as any); // Dynamic lot data
    }
  };

  const submitAction = async () => {
    if (!selectedRequest || !actionType || !user) return;
    setProcessing(true);
    try {
      const updates: any = {
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        processing_notes: processingNotes || null,
      };

      if (actionType === 'approve') {
        const fee = parseFloat(processingFee);
        if (isNaN(fee) || fee < 0) {
          toast({ title: 'Erreur', description: 'Montant invalide.', variant: 'destructive' });
          setProcessing(false);
          return;
        }
        updates.status = fee > 0 ? 'awaiting_payment' : 'approved';
        updates.processing_fee_usd = fee;
        updates.total_amount_usd = (selectedRequest.submission_fee_usd || 20) + fee;
        if (fee === 0) updates.approved_at = new Date().toISOString();
      } else {
        if (!rejectionReason.trim()) {
          toast({ title: 'Erreur', description: 'Motif de rejet requis.', variant: 'destructive' });
          setProcessing(false);
          return;
        }
        updates.status = 'rejected';
        updates.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from('subdivision_requests')
        .update(updates)
        .eq('id', selectedRequest.id);
      if (error) throw error;

      // On approval, save lots for map display and generate certificate
      if (actionType === 'approve' && updates.status === 'approved') {
        await saveApprovedLots(selectedRequest);
        
        const fullName = `${selectedRequest.requester_first_name} ${selectedRequest.requester_last_name}`;
        await generateAndUploadCertificate(
          'lotissement',
          {
            referenceNumber: selectedRequest.reference_number,
            recipientName: fullName,
            parcelNumber: selectedRequest.parcel_number,
            issueDate: new Date().toISOString(),
            approvedBy: 'Bureau d\'Information Cadastrale',
            additionalData: { requestId: selectedRequest.id },
          },
          [
            { label: 'Nombre de lots:', value: String(selectedRequest.lots_data?.length || 0) },
            { label: 'Surface totale:', value: `${selectedRequest.parent_parcel_area_sqm} m²` },
            { label: 'Frais:', value: `$${updates.total_amount_usd}` },
          ],
          user.id
        );
      }

      // Notification
      await supabase.from('notifications').insert({
        user_id: selectedRequest.user_id,
        type: actionType === 'approve' ? 'success' : 'error',
        title: actionType === 'approve' ? 'Lotissement approuvé' : 'Lotissement rejeté',
        message: actionType === 'approve'
          ? `Votre demande ${selectedRequest.reference_number} a été approuvée. Le plan est maintenant visible sur la carte cadastrale.`
          : `Votre demande ${selectedRequest.reference_number} a été rejetée. Motif: ${rejectionReason}`,
        action_url: '/user-dashboard?tab=subdivisions',
      });

      toast({
        title: actionType === 'approve' ? 'Demande approuvée' : 'Demande rejetée',
        description: `${selectedRequest.reference_number} traitée.`,
      });
      setShowActionDialog(false);
      fetchRequests();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Grid3X3 className="h-6 w-6 text-primary" />
            Demandes de Lotissement
          </h2>
          <p className="text-muted-foreground">Gérez les demandes de subdivision de parcelles</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <Clock className="h-3 w-3" /> {pendingCount} en attente
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={fetchRequests} className="gap-1">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tous</SelectItem>
                {Object.entries(SUBDIVISION_STATUS_MAP).map(([v]) => {
                  const labels: Record<string, string> = { pending: 'En attente', in_review: 'En examen', approved: 'Approuvé', rejected: 'Rejeté', awaiting_payment: 'Attente paiement', completed: 'Terminé' };
                  return <SelectItem key={v} value={v}>{labels[v] || v}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : paginatedRequests.length === 0 ? (
            <div className="text-center py-12">
              <Grid3X3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Aucune demande trouvée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedRequests.map(request => (
                <div key={request.id} className="p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">{request.reference_number}</Badge>
                        <Badge className={statusConfig[request.status]?.color || 'bg-muted'}>{statusConfig[request.status]?.label || request.status}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /><span className="font-mono">{request.parcel_number}</span></div>
                        <div className="flex items-center gap-1 text-muted-foreground"><User className="h-3.5 w-3.5" /><span>{request.requester_last_name} {request.requester_first_name}</span></div>
                        <div className="flex items-center gap-1 text-muted-foreground"><Grid3X3 className="h-3.5 w-3.5" /><span>{request.number_of_lots} lots</span></div>
                        <div className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" /><span>{format(new Date(request.created_at), 'dd/MM/yyyy', { locale: fr })}</span></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setSelectedRequest(request); setShowDetailsDialog(true); }} className="gap-1">
                        <Eye className="h-4 w-4" /> Détails
                      </Button>
                      {request.status === 'pending' && (
                        <>
                          <Button size="sm" onClick={() => handleAction(request, 'approve')} className="gap-1"><Check className="h-4 w-4" /> Approuver</Button>
                          <Button variant="destructive" size="sm" onClick={() => handleAction(request, 'reject')} className="gap-1"><X className="h-4 w-4" /> Rejeter</Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">Page {page}/{totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Grid3X3 className="h-5 w-5 text-primary" /> Détails</DialogTitle>
            <DialogDescription>{selectedRequest?.reference_number}</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <ScrollArea className="max-h-[calc(90vh-150px)]">
              <div className="space-y-4 p-1">
                <div className="flex items-center justify-between">
                  <Badge className={statusConfig[selectedRequest.status]?.color}>{statusConfig[selectedRequest.status]?.label}</Badge>
                  <span className="text-sm text-muted-foreground">{format(new Date(selectedRequest.created_at), 'PPP', { locale: fr })}</span>
                </div>
                <Card>
                  <CardContent className="pt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Parcelle:</span> <span className="font-mono ml-1">{selectedRequest.parcel_number}</span></div>
                    <div><span className="text-muted-foreground">Surface:</span> <span className="ml-1">{selectedRequest.parent_parcel_area_sqm?.toLocaleString()} m²</span></div>
                    <div><span className="text-muted-foreground">Propriétaire:</span> <span className="ml-1">{selectedRequest.parent_parcel_owner_name}</span></div>
                    <div><span className="text-muted-foreground">Lots:</span> <span className="ml-1 font-bold">{selectedRequest.number_of_lots}</span></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="text-sm font-semibold mb-2">Lots</h4>
                    <div className="space-y-1">
                      {(selectedRequest.lots_data || []).map((lot: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: lot.color || '#22c55e' }} />
                            <span>Lot {lot.lotNumber || i + 1}</span>
                          </div>
                          <Badge variant="outline"><Square className="h-3 w-3 mr-1" />{(lot.areaSqm || 0).toLocaleString()} m²</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Demandeur:</span> <span className="ml-1">{selectedRequest.requester_last_name} {selectedRequest.requester_first_name}</span></div>
                    <div><span className="text-muted-foreground">Tél:</span> <span className="ml-1">{selectedRequest.requester_phone}</span></div>
                    <div><span className="text-muted-foreground">Frais:</span> <span className="ml-1 font-bold">${selectedRequest.total_amount_usd}</span></div>
                    {selectedRequest.purpose_of_subdivision && <div className="col-span-2"><span className="text-muted-foreground">Motif:</span> <span className="ml-1">{selectedRequest.purpose_of_subdivision}</span></div>}
                  </CardContent>
                </Card>
                {selectedRequest.rejection_reason && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription><strong>Motif du rejet:</strong> {selectedRequest.rejection_reason}</AlertDescription>
                  </Alert>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionType === 'approve' ? 'Approuver' : 'Rejeter'} la demande</DialogTitle>
            <DialogDescription>{selectedRequest?.reference_number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {actionType === 'approve' ? (
              <div className="space-y-2">
                <Label>Frais de traitement ($)</Label>
                <Input type="number" value={processingFee} onChange={e => setProcessingFee(e.target.value)} placeholder="0" />
                <p className="text-xs text-muted-foreground">Entrez 0 si aucun frais supplémentaire.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Motif du rejet *</Label>
                <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Raison..." rows={3} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes internes (optionnel)</Label>
              <Textarea value={processingNotes} onChange={e => setProcessingNotes(e.target.value)} placeholder="Notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>Annuler</Button>
            <Button variant={actionType === 'approve' ? 'default' : 'destructive'} onClick={submitAction} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : actionType === 'approve' ? <Check className="h-4 w-4 mr-2" /> : <X className="h-4 w-4 mr-2" />}
              {actionType === 'approve' ? 'Approuver' : 'Rejeter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminSubdivisionRequests;
