import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, MapPin, Search, Eye, Calendar, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { exportToCSV } from '@/utils/csvExport';

interface BoundaryRecord {
  id: string;
  parcel_id: string;
  pv_reference_number: string;
  surveyor_name: string;
  survey_date: string;
  boundary_purpose: string;
  boundary_document_url: string | null;
  created_at: string;
  parcel_number?: string;
}

const AdminBoundaryHistory = () => {
  const [records, setRecords] = useState<BoundaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPurpose, setFilterPurpose] = useState<string>('_all');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BoundaryRecord | null>(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cadastral_boundary_history')
        .select(`
          *,
          cadastral_parcels!cadastral_boundary_history_parcel_id_fkey(parcel_number)
        `)
        .order('survey_date', { ascending: false });

      if (error) throw error;
      
      const recordsWithParcel = (data || []).map(r => ({
        ...r,
        parcel_number: (r.cadastral_parcels as any)?.parcel_number || 'N/A'
      }));
      
      setRecords(recordsWithParcel);
    } catch (error) {
      console.error('Error fetching boundary records:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const getPurposeBadge = (purpose: string) => {
    switch (purpose) {
      case 'initial':
        return <Badge variant="outline" className="text-[9px] bg-blue-100 text-blue-700 border-blue-200">Initial</Badge>;
      case 'verification':
        return <Badge variant="outline" className="text-[9px] bg-amber-100 text-amber-700 border-amber-200">Vérification</Badge>;
      case 'subdivision':
        return <Badge variant="outline" className="text-[9px] bg-purple-100 text-purple-700 border-purple-200">Morcellement</Badge>;
      case 'dispute_resolution':
        return <Badge variant="outline" className="text-[9px] bg-red-100 text-red-700 border-red-200">Litige</Badge>;
      default:
        return <Badge variant="outline" className="text-[9px]">{purpose}</Badge>;
    }
  };

  const getPurposeLabel = (purpose: string) => {
    switch (purpose) {
      case 'initial': return 'Initial';
      case 'verification': return 'Vérification';
      case 'subdivision': return 'Morcellement';
      case 'dispute_resolution': return 'Résolution litige';
      default: return purpose;
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = searchTerm === '' ||
      r.parcel_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.surveyor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.pv_reference_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPurpose = filterPurpose === '_all' || r.boundary_purpose === filterPurpose;
    return matchesSearch && matchesPurpose;
  });

  const pagination = usePagination(filteredRecords, { initialPageSize: 15 });

  const paginatedRecords = pagination.paginatedData;

  const totalRecords = records.length;
  const recentSurveys = records.filter(r => {
    const date = new Date(r.survey_date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return date >= thirtyDaysAgo;
  }).length;
  const withDocuments = records.filter(r => r.boundary_document_url).length;

  const handleExportCSV = () => {
    const headers = ['Référence PV', 'Parcelle', 'Géomètre', 'Objet', 'Date bornage', 'Document', 'Date création'];
    const data = filteredRecords.map(r => [
      r.pv_reference_number,
      r.parcel_number || '',
      r.surveyor_name,
      getPurposeLabel(r.boundary_purpose),
      r.survey_date,
      r.boundary_document_url ? 'Oui' : 'Non',
      r.created_at
    ]);
    exportToCSV({ filename: 'historique_bornage.csv', headers, data });
  };

  const resetPagination = () => pagination.goToPage(1);

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header */}
      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm md:text-base font-bold">Historique des Bornages</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">Traçabilité des opérations de bornage</p>
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
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center">
          <p className="text-lg md:text-xl font-bold text-primary">{totalRecords}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Total bornages</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center">
          <p className="text-lg md:text-xl font-bold text-blue-500">{recentSurveys}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Récents (30j)</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center">
          <p className="text-lg md:text-xl font-bold text-green-500">{withDocuments}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Avec PV</p>
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
              placeholder="Rechercher par parcelle, géomètre ou PV..." 
              className="h-8 text-xs pl-8" 
            />
          </div>
          <Select value={filterPurpose} onValueChange={(v) => { setFilterPurpose(v); resetPagination(); }}>
            <SelectTrigger className="h-8 text-xs w-full sm:w-32">
              <SelectValue placeholder="Objet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Tous</SelectItem>
              <SelectItem value="initial">Initial</SelectItem>
              <SelectItem value="verification">Vérification</SelectItem>
              <SelectItem value="subdivision">Morcellement</SelectItem>
              <SelectItem value="dispute_resolution">Litige</SelectItem>
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
            <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Aucun enregistrement</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {paginatedRecords.map((record) => (
                <div key={record.id} className="p-2.5 md:p-3 rounded-xl border bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-xs font-medium truncate">{record.pv_reference_number}</span>
                        {getPurposeBadge(record.boundary_purpose)}
                        {record.boundary_document_url && (
                          <FileText className="h-3 w-3 text-green-500" />
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        Parcelle: {record.parcel_number} • Géomètre: {record.surveyor_name}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                        <Calendar className="h-2.5 w-2.5" />
                        <span>{format(new Date(record.survey_date), 'dd/MM/yyyy', { locale: fr })}</span>
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
            <DialogTitle className="text-sm">Détails du bornage</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-3 py-2">
              <div className="p-2.5 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground mb-1">Référence PV</p>
                <p className="text-xs font-medium">{selectedRecord.pv_reference_number}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Géomètre</p>
                  <p className="text-xs font-medium">{selectedRecord.surveyor_name}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Date</p>
                  <p className="text-xs font-medium">{format(new Date(selectedRecord.survey_date), 'dd/MM/yyyy', { locale: fr })}</p>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground mb-1">Objet du bornage</p>
                {getPurposeBadge(selectedRecord.boundary_purpose)}
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground mb-1">Parcelle</p>
                <p className="text-xs font-medium">{selectedRecord.parcel_number}</p>
              </div>
              {selectedRecord.boundary_document_url && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-muted-foreground">Document PV</p>
                  {/\.(pdf)$/i.test(selectedRecord.boundary_document_url) ? (
                    <iframe
                      src={selectedRecord.boundary_document_url}
                      className="w-full h-64 rounded-lg border bg-muted"
                      title="Aperçu PV"
                    />
                  ) : /\.(jpe?g|png|webp|gif)$/i.test(selectedRecord.boundary_document_url) ? (
                    <img
                      src={selectedRecord.boundary_document_url}
                      alt="Aperçu PV"
                      className="w-full max-h-64 object-contain rounded-lg border bg-muted"
                    />
                  ) : null}
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => window.open(selectedRecord.boundary_document_url!, '_blank')}>
                    <FileText className="h-3 w-3 mr-1" />
                    Ouvrir dans un nouvel onglet
                  </Button>
                </div>
              )}
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

export default AdminBoundaryHistory;