import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { asUntypedPayload } from '@/integrations/supabase/untyped';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { generateAndUploadCertificate } from '@/utils/certificateService';
import { downloadCsv } from '@/utils/adminQueueUtils';
import { escapeIlike } from '@/utils/escapeIlike';
import { useAdminPendingCounts } from '@/hooks/useAdminPendingCounts';
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
import { BulkActionsBar } from './subdivision/requests/BulkActionsBar';
import { BulkReasonDialog } from './subdivision/requests/BulkReasonDialog';
import { useAdminAnalytics } from '@/lib/adminAnalytics';

// In-memory TTL cache (remplace sessionStorage validationCache, scoped au runtime onglet admin)
const VALIDATION_TTL_MS = 5 * 60 * 1000;
const validationMemCache = new Map<string, { result: ValidationResult; ts: number }>();
const getCachedValidation = (id: string): ValidationResult | null => {
  const e = validationMemCache.get(id);
  if (!e) return null;
  if (Date.now() - e.ts > VALIDATION_TTL_MS) { validationMemCache.delete(id); return null; }
  return e.result;
};
const setCachedValidation = (id: string, result: ValidationResult) => {
  validationMemCache.set(id, { result, ts: Date.now() });
};
const invalidateValidation = (id: string) => { validationMemCache.delete(id); };

const ITEMS_PER_PAGE = 10;

export function AdminSubdivisionRequests() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { trackAdminAction } = useAdminAnalytics();
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | 'return' | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleSelectAllVisible = () => {
    const visibleIds = paginatedRequests.map(r => r.id);
    const allSelected = visibleIds.every(id => selectedIds.includes(id));
    setSelectedIds(prev =>
      allSelected
        ? prev.filter(id => !visibleIds.includes(id))
        : Array.from(new Set([...prev, ...visibleIds])),
    );
  };

  const [totalCount, setTotalCount] = useState(0);
  const { counts } = useAdminPendingCounts(true);
  const pendingCount = counts.subdivisions;

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let q = supabase
        .from('subdivision_requests')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: sortBy === 'oldest' });

      if (statusFilter !== '_all') q = q.eq('status', statusFilter);
      if (dateFrom) q = q.gte('created_at', new Date(dateFrom).toISOString());
      if (dateTo) q = q.lte('created_at', new Date(new Date(dateTo).getTime() + 86400000).toISOString());
      if (searchQuery.trim()) {
        const s = escapeIlike(searchQuery.trim());
        q = q.or(`reference_number.ilike.%${s}%,parcel_number.ilike.%${s}%,requester_last_name.ilike.%${s}%`);
      }

      const { data, error, count } = await q.range(from, to);
      if (error) throw error;
      setRequests((data || []) as SubdivisionRequest[]);
      setTotalCount(count || 0);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les demandes.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch unique : reset page→1 sur changement de filtres SANS double fetch.
  const filtersKey = `${statusFilter}|${dateFrom}|${dateTo}|${sortBy}|${searchQuery}`;
  const lastFiltersKeyRef = useRef(filtersKey);
  useEffect(() => {
    const filtersChanged = lastFiltersKeyRef.current !== filtersKey;
    lastFiltersKeyRef.current = filtersKey;
    if (filtersChanged && page !== 1) {
      setPage(1); // un seul fetch sera émis au prochain run (page=1, filtersChanged=false)
      return;
    }
    const t = setTimeout(() => { fetchRequests(); }, searchQuery ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filtersKey]);

  const paginatedRequests = requests; // already paginated server-side
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  // Lazy compliance check w/ TTL cache (5 min)
  useEffect(() => {
    paginatedRequests.forEach(req => {
      if (validations[req.id]) return;
      if (!OPEN_STATUSES.includes(req.status)) return;
      const cached = getCachedValidation(req.id);
      if (cached) {
        setValidations(prev => ({ ...prev, [req.id]: cached }));
        return;
      }
      validateSubdivisionAgainstRules(req.id).then(res => {
        setCachedValidation(req.id, res);
        setValidations(prev => ({ ...prev, [req.id]: res }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);

  const handleStartReview = async (req: SubdivisionRequest) => {
    if (!user) return;
    const { error } = await supabase
      .from('subdivision_requests')
      .update(asUntypedPayload({
        status: 'in_review',
        assigned_to: user.id,
        assigned_at: new Date().toISOString(),
        in_review_at: new Date().toISOString(),
      }))
      .eq('id', req.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Demande mise en examen' });
      trackAdminAction({
        module: 'subdivision',
        action: 'start_review',
        ref: { request_id: req.id, reference_number: req.reference_number },
      });
      fetchRequests();
    }
  };

  const handleExportCsv = async () => {
    // Re-fetch all matching rows (server-side filters), bypassing pagination.
    let q = supabase
      .from('subdivision_requests')
      .select('*')
      .order('created_at', { ascending: sortBy === 'oldest' })
      .limit(5000);
    if (statusFilter !== '_all') q = q.eq('status', statusFilter);
    if (dateFrom) q = q.gte('created_at', new Date(dateFrom).toISOString());
    if (dateTo) q = q.lte('created_at', new Date(new Date(dateTo).getTime() + 86400000).toISOString());
    if (searchQuery.trim()) {
      const s = escapeIlike(searchQuery.trim());
      q = q.or(`reference_number.ilike.%${s}%,parcel_number.ilike.%${s}%,requester_last_name.ilike.%${s}%`);
    }
    const { data, error } = await q;
    if (error) {
      toast({ title: 'Erreur export', description: error.message, variant: 'destructive' });
      return;
    }
    const rows = (data || []).map((r: any) => ({
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
      trackAdminAction({
        module: 'subdivision',
        action: actionType,
        ref: { request_id: selectedRequest.id, reference_number: selectedRequest.reference_number },
      });
      setShowActionDialog(false);
      invalidateValidation(selectedRequest.id);
      setValidations(prev => { const n = { ...prev }; delete n[selectedRequest.id]; return n; });
      fetchRequests();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReassignOne = async (req: SubdivisionRequest, assigneeId: string) => {
    const { error } = await supabase
      .from('subdivision_requests')
      .update(asUntypedPayload({ assigned_to: assigneeId, assigned_at: new Date().toISOString() }))
      .eq('id', req.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Demande réassignée', description: req.reference_number });
      trackAdminAction({
        module: 'subdivision',
        action: 'reassign',
        ref: { request_id: req.id, reference_number: req.reference_number },
        meta: { assignee_id: assigneeId },
      });
      fetchRequests();
    }
  };

  const handleBulkReassign = async (assigneeId: string) => {
    if (selectedIds.length === 0) return;
    setBulkProcessing(true);
    const { error } = await supabase
      .from('subdivision_requests')
      .update(asUntypedPayload({ assigned_to: assigneeId, assigned_at: new Date().toISOString() }))
      .in('id', selectedIds);
    setBulkProcessing(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `${selectedIds.length} demande(s) réassignée(s)` });
      trackAdminAction({
        module: 'subdivision',
        action: 'bulk_reassign',
        meta: { count: selectedIds.length, assignee_id: assigneeId },
      });
      setSelectedIds([]);
      fetchRequests();
    }
  };

  const handleBulkConfirm = async (payload: { reason?: string; processingFee?: number; notes?: string }) => {
    if (!bulkAction || selectedIds.length === 0 || !user) return;
    setBulkProcessing(true);
    const idsSnapshot = [...selectedIds];
    const failures: Array<{ id: string; error: string }> = [];
    let success = 0;

    // Chunked parallel execution (5 at a time) — replaces sequential await loop.
    const CHUNK = 5;
    for (let i = 0; i < idsSnapshot.length; i += CHUNK) {
      const chunk = idsSnapshot.slice(i, i + CHUNK);
      const results = await Promise.allSettled(
        chunk.map(id =>
          supabase.functions.invoke('approve-subdivision', {
            body: {
              request_id: id,
              action: bulkAction,
              processing_fee_usd: bulkAction === 'approve' ? payload.processingFee : undefined,
              rejection_reason: bulkAction !== 'approve' ? payload.reason : undefined,
              processing_notes: payload.notes,
            },
          }).then(({ error }) => {
            if (error) throw new Error(error.message);
            return id;
          }),
        ),
      );
      results.forEach((res, idx) => {
        if (res.status === 'fulfilled') success += 1;
        else failures.push({ id: chunk[idx], error: (res.reason as Error)?.message || 'unknown' });
      });
    }

    setBulkProcessing(false);
    setBulkAction(null);
    idsSnapshot.forEach(id => invalidateValidation(id));
    setValidations(prev => {
      const n = { ...prev };
      idsSnapshot.forEach(id => { delete n[id]; });
      return n;
    });
    setSelectedIds([]);
    fetchRequests();
    trackAdminAction({
      module: 'subdivision',
      action: `bulk_${bulkAction}`,
      meta: { count: idsSnapshot.length, success, failed: failures.length },
    });

    if (failures.length > 0) {
      // Téléchargement CSV des échecs pour analyse
      downloadCsv(
        `bulk-lotissement-echecs-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`,
        failures.map(f => ({ request_id: f.id, error: f.error })),
      );
    }

    toast({
      title: 'Action groupée terminée',
      description: `${success} succès, ${failures.length} échec(s)${failures.length > 0 ? ' — CSV exporté' : ''}.`,
      variant: failures.length > 0 ? 'destructive' : 'default',
    });
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

      <BulkActionsBar
        selectedCount={selectedIds.length}
        processing={bulkProcessing}
        onClear={() => setSelectedIds([])}
        onBulk={(action) => setBulkAction(action)}
        onReassign={handleBulkReassign}
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
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAllVisible}
        onReassignOne={handleReassignOne}
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

      <BulkReasonDialog
        open={!!bulkAction}
        onOpenChange={(o) => !o && setBulkAction(null)}
        action={bulkAction}
        count={selectedIds.length}
        processing={bulkProcessing}
        onConfirm={handleBulkConfirm}
      />
    </div>
  );
}

export default AdminSubdivisionRequests;
