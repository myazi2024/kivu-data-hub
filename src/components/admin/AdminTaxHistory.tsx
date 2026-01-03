import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Receipt, Search, CheckCircle2, XCircle, Clock, Download } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { exportToCSV } from '@/utils/csvExport';

interface TaxRecord {
  id: string;
  parcel_id: string;
  tax_year: number;
  amount_usd: number;
  payment_status: string;
  payment_date: string | null;
  created_at: string;
  parcel_number?: string;
}

const AdminTaxHistory = () => {
  const [records, setRecords] = useState<TaxRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('_all');
  const [filterYear, setFilterYear] = useState<string>('_all');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cadastral_tax_history')
        .select(`
          *,
          cadastral_parcels!cadastral_tax_history_parcel_id_fkey(parcel_number)
        `)
        .order('tax_year', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const recordsWithParcel = (data || []).map(r => ({
        ...r,
        parcel_number: (r.cadastral_parcels as any)?.parcel_number || 'N/A'
      }));
      
      setRecords(recordsWithParcel);
    } catch (error) {
      console.error('Error fetching tax records:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="outline" className="text-[9px] bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="h-2 w-2 mr-0.5" />Payé</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-[9px] bg-amber-100 text-amber-700 border-amber-200"><Clock className="h-2 w-2 mr-0.5" />En attente</Badge>;
      case 'overdue':
        return <Badge variant="outline" className="text-[9px] bg-red-100 text-red-700 border-red-200"><XCircle className="h-2 w-2 mr-0.5" />Impayé</Badge>;
      default:
        return <Badge variant="outline" className="text-[9px]">{status}</Badge>;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Payé';
      case 'pending': return 'En attente';
      case 'overdue': return 'Impayé';
      default: return status;
    }
  };

  const years = [...new Set(records.map(r => r.tax_year))].sort((a, b) => b - a);
  
  const filteredRecords = records.filter(r => {
    const matchesSearch = searchTerm === '' || r.parcel_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === '_all' || r.payment_status === filterStatus;
    const matchesYear = filterYear === '_all' || r.tax_year.toString() === filterYear;
    return matchesSearch && matchesStatus && matchesYear;
  });

  const pagination = usePagination(filteredRecords, { initialPageSize: 15 });

  const paginatedRecords = pagination.paginatedData;

  const paidTotal = records.filter(r => r.payment_status === 'paid').reduce((sum, r) => sum + r.amount_usd, 0);
  const pendingTotal = records.filter(r => r.payment_status !== 'paid').reduce((sum, r) => sum + r.amount_usd, 0);
  const currentYearPaid = records.filter(r => r.tax_year === new Date().getFullYear() && r.payment_status === 'paid').length;

  const handleExportCSV = () => {
    const headers = ['Parcelle', 'Année fiscale', 'Montant USD', 'Statut', 'Date paiement', 'Date création'];
    const data = filteredRecords.map(r => [
      r.parcel_number || '',
      r.tax_year,
      r.amount_usd,
      getStatusLabel(r.payment_status),
      r.payment_date || '',
      r.created_at
    ]);
    exportToCSV({ filename: 'historique_taxes.csv', headers, data });
  };

  const resetPagination = () => pagination.goToPage(1);

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header */}
      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm md:text-base font-bold">Historique Taxes Foncières</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">Suivi des paiements de taxes</p>
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
          <p className="text-lg md:text-xl font-bold text-green-500">${(paidTotal / 1000).toFixed(1)}k</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Total payé</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center">
          <p className="text-lg md:text-xl font-bold text-amber-500">${(pendingTotal / 1000).toFixed(1)}k</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">En attente</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center">
          <p className="text-lg md:text-xl font-bold text-primary">{currentYearPaid}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Payés {new Date().getFullYear()}</p>
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
              placeholder="Rechercher parcelle..." 
              className="h-8 text-xs pl-8" 
            />
          </div>
          <Select value={filterYear} onValueChange={(v) => { setFilterYear(v); resetPagination(); }}>
            <SelectTrigger className="h-8 text-xs w-full sm:w-24">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Toutes</SelectItem>
              {years.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); resetPagination(); }}>
            <SelectTrigger className="h-8 text-xs w-full sm:w-28">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Tous</SelectItem>
              <SelectItem value="paid">Payé</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="overdue">Impayé</SelectItem>
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
            <Receipt className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Aucun enregistrement</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {paginatedRecords.map((record) => (
                <div key={record.id} className="p-2.5 md:p-3 rounded-xl border bg-card">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Receipt className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-xs font-medium truncate">{record.parcel_number}</span>
                        {getStatusBadge(record.payment_status)}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>Année: {record.tax_year}</span>
                        {record.payment_date && (
                          <>
                            <span>•</span>
                            <span>Payé le {format(new Date(record.payment_date), 'dd/MM/yy', { locale: fr })}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-primary">${record.amount_usd}</p>
                    </div>
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
    </div>
  );
};

export default AdminTaxHistory;