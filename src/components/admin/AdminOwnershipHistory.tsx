import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Users, Search, Eye, Calendar, ArrowRight, Download, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { exportToCSV } from '@/utils/csvExport';

interface OwnershipRecord {
  id: string;
  parcel_id: string;
  owner_name: string;
  legal_status: string | null;
  ownership_start_date: string;
  ownership_end_date: string | null;
  mutation_type: string | null;
  created_at: string;
  parcel_number?: string;
}

const AdminOwnershipHistory = () => {
  const [records, setRecords] = useState<OwnershipRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMutation, setFilterMutation] = useState<string>('_all');
  const [filterStatus, setFilterStatus] = useState<string>('_all');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<OwnershipRecord | null>(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cadastral_ownership_history')
        .select(`
          *,
          cadastral_parcels!cadastral_ownership_history_parcel_id_fkey(parcel_number)
        `)
        .order('ownership_start_date', { ascending: false });

      if (error) throw error;
      
      const recordsWithParcel = (data || []).map(r => ({
        ...r,
        parcel_number: (r.cadastral_parcels as any)?.parcel_number || 'N/A'
      }));
      
      setRecords(recordsWithParcel);
    } catch (error) {
      console.error('Error fetching ownership records:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const getMutationTypeBadge = (type: string | null) => {
    if (!type) return null;
    switch (type) {
      case 'sale':
        return <Badge variant="outline" className="text-[9px] bg-blue-100 text-blue-700 border-blue-200">Vente</Badge>;
      case 'inheritance':
        return <Badge variant="outline" className="text-[9px] bg-purple-100 text-purple-700 border-purple-200">Héritage</Badge>;
      case 'donation':
        return <Badge variant="outline" className="text-[9px] bg-green-100 text-green-700 border-green-200">Donation</Badge>;
      case 'court_order':
        return <Badge variant="outline" className="text-[9px] bg-amber-100 text-amber-700 border-amber-200">Décision judiciaire</Badge>;
      default:
        return <Badge variant="outline" className="text-[9px]">{type}</Badge>;
    }
  };

  const getLegalStatusLabel = (status: string | null) => {
    if (!status) return 'Non spécifié';
    switch (status) {
      case 'individual': return 'Personne physique';
      case 'company': return 'Société';
      case 'government': return 'État';
      case 'association': return 'Association';
      default: return status;
    }
  };

  const getMutationLabel = (type: string | null) => {
    if (!type) return '-';
    switch (type) {
      case 'sale': return 'Vente';
      case 'inheritance': return 'Héritage';
      case 'donation': return 'Donation';
      case 'court_order': return 'Décision judiciaire';
      default: return type;
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = searchTerm === '' ||
      r.parcel_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.owner_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMutation = filterMutation === '_all' || r.mutation_type === filterMutation;
    const matchesStatus = filterStatus === '_all' ||
      (filterStatus === 'current' && !r.ownership_end_date) ||
      (filterStatus === 'past' && r.ownership_end_date);
    return matchesSearch && matchesMutation && matchesStatus;
  });

  const pagination = usePagination(filteredRecords, { initialPageSize: 15 });

  const paginatedRecords = pagination.paginatedData;

  const totalRecords = records.length;
  const currentOwners = records.filter(r => !r.ownership_end_date).length;
  const recentTransfers = records.filter(r => {
    const date = new Date(r.ownership_start_date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return date >= thirtyDaysAgo;
  }).length;

  // Detect ownership chain anomalies per parcel:
  // - Gap: end_date of previous > start_date of next (chronological hole, > 7 days tolerated)
  // - Overlap: end_date of previous > start_date of next (two simultaneous owners)
  // - MultipleCurrent: more than one record with no end_date for the same parcel
  const parcelAnomalies = useMemo(() => {
    const byParcel = new Map<string, OwnershipRecord[]>();
    for (const r of records) {
      const key = r.parcel_number || r.parcel_id;
      const arr = byParcel.get(key) || [];
      arr.push(r);
      byParcel.set(key, arr);
    }
    const flagged = new Map<string, { type: 'gap' | 'overlap' | 'multiple_current'; message: string }>();
    byParcel.forEach((arr, key) => {
      const sorted = [...arr].sort((a, b) =>
        new Date(a.ownership_start_date).getTime() - new Date(b.ownership_start_date).getTime()
      );
      const currentCount = sorted.filter(r => !r.ownership_end_date).length;
      if (currentCount > 1) {
        flagged.set(key, { type: 'multiple_current', message: `${currentCount} propriétaires actuels simultanés` });
        return;
      }
      for (let i = 0; i < sorted.length - 1; i++) {
        const prev = sorted[i];
        const next = sorted[i + 1];
        if (!prev.ownership_end_date) continue;
        const prevEnd = new Date(prev.ownership_end_date).getTime();
        const nextStart = new Date(next.ownership_start_date).getTime();
        const diffDays = (nextStart - prevEnd) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) {
          flagged.set(key, { type: 'gap', message: `Trou de ${Math.round(diffDays)} jours dans la chaîne` });
          return;
        }
        if (diffDays < -1) {
          flagged.set(key, { type: 'overlap', message: `Chevauchement de ${Math.round(-diffDays)} jours` });
          return;
        }
      }
    });
    return flagged;
  }, [records]);

  const anomaliesCount = parcelAnomalies.size;

  const handleExportCSV = () => {
    const headers = ['Parcelle', 'Propriétaire', 'Statut juridique', 'Type mutation', 'Date début', 'Date fin', 'Date création'];
    const data = filteredRecords.map(r => [
      r.parcel_number || '',
      r.owner_name,
      getLegalStatusLabel(r.legal_status),
      getMutationLabel(r.mutation_type),
      r.ownership_start_date,
      r.ownership_end_date || 'Actuel',
      r.created_at
    ]);
    exportToCSV({ filename: 'historique_propriete.csv', headers, data });
  };

  const resetPagination = () => pagination.goToPage(1);

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header */}
      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm md:text-base font-bold">Historique des Propriétaires</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">Traçabilité des mutations de propriété</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 text-xs">
              <Download className="h-3 w-3 mr-1" />
              Exporter CSV
            </Button>
            <Button variant="outline" size="sm" onClick={fetchRecords} disabled={loading} className="h-8 text-xs">
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center">
          <p className="text-lg md:text-xl font-bold text-primary">{totalRecords}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Enregistrements</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center">
          <p className="text-lg md:text-xl font-bold text-primary">{currentOwners}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Propriétaires actuels</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center">
          <p className="text-lg md:text-xl font-bold text-primary">{recentTransfers}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Transferts (30j)</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center">
          <p className={`text-lg md:text-xl font-bold ${anomaliesCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{anomaliesCount}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Chaînes incohérentes</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-2.5 bg-background rounded-xl shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              value={searchTerm} 
              onChange={(e) => { setSearchTerm(e.target.value); resetPagination(); }} 
              placeholder="Rechercher par parcelle ou propriétaire..." 
              className="h-8 text-xs pl-8" 
            />
          </div>
          <Select value={filterMutation} onValueChange={(v) => { setFilterMutation(v); resetPagination(); }}>
            <SelectTrigger className="h-8 text-xs w-full sm:w-32">
              <SelectValue placeholder="Mutation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Toutes</SelectItem>
              <SelectItem value="sale">Vente</SelectItem>
              <SelectItem value="inheritance">Héritage</SelectItem>
              <SelectItem value="donation">Donation</SelectItem>
              <SelectItem value="court_order">Judiciaire</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); resetPagination(); }}>
            <SelectTrigger className="h-8 text-xs w-full sm:w-28">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Tous</SelectItem>
              <SelectItem value="current">Actuels</SelectItem>
              <SelectItem value="past">Anciens</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Records List */}
      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <h3 className="text-xs font-semibold mb-3">Historique ({filteredRecords.length})</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : paginatedRecords.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Aucun enregistrement</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {paginatedRecords.map((record) => (
                <div key={record.id} className="p-2.5 md:p-3 rounded-xl border bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-xs font-medium truncate">{record.owner_name}</span>
                        {getMutationTypeBadge(record.mutation_type)}
                        {!record.ownership_end_date && (
                          <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">Actuel</Badge>
                        )}
                        {parcelAnomalies.has(record.parcel_number || record.parcel_id) && (
                          <Badge variant="destructive" className="text-[9px] gap-1">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {parcelAnomalies.get(record.parcel_number || record.parcel_id)?.message}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        Parcelle: {record.parcel_number}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                        <Calendar className="h-2.5 w-2.5" />
                        <span>{format(new Date(record.ownership_start_date), 'dd/MM/yyyy', { locale: fr })}</span>
                        {record.ownership_end_date && (
                          <>
                            <ArrowRight className="h-2.5 w-2.5" />
                            <span>{format(new Date(record.ownership_end_date), 'dd/MM/yyyy', { locale: fr })}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { setSelectedRecord(record); setDetailsOpen(true); }}>
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4">
              <PaginationControls
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                totalItems={pagination.totalItems}
                hasPreviousPage={pagination.hasPreviousPage}
                hasNextPage={pagination.hasNextPage}
                onPageChange={pagination.goToPage}
                onPageSizeChange={pagination.changePageSize}
                onNextPage={pagination.goToNextPage}
                onPreviousPage={pagination.goToPreviousPage}
              />
            </div>
          </>
        )}
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm">Détails propriétaire</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-3 py-2">
              <div className="p-2.5 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground mb-1">Propriétaire</p>
                <p className="text-xs font-medium">{selectedRecord.owner_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Statut juridique</p>
                  <p className="text-xs font-medium">{getLegalStatusLabel(selectedRecord.legal_status)}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Type de mutation</p>
                  {getMutationTypeBadge(selectedRecord.mutation_type) || <span className="text-xs">-</span>}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground mb-1">Période de propriété</p>
                <p className="text-xs font-medium">
                  {format(new Date(selectedRecord.ownership_start_date), 'dd/MM/yyyy', { locale: fr })}
                  {selectedRecord.ownership_end_date 
                    ? ` → ${format(new Date(selectedRecord.ownership_end_date), 'dd/MM/yyyy', { locale: fr })}`
                    : ' → Présent'
                  }
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground mb-1">Parcelle</p>
                <p className="text-xs font-medium">{selectedRecord.parcel_number}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDetailsOpen(false)} className="h-8 text-xs">Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOwnershipHistory;