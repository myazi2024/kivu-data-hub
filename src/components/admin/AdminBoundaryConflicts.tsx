import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle2, Eye, MapPin, Download } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody, ResponsiveTableRow, ResponsiveTableCell, ResponsiveTableHead } from '@/components/ui/responsive-table';
import { StatusBadge, StatusType } from '@/components/shared/StatusBadge';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { exportToCSV } from '@/utils/csvExport';

interface BoundaryConflict {
  id: string;
  reporting_parcel_number: string;
  conflicting_parcel_number: string;
  conflict_type: string;
  description: string;
  status: string;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

const STATUS_MAP: Record<string, StatusType> = {
  pending: 'pending',
  investigating: 'in_review',
  resolved: 'completed',
};

const AdminBoundaryConflicts = () => {
  const [conflicts, setConflicts] = useState<BoundaryConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<BoundaryConflict | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('_all');

  useEffect(() => {
    fetchConflicts();
  }, []);

  const fetchConflicts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cadastral_boundary_conflicts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConflicts(data || []);
    } catch (error) {
      console.error('Error fetching conflicts:', error);
      toast.error('Erreur lors du chargement des conflits');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedConflict) return;
    
    try {
      const { error } = await supabase
        .from('cadastral_boundary_conflicts')
        .update({
          status: 'resolved',
          resolution_notes: resolutionNotes,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedConflict.id);

      if (error) throw error;
      toast.success('Conflit résolu');
      setDetailsOpen(false);
      setResolutionNotes('');
      fetchConflicts();
    } catch (error) {
      toast.error('Erreur lors de la résolution');
    }
  };

  const getConflictTypeLabel = (type: string) => {
    switch (type) {
      case 'overlap': return 'Chevauchement';
      case 'boundary_dispute': return 'Litige de limite';
      case 'encroachment': return 'Empiètement';
      default: return type;
    }
  };

  const filteredConflicts = filterStatus === '_all' 
    ? conflicts 
    : conflicts.filter(c => c.status === filterStatus);

  const pagination = usePagination(filteredConflicts, { initialPageSize: 15 });

  const pendingCount = conflicts.filter(c => c.status === 'pending').length;
  const investigatingCount = conflicts.filter(c => c.status === 'investigating').length;
  const resolvedCount = conflicts.filter(c => c.status === 'resolved').length;

  const handleExport = () => {
    exportToCSV({
      filename: `conflits_limites_${format(new Date(), 'yyyy-MM-dd')}.csv`,
      headers: ['Date', 'Parcelle déclarante', 'Parcelle en conflit', 'Type', 'Statut', 'Description'],
      data: filteredConflicts.map(c => [
        format(new Date(c.created_at), 'dd/MM/yyyy'),
        c.reporting_parcel_number,
        c.conflicting_parcel_number,
        getConflictTypeLabel(c.conflict_type),
        c.status,
        c.description
      ])
    });
  };

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header */}
      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm md:text-base font-bold">Conflits de Limites</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">Gestion des conflits entre parcelles</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="h-8 text-xs gap-1">
              <Download className="h-3 w-3" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={fetchConflicts} disabled={loading} className="h-8 text-xs">
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center cursor-pointer hover:bg-accent/50" onClick={() => setFilterStatus('pending')}>
          <p className="text-lg md:text-xl font-bold text-warning">{pendingCount}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">En attente</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center cursor-pointer hover:bg-accent/50" onClick={() => setFilterStatus('investigating')}>
          <p className="text-lg md:text-xl font-bold text-primary">{investigatingCount}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Investigation</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center cursor-pointer hover:bg-accent/50" onClick={() => setFilterStatus('resolved')}>
          <p className="text-lg md:text-xl font-bold text-success">{resolvedCount}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Résolus</p>
        </Card>
      </div>

      {/* Filter */}
      <Card className="p-2.5 bg-background rounded-xl shadow-sm border">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Tous les conflits</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="investigating">En investigation</SelectItem>
            <SelectItem value="resolved">Résolus</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {/* Conflicts Table */}
      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <h3 className="text-xs font-semibold mb-3">Liste des conflits ({filteredConflicts.length})</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : filteredConflicts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-8 w-8 mx-auto text-success mb-2" />
            <p className="text-xs text-muted-foreground">Aucun conflit</p>
          </div>
        ) : (
          <>
            <ResponsiveTable>
              <ResponsiveTableHeader>
                <ResponsiveTableRow>
                  <ResponsiveTableHead priority="high">Type</ResponsiveTableHead>
                  <ResponsiveTableHead priority="high">Parcelles</ResponsiveTableHead>
                  <ResponsiveTableHead priority="medium">Description</ResponsiveTableHead>
                  <ResponsiveTableHead priority="high">Statut</ResponsiveTableHead>
                  <ResponsiveTableHead priority="low">Date</ResponsiveTableHead>
                  <ResponsiveTableHead priority="high">Actions</ResponsiveTableHead>
                </ResponsiveTableRow>
              </ResponsiveTableHeader>
              <ResponsiveTableBody>
                {pagination.paginatedData.map((conflict) => (
                  <ResponsiveTableRow key={conflict.id}>
                    <ResponsiveTableCell priority="high" label="Type">
                      <span className="text-xs font-medium">{getConflictTypeLabel(conflict.conflict_type)}</span>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="high" label="Parcelles">
                      <div className="flex items-center gap-1 text-[10px]">
                        <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="truncate">{conflict.reporting_parcel_number} ↔ {conflict.conflicting_parcel_number}</span>
                      </div>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="medium" label="Description">
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{conflict.description}</p>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="high" label="Statut">
                      <StatusBadge status={STATUS_MAP[conflict.status] || 'pending'} compact />
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="low" label="Date">
                      <span className="text-[9px] text-muted-foreground">
                        {format(new Date(conflict.created_at), 'dd/MM/yy', { locale: fr })}
                      </span>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="high" label="Actions">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSelectedConflict(conflict); setDetailsOpen(true); }}>
                        <Eye className="h-3 w-3" />
                      </Button>
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                ))}
              </ResponsiveTableBody>
            </ResponsiveTable>

            {pagination.totalItems > 0 && (
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
            )}
          </>
        )}
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm">Détails du conflit</DialogTitle>
          </DialogHeader>
          {selectedConflict && (
            <div className="space-y-3 py-2">
              <div className="p-2.5 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground mb-1">Type de conflit</p>
                <p className="text-xs font-medium">{getConflictTypeLabel(selectedConflict.conflict_type)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Parcelle déclarante</p>
                  <p className="text-xs font-medium truncate">{selectedConflict.reporting_parcel_number}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Parcelle en conflit</p>
                  <p className="text-xs font-medium truncate">{selectedConflict.conflicting_parcel_number}</p>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground mb-1">Description</p>
                <p className="text-xs">{selectedConflict.description}</p>
              </div>
              {selectedConflict.status !== 'resolved' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes de résolution</Label>
                  <Textarea value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} placeholder="Décrivez la résolution..." className="text-sm min-h-[80px]" />
                </div>
              )}
              {selectedConflict.resolution_notes && (
                <div className="p-2.5 rounded-lg bg-muted">
                  <p className="text-[10px] text-muted-foreground mb-1">Résolution</p>
                  <p className="text-xs">{selectedConflict.resolution_notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDetailsOpen(false)} className="h-8 text-xs">Fermer</Button>
            {selectedConflict?.status !== 'resolved' && (
              <Button size="sm" onClick={handleResolve} className="h-8 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Résoudre
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBoundaryConflicts;
