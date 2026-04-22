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
  ChevronLeft, ChevronRight, Square, RotateCcw, Mail, Phone,
  TreePine, Route, Shield, Paperclip, Download, Eye as EyeIcon, Flame, ShieldCheck, ShieldAlert
} from 'lucide-react';
import { generateAndUploadCertificate } from '@/utils/certificateService';
import { StatusBadge, StatusType } from '@/components/shared/StatusBadge';
import { computeSla, downloadCsv } from '@/utils/adminQueueUtils';
import { validateSubdivisionAgainstRules, type ValidationResult } from '@/hooks/useZoningRules';

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
  parent_parcel_title_type?: string;
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
  requester_id_document_url?: string | null;
  proof_of_ownership_url?: string | null;
  subdivision_sketch_url?: string | null;
  assigned_to?: string | null;
  assigned_at?: string | null;
  in_review_at?: string | null;
  estimated_processing_days?: number;
  escalated?: boolean;
  escalated_at?: string | null;
}

const SUBDIVISION_STATUS_MAP: Record<string, StatusType> = {
  pending: 'pending',
  in_review: 'in_review',
  approved: 'approved',
  rejected: 'rejected',
  returned: 'returned',
  awaiting_payment: 'processing',
  completed: 'completed',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  in_review: 'En examen',
  approved: 'Approuvé',
  rejected: 'Rejeté',
  returned: 'Renvoyé',
  awaiting_payment: 'Attente paiement',
  completed: 'Terminé',
};

const PURPOSE_LABELS: Record<string, string> = {
  sale: 'Vente',
  inheritance: 'Succession / Héritage',
  investment: 'Investissement immobilier',
  construction: 'Construction de logements',
  donation: 'Donation',
  family: 'Partage familial',
  commercial: 'Projet commercial',
  other: 'Autre',
  // Legacy labels (backward compat)
  family_distribution: 'Distribution familiale',
  development: 'Aménagement immobilier',
  'Vente': 'Vente',
  'Succession / Héritage': 'Succession / Héritage',
  'Investissement immobilier': 'Investissement immobilier',
  'Construction de logements': 'Construction de logements',
  'Donation': 'Donation',
  'Partage familial': 'Partage familial',
  'Projet commercial': 'Projet commercial',
  'Autre': 'Autre',
};

const REQUESTER_TYPE_LABELS: Record<string, string> = {
  owner: 'Propriétaire',
  mandatary: 'Mandataire',
  notary: 'Notaire',
  other: 'Autre',
};

const USAGE_LABELS: Record<string, string> = {
  residential: 'Résidentiel',
  commercial: 'Commercial',
  industrial: 'Industriel',
  agricultural: 'Agricole',
  mixed: 'Mixte',
};

export function AdminSubdivisionRequests() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [requests, setRequests] = useState<SubdivisionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('_all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest'>('recent');
  const [selectedRequest, setSelectedRequest] = useState<SubdivisionRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'return' | null>(null);
  const [processingFee, setProcessingFee] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [processingNotes, setProcessingNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [page, setPage] = useState(1);
  const [validations, setValidations] = useState<Record<string, ValidationResult>>({});
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

  const filteredRequests = requests
    .filter(req => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = req.reference_number.toLowerCase().includes(q) ||
        req.parcel_number.toLowerCase().includes(q) ||
        req.requester_last_name.toLowerCase().includes(q);
      const matchesStatus = statusFilter === '_all' || req.status === statusFilter;
      const created = new Date(req.created_at).getTime();
      const matchesFrom = !dateFrom || created >= new Date(dateFrom).getTime();
      const matchesTo = !dateTo || created <= new Date(dateTo).getTime() + 86400000;
      return matchesSearch && matchesStatus && matchesFrom && matchesTo;
    })
    .sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortBy === 'recent' ? db - da : da - db;
    });

  const paginatedRequests = filteredRequests.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  // Lazy compliance check for visible rows
  useEffect(() => {
    paginatedRequests.forEach(req => {
      if (validations[req.id]) return;
      if (!['pending', 'in_review', 'returned'].includes(req.status)) return;
      validateSubdivisionAgainstRules(req.id).then(res => {
        setValidations(prev => ({ ...prev, [req.id]: res }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filteredRequests.length]);

  const handleStartReview = async (req: SubdivisionRequest) => {
    if (!user) return;
    const { error } = await supabase
      .from('subdivision_requests')
      .update({
        status: 'in_review',
        assigned_to: user.id,
        assigned_at: new Date().toISOString(),
        in_review_at: new Date().toISOString(),
      } as any)
      .eq('id', req.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Demande mise en examen' });
      fetchRequests();
    }
  };

  const handleExportCsv = () => {
    const rows = filteredRequests.map(r => ({
      reference: r.reference_number,
      statut: STATUS_LABELS[r.status] || r.status,
      parcelle: r.parcel_number,
      demandeur: `${r.requester_last_name} ${r.requester_first_name}`,
      telephone: r.requester_phone,
      email: r.requester_email || '',
      lots: r.number_of_lots,
      surface_m2: r.parent_parcel_area_sqm,
      total_usd: r.total_amount_usd,
      affectee_a: r.assigned_to || '',
      escalade: r.escalated ? 'oui' : 'non',
      cree_le: format(new Date(r.created_at), 'yyyy-MM-dd HH:mm'),
    }));
    downloadCsv(`demandes-lotissement-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`, rows);
    toast({ title: `${rows.length} demandes exportées` });
  };

  const handleAction = (request: SubdivisionRequest, action: 'approve' | 'reject' | 'return') => {
    setSelectedRequest(request);
    setActionType(action);
    setProcessingFee('');
    setRejectionReason('');
    setReturnReason('');
    setProcessingNotes('');
    setShowActionDialog(true);
  };

  // Open a stored cadastral-documents path with a short-lived signed URL
  const openDocument = async (path: string | null | undefined) => {
    if (!path) {
      toast({ title: 'Document indisponible', variant: 'destructive' });
      return;
    }
    // Backward compat: legacy rows may still hold a full public URL — open as-is
    if (/^https?:\/\//i.test(path)) {
      window.open(path, '_blank', 'noopener,noreferrer');
      return;
    }
    const { data, error } = await supabase.storage
      .from('cadastral-documents')
      .createSignedUrl(path, 60 * 60);
    if (error || !data?.signedUrl) {
      toast({ title: 'Aperçu indisponible', description: error?.message, variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const submitAction = async () => {
    if (!selectedRequest || !actionType || !user) return;
    setProcessing(true);
    try {
      // Validate inputs locally for fast feedback
      if (actionType === 'approve') {
        const fee = parseFloat(processingFee);
        if (isNaN(fee) || fee < 0) {
          toast({ title: 'Erreur', description: 'Montant invalide.', variant: 'destructive' });
          setProcessing(false);
          return;
        }
      }
      if (actionType === 'reject' && !rejectionReason.trim()) {
        toast({ title: 'Erreur', description: 'Motif de rejet requis.', variant: 'destructive' });
        setProcessing(false);
        return;
      }
      if (actionType === 'return' && !returnReason.trim()) {
        toast({ title: 'Erreur', description: 'Motif du renvoi requis.', variant: 'destructive' });
        setProcessing(false);
        return;
      }

      // Atomic edge: status + lots + parcel flag + notification, with rollback on lot failure
      const { data, error } = await supabase.functions.invoke('approve-subdivision', {
        body: {
          request_id: selectedRequest.id,
          action: actionType,
          processing_fee_usd: actionType === 'approve' ? parseFloat(processingFee) : undefined,
          rejection_reason: actionType === 'reject' ? rejectionReason : (actionType === 'return' ? returnReason : undefined),
          processing_notes: processingNotes || undefined,
        },
      });
      if (error) throw error;

      // On approve+immediate (status === 'approved'), generate certificate
      if (actionType === 'approve' && data?.status === 'approved') {
        const fullName = `${selectedRequest.requester_first_name} ${selectedRequest.requester_last_name}`;
        const totalAmount = (selectedRequest.submission_fee_usd || 0) + parseFloat(processingFee);
        try {
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
              { label: 'Frais:', value: `$${totalAmount.toFixed(2)}` },
            ],
            user.id
          );
        } catch (certErr) {
          console.warn('Certificate generation failed (non-blocking):', certErr);
        }
      }

      const actionLabels = { approve: 'approuvée', reject: 'rejetée', return: 'renvoyée' };
      toast({
        title: `Demande ${actionLabels[actionType]}`,
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


  // Extract plan data helpers
  const getPlanRoads = (req: SubdivisionRequest) => {
    return req.subdivision_plan_data?.roads || [];
  };
  const getPlanCommonSpaces = (req: SubdivisionRequest) => {
    return req.subdivision_plan_data?.commonSpaces || [];
  };
  const getPlanServitudes = (req: SubdivisionRequest) => {
    return req.subdivision_plan_data?.servitudes || [];
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
          <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1">
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchRequests} className="gap-1">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[160px]"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tous</SelectItem>
                {Object.entries(STATUS_LABELS).map(([v, label]) => (
                  <SelectItem key={v} value={v}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="lg:w-[160px]" placeholder="Du" />
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="lg:w-[160px]" placeholder="Au" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'recent' | 'oldest')}>
              <SelectTrigger className="w-full lg:w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Plus récentes</SelectItem>
                <SelectItem value="oldest">Plus anciennes</SelectItem>
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
              {paginatedRequests.map(request => {
                const sla = computeSla(request.created_at, request.estimated_processing_days || 14);
                const validation = validations[request.id];
                const isOpen = ['pending', 'in_review', 'returned'].includes(request.status);
                const slaTone = sla.level === 'overdue'
                  ? 'border-destructive/50 bg-destructive/5'
                  : sla.level === 'warning'
                    ? 'border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/10'
                    : '';
                return (
                <div key={request.id} className={`p-4 border rounded-xl hover:bg-muted/50 transition-colors ${slaTone} ${request.escalated ? 'ring-1 ring-destructive/40' : ''}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono">{request.reference_number}</Badge>
                        <StatusBadge status={SUBDIVISION_STATUS_MAP[request.status] || 'pending'} compact />
                        {isOpen && (
                          <Badge
                            variant={sla.level === 'overdue' ? 'destructive' : sla.level === 'warning' ? 'default' : 'outline'}
                            className="gap-1 text-[10px]"
                          >
                            <Clock className="h-3 w-3" /> {sla.label}
                          </Badge>
                        )}
                        {request.escalated && (
                          <Badge variant="destructive" className="gap-1 text-[10px]">
                            <Flame className="h-3 w-3" /> Escaladée
                          </Badge>
                        )}
                        {validation && (
                          validation.valid ? (
                            <Badge variant="outline" className="gap-1 text-[10px] border-green-500/50 text-green-700 dark:text-green-400">
                              <ShieldCheck className="h-3 w-3" /> Conforme
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1 text-[10px]" title={validation.violations.map(v => v.message).join(' | ')}>
                              <ShieldAlert className="h-3 w-3" /> Non conforme ({validation.violations.length})
                            </Badge>
                          )
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /><span className="font-mono">{request.parcel_number}</span></div>
                        <div className="flex items-center gap-1 text-muted-foreground"><User className="h-3.5 w-3.5" /><span>{request.requester_last_name} {request.requester_first_name}</span></div>
                        <div className="flex items-center gap-1 text-muted-foreground"><Grid3X3 className="h-3.5 w-3.5" /><span>{request.number_of_lots} lots</span></div>
                        <div className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" /><span>{format(new Date(request.created_at), 'dd/MM/yyyy', { locale: fr })}</span></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => { setSelectedRequest(request); setShowDetailsDialog(true); }} className="gap-1">
                        <Eye className="h-4 w-4" /> Détails
                      </Button>
                      {request.status === 'pending' && (
                        <Button variant="outline" size="sm" onClick={() => handleStartReview(request)} className="gap-1">
                          <EyeIcon className="h-4 w-4" /> Mettre en examen
                        </Button>
                      )}
                      {(request.status === 'pending' || request.status === 'in_review' || request.status === 'returned') && (
                        <>
                          <Button size="sm" onClick={() => handleAction(request, 'approve')} className="gap-1"><Check className="h-4 w-4" /> Approuver</Button>
                          <Button variant="outline" size="sm" onClick={() => handleAction(request, 'return')} className="gap-1 text-amber-600 border-amber-300 hover:bg-amber-50"><RotateCcw className="h-4 w-4" /> Renvoyer</Button>
                          <Button variant="destructive" size="sm" onClick={() => handleAction(request, 'reject')} className="gap-1"><X className="h-4 w-4" /> Rejeter</Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
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
                  <StatusBadge status={SUBDIVISION_STATUS_MAP[selectedRequest.status] || 'pending'} />
                  <span className="text-sm text-muted-foreground">{format(new Date(selectedRequest.created_at), 'PPP', { locale: fr })}</span>
                </div>

                {/* Parcelle mère */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" /> Parcelle mère</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Parcelle:</span> <span className="font-mono ml-1">{selectedRequest.parcel_number}</span></div>
                    <div><span className="text-muted-foreground">Surface:</span> <span className="ml-1">{selectedRequest.parent_parcel_area_sqm?.toLocaleString()} m²</span></div>
                    <div><span className="text-muted-foreground">Propriétaire:</span> <span className="ml-1">{selectedRequest.parent_parcel_owner_name}</span></div>
                    <div><span className="text-muted-foreground">Localisation:</span> <span className="ml-1">{selectedRequest.parent_parcel_location || '—'}</span></div>
                    {selectedRequest.parent_parcel_title_reference && (
                      <div><span className="text-muted-foreground">Réf. titre:</span> <span className="ml-1">{selectedRequest.parent_parcel_title_reference}</span></div>
                    )}
                    {(selectedRequest as any).parent_parcel_title_type && (
                      <div><span className="text-muted-foreground">Type titre:</span> <span className="ml-1">{(selectedRequest as any).parent_parcel_title_type}</span></div>
                    )}
                  </CardContent>
                </Card>

                {/* Demandeur */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> Demandeur</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Nom:</span> <span className="ml-1">{selectedRequest.requester_last_name} {selectedRequest.requester_first_name} {selectedRequest.requester_middle_name || ''}</span></div>
                    <div className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-muted-foreground" /><span>{selectedRequest.requester_phone}</span></div>
                    {selectedRequest.requester_email && (
                      <div className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><span>{selectedRequest.requester_email}</span></div>
                    )}
                    {selectedRequest.requester_type && (
                      <div><span className="text-muted-foreground">Qualité:</span> <span className="ml-1">{REQUESTER_TYPE_LABELS[selectedRequest.requester_type] || selectedRequest.requester_type}</span></div>
                    )}
                  </CardContent>
                </Card>

                {/* Pièces justificatives — signed URLs on demand (private bucket) */}
                {(selectedRequest.requester_id_document_url || selectedRequest.proof_of_ownership_url || selectedRequest.subdivision_sketch_url) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><Paperclip className="h-4 w-4" /> Pièces justificatives</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {selectedRequest.requester_id_document_url && (
                        <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => openDocument(selectedRequest.requester_id_document_url)}>
                          <FileText className="h-3.5 w-3.5" /> Pièce d'identité du demandeur
                        </Button>
                      )}
                      {selectedRequest.proof_of_ownership_url && (
                        <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => openDocument(selectedRequest.proof_of_ownership_url)}>
                          <FileText className="h-3.5 w-3.5" /> Preuve de propriété
                        </Button>
                      )}
                      {selectedRequest.subdivision_sketch_url && (
                        <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => openDocument(selectedRequest.subdivision_sketch_url)}>
                          <FileText className="h-3.5 w-3.5" /> Croquis annexe
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
                <Card>
                  <CardContent className="pt-4 grid grid-cols-2 gap-3 text-sm">
                    {selectedRequest.purpose_of_subdivision && (
                      <div className="col-span-2"><span className="text-muted-foreground">Motif:</span> <span className="ml-1">{PURPOSE_LABELS[selectedRequest.purpose_of_subdivision] || selectedRequest.purpose_of_subdivision}</span></div>
                    )}
                    <div><span className="text-muted-foreground">Frais soumission:</span> <span className="ml-1">${selectedRequest.submission_fee_usd}</span></div>
                    <div><span className="text-muted-foreground">Total:</span> <span className="ml-1 font-bold">${selectedRequest.total_amount_usd}</span></div>
                  </CardContent>
                </Card>

                {/* Lots */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Grid3X3 className="h-4 w-4" /> {selectedRequest.number_of_lots} Lots</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {(selectedRequest.lots_data || []).map((lot: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: lot.color || '#22c55e' }} />
                            <span>Lot {lot.lotNumber || i + 1}</span>
                            {lot.intendedUse && <Badge variant="outline" className="text-[10px] px-1.5">{USAGE_LABELS[lot.intendedUse] || lot.intendedUse}</Badge>}
                          </div>
                          <Badge variant="outline"><Square className="h-3 w-3 mr-1" />{(lot.areaSqm || 0).toLocaleString()} m²</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Voies internes */}
                {getPlanRoads(selectedRequest).length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><Route className="h-4 w-4" /> Voies internes ({getPlanRoads(selectedRequest).length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {getPlanRoads(selectedRequest).map((road: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                            <span>{road.name || `Voie ${i + 1}`}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{road.widthM || '?'} m</Badge>
                              <Badge variant="outline">{road.surfaceType || '—'}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Espaces communs */}
                {getPlanCommonSpaces(selectedRequest).length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><TreePine className="h-4 w-4" /> Espaces communs ({getPlanCommonSpaces(selectedRequest).length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {getPlanCommonSpaces(selectedRequest).map((space: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                            <span>{space.name || space.type}</span>
                            <Badge variant="outline">{(space.areaSqm || 0).toLocaleString()} m²</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Servitudes */}
                {getPlanServitudes(selectedRequest).length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Servitudes ({getPlanServitudes(selectedRequest).length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {getPlanServitudes(selectedRequest).map((srv: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                            <span>{srv.description || srv.type}</span>
                            {srv.widthM && <Badge variant="outline">{srv.widthM} m</Badge>}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Rejection/return reason */}
                {selectedRequest.rejection_reason && (
                  <Alert variant={selectedRequest.status === 'returned' ? 'default' : 'destructive'}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{selectedRequest.status === 'returned' ? 'Motif du renvoi:' : 'Motif du rejet:'}</strong> {selectedRequest.rejection_reason}
                    </AlertDescription>
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
            <DialogTitle>
              {actionType === 'approve' ? 'Approuver' : actionType === 'return' ? 'Renvoyer pour correction' : 'Rejeter'} la demande
            </DialogTitle>
            <DialogDescription>{selectedRequest?.reference_number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {actionType === 'approve' && (
              <div className="space-y-2">
                <Label>Frais de traitement ($)</Label>
                <Input type="number" value={processingFee} onChange={e => setProcessingFee(e.target.value)} placeholder="0" />
                <p className="text-xs text-muted-foreground">Entrez 0 si aucun frais supplémentaire.</p>
              </div>
            )}
            {actionType === 'reject' && (
              <div className="space-y-2">
                <Label>Motif du rejet *</Label>
                <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Raison du rejet..." rows={3} />
              </div>
            )}
            {actionType === 'return' && (
              <div className="space-y-2">
                <Label>Motif du renvoi *</Label>
                <Textarea value={returnReason} onChange={e => setReturnReason(e.target.value)} placeholder="Éléments à corriger..." rows={3} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes internes (optionnel)</Label>
              <Textarea value={processingNotes} onChange={e => setProcessingNotes(e.target.value)} placeholder="Notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>Annuler</Button>
            <Button
              variant={actionType === 'approve' ? 'default' : actionType === 'return' ? 'outline' : 'destructive'}
              onClick={submitAction}
              disabled={processing}
              className={actionType === 'return' ? 'text-amber-600 border-amber-300 hover:bg-amber-50' : ''}
            >
              {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 
                actionType === 'approve' ? <Check className="h-4 w-4 mr-2" /> :
                actionType === 'return' ? <RotateCcw className="h-4 w-4 mr-2" /> :
                <X className="h-4 w-4 mr-2" />
              }
              {actionType === 'approve' ? 'Approuver' : actionType === 'return' ? 'Renvoyer' : 'Rejeter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminSubdivisionRequests;
