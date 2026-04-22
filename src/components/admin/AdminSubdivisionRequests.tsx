import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { generateAndUploadCertificate } from '@/utils/certificateService';
import { downloadCsv } from '@/utils/adminQueueUtils';
import { validateSubdivisionAgainstRules, type ValidationResult } from '@/hooks/useZoningRules';
import {
  type SubdivisionRequest, type ActionType,
  STATUS_LABELS, OPEN_STATUSES,
} from './subdivision/requests/types';
import { openDocument } from './subdivision/requests/helpers';
import { RequestsToolbar } from './subdivision/requests/RequestsToolbar';
import { RequestsList } from './subdivision/requests/RequestsList';
import { RequestDetailsDialog } from './subdivision/requests/RequestDetailsDialog';
import { RequestActionDialog } from './subdivision/requests/RequestActionDialog';

const ITEMS_PER_PAGE = 10;

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
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [processingFee, setProcessingFee] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [processingNotes, setProcessingNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [page, setPage] = useState(1);
  const [validations, setValidations] = useState<Record<string, ValidationResult>>({});

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subdivision_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRequests((data || []) as SubdivisionRequest[]);
    } catch {
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

  const paginatedRequests = filteredRequests.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  // Lazy compliance check for visible rows
  useEffect(() => {
    paginatedRequests.forEach(req => {
      if (validations[req.id]) return;
      if (!OPEN_STATUSES.includes(req.status)) return;
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

  const handleAction = (request: SubdivisionRequest, action: ActionType) => {
    setSelectedRequest(request);
    setActionType(action);
    setProcessingFee('');
    setRejectionReason('');
    setReturnReason('');
    setProcessingNotes('');
    setShowActionDialog(true);
  };

  const handleOpenDocument = (path: string | null | undefined) =>
    openDocument(path, msg =>
      toast({
        title: path ? 'Aperçu indisponible' : 'Document indisponible',
        description: msg,
        variant: 'destructive',
      }),
    );

  const submitAction = async () => {
    if (!selectedRequest || !actionType || !user) return;
    setProcessing(true);
    try {
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
            user.id,
          );
        } catch (certErr) {
          console.warn('Certificate generation failed (non-blocking):', certErr);
        }
      }

      const labels = { approve: 'approuvée', reject: 'rejetée', return: 'renvoyée' } as const;
      toast({
        title: `Demande ${labels[actionType]}`,
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
      <RequestsToolbar
        pendingCount={pendingCount}
        loading={loading}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        dateFrom={dateFrom} setDateFrom={setDateFrom}
        dateTo={dateTo} setDateTo={setDateTo}
        sortBy={sortBy} setSortBy={setSortBy}
        onRefresh={fetchRequests}
        onExport={handleExportCsv}
      />

      <RequestsList
        loading={loading}
        rows={paginatedRequests}
        validations={validations}
        page={page}
        totalPages={totalPages}
        setPage={setPage}
        onOpenDetails={(req) => { setSelectedRequest(req); setShowDetailsDialog(true); }}
        onStartReview={handleStartReview}
        onAction={handleAction}
      />

      <RequestDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        request={selectedRequest}
        onOpenDocument={handleOpenDocument}
      />

      <RequestActionDialog
        open={showActionDialog}
        onOpenChange={setShowActionDialog}
        actionType={actionType}
        request={selectedRequest}
        processing={processing}
        processingFee={processingFee} setProcessingFee={setProcessingFee}
        rejectionReason={rejectionReason} setRejectionReason={setRejectionReason}
        returnReason={returnReason} setReturnReason={setReturnReason}
        processingNotes={processingNotes} setProcessingNotes={setProcessingNotes}
        onSubmit={submitAction}
      />
    </div>
  );
}

export default AdminSubdivisionRequests;
