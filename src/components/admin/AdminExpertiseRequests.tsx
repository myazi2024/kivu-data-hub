import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { FileSearch, Download, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { exportToCSV } from '@/utils/csvExport';
import { STATUS_LABELS } from '@/constants/expertiseLabels';
import type { ExpertiseRequest } from '@/types/expertise';
import ExpertiseStatsCards from './expertise/ExpertiseStatsCards';
import ExpertiseFilters from './expertise/ExpertiseFilters';
import ExpertiseProcessDialog from './expertise/ExpertiseProcessDialog';
import ExpertiseRequestsTable from './expertise/ExpertiseRequestsTable';
import ExpertiseDetailsDialog from './expertise/ExpertiseDetailsDialog';
import ExpertiseAssignDialog from './expertise/ExpertiseAssignDialog';
import { useExpertiseStats } from '@/hooks/useExpertiseStats';
import { useExpertiseProcessing, initialDraft, type ProcessDraft } from '@/hooks/useExpertiseProcessing';
import { useDebounce } from '@/hooks/useDebounce';
import { escapeIlike } from '@/utils/escapeIlike';

const ITEMS_PER_PAGE = 10;

interface PageResult {
  rows: ExpertiseRequest[];
  total: number;
}

const fetchExpertisePage = async (
  page: number,
  status: string,
  search: string,
): Promise<PageResult> => {
  let query = supabase
    .from('real_estate_expertise_requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status !== '_all') query = query.eq('status', status);

  if (search.trim()) {
    const safe = escapeIlike(search.trim());
    if (safe) {
      query = query.or(
        `reference_number.ilike.%${safe}%,parcel_number.ilike.%${safe}%,requester_name.ilike.%${safe}%`
      );
    }
  }

  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;
  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  return { rows: (data || []) as ExpertiseRequest[], total: count || 0 };
};

const fetchExpertiseAll = async (status: string, search: string): Promise<ExpertiseRequest[]> => {
  let query = supabase
    .from('real_estate_expertise_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5000);
  if (status !== '_all') query = query.eq('status', status);
  if (search.trim()) {
    const safe = escapeIlike(search.trim());
    if (safe) query = query.or(`reference_number.ilike.%${safe}%,parcel_number.ilike.%${safe}%,requester_name.ilike.%${safe}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as ExpertiseRequest[];
};

export const AdminExpertiseRequests: React.FC = () => {
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<string>('_all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [selectedRequest, setSelectedRequest] = useState<ExpertiseRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [draft, setDraft] = useState<ProcessDraft>(initialDraft);

  const queryKey = useMemo(
    () => ['admin-expertise', currentPage, statusFilter, debouncedSearch] as const,
    [currentPage, statusFilter, debouncedSearch]
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchExpertisePage(currentPage, statusFilter, debouncedSearch),
    staleTime: 15_000,
  });
  const requests = data?.rows ?? [];
  const totalCount = data?.total ?? 0;

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['admin-expertise'] });
    qc.invalidateQueries({ queryKey: ['admin-expertise-stats'] });
  }, [qc]);

  const { data: stats } = useExpertiseStats();
  const processing = useExpertiseProcessing(refresh);

  const handleViewDetails = (request: ExpertiseRequest) => {
    setSelectedRequest(request); setShowDetailsDialog(true);
  };

  const handleOpenProcess = (request: ExpertiseRequest) => {
    setSelectedRequest(request);
    setDraft({
      ...initialDraft,
      marketValue: request.market_value_usd?.toString() || '',
      processingNotes: request.processing_notes || '',
    });
    setShowProcessDialog(true);
  };

  const handleAssignOpen = (request: ExpertiseRequest) => {
    setSelectedRequest(request); setShowAssignDialog(true);
  };

  const handleEscalate = async (request: ExpertiseRequest) => {
    if (!confirm('Escalader cette demande ?')) return;
    try {
      await processing.escalate(request.id, 'Escalade manuelle depuis le tableau');
      toast.success('Demande escaladée');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleConfirmProcess = async () => {
    if (!selectedRequest) return;
    try {
      await processing.processDecision(selectedRequest, draft);
      setShowProcessDialog(false);
    } catch { /* toast handled in hook */ }
  };

  const handleUploadStamp = async (file: File) => {
    const url = await processing.uploadStamp(file);
    if (url) setDraft((d) => ({ ...d, stampImageUrl: url }));
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((curr) => curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id]);

  const toggleSelectAll = () => {
    if (requests.every(r => selectedIds.includes(r.id))) {
      setSelectedIds(curr => curr.filter(id => !requests.some(r => r.id === id)));
    } else {
      const merged = new Set(selectedIds);
      requests.forEach(r => merged.add(r.id));
      setSelectedIds(Array.from(merged));
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    const reason = prompt('Motif de rejet appliqué à toutes les demandes sélectionnées :');
    if (!reason || !reason.trim()) return;
    let ok = 0, ko = 0;
    for (const id of selectedIds) {
      try { await processing.reject(id, reason.trim()); ok++; } catch { ko++; }
    }
    toast[ko === 0 ? 'success' : 'warning'](`Rejet : ${ok} ok / ${ko} échec`);
    setSelectedIds([]);
  };

  const handleExportFiltered = async () => {
    try {
      const all = await fetchExpertiseAll(statusFilter, debouncedSearch);
      exportToCSV({
        filename: `expertises_${format(new Date(), 'yyyy-MM-dd')}.csv`,
        headers: ['Référence','Parcelle','Demandeur','Email','Statut','Paiement','Valeur USD','Date'],
        data: all.map(r => [
          r.reference_number, r.parcel_number, r.requester_name, r.requester_email || '',
          STATUS_LABELS[r.status] || r.status,
          r.payment_status || '',
          r.market_value_usd?.toString() || '',
          format(new Date(r.created_at), 'dd/MM/yyyy'),
        ]),
      });
      toast.success(`Export : ${all.length} lignes`);
    } catch (e: any) { toast.error(`Export impossible : ${e.message}`); }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileSearch className="h-6 w-6 text-primary" />
            Demandes d'expertise immobilière
          </h2>
          <p className="text-muted-foreground text-sm">
            Gérez les évaluations de valeur vénale (assignation, audit, SLA)
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportFiltered}>
            <Download className="h-4 w-4 mr-2" />Exporter CSV
          </Button>
          {selectedIds.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleBulkReject}>
              Rejeter ({selectedIds.length})
            </Button>
          )}
        </div>
      </div>

      <ExpertiseStatsCards
        stats={{
          total: stats?.total ?? 0,
          pending: stats?.pending ?? 0,
          assigned: stats?.assigned ?? 0,
          in_progress: stats?.in_progress ?? 0,
          completed: stats?.completed ?? 0,
          rejected: stats?.rejected ?? 0,
          overdue: stats?.overdue ?? 0,
          unpaid: stats?.unpaid ?? 0,
        }}
      />

      <ExpertiseFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        onFiltersChange={() => setCurrentPage(1)}
      />

      <ExpertiseRequestsTable
        loading={isLoading}
        requests={requests}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onViewDetails={handleViewDetails}
        onProcess={handleOpenProcess}
        onAssign={handleAssignOpen}
        onEscalate={handleEscalate}
      />

      {totalCount > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Button variant="outline" size="sm" disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}>Précédent</Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} sur {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}>Suivant</Button>
        </div>
      )}

      <ExpertiseDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        request={selectedRequest}
      />

      <ExpertiseAssignDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        request={selectedRequest}
        onAssigned={refresh}
      />

      <ExpertiseProcessDialog
        open={showProcessDialog}
        onOpenChange={setShowProcessDialog}
        request={selectedRequest}
        draft={draft}
        onDraftChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
        uploadingStamp={processing.uploadingStamp}
        onUploadStamp={handleUploadStamp}
        processing={processing.processing}
        onConfirm={handleConfirmProcess}
      />
    </div>
  );
};

export default AdminExpertiseRequests;
