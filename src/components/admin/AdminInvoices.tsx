import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { FileText, Search, Download, Eye, DollarSign, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody, ResponsiveTableRow, ResponsiveTableCell, ResponsiveTableHead } from '@/components/ui/responsive-table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { exportToCSV } from '@/utils/csvExport';
import PurgeTestDataButton from '@/components/admin/billing/PurgeTestDataButton';

interface Invoice {
  id: string;
  invoice_number: string;
  user_id: string | null;
  parcel_number: string;
  client_name: string | null;
  client_email: string;
  client_organization: string | null;
  geographical_zone: string | null;
  total_amount_usd: number;
  original_amount_usd: number | null;
  discount_amount_usd: number | null;
  discount_code_used: string | null;
  selected_services: any;
  status: string;
  payment_method: string | null;
  payment_id: string | null;
  search_date: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

const AdminInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('_all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const { toast } = useToast();

  // Stats
  const totalInvoices = invoices.length;
  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + Number(inv.total_amount_usd), 0);
  const pendingRevenue = invoices
    .filter(inv => inv.status === 'pending')
    .reduce((sum, inv) => sum + Number(inv.total_amount_usd), 0);
  const totalDiscounts = invoices
    .filter(inv => inv.discount_amount_usd)
    .reduce((sum, inv) => sum + Number(inv.discount_amount_usd || 0), 0);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      // Server-side count for accurate stats even when result set is capped
      const { data, error } = await supabase
        .from('cadastral_invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2000);

      if (error) throw error;

      // Client-side test filter (covers all test prefixes via centralized convention)
      const filtered = (data || []).filter((inv: any) => {
        const pn = (inv.parcel_number || '').toUpperCase();
        return !pn.startsWith('TEST-') && !pn.startsWith('TEST_') && !pn.startsWith('SANDBOX-');
      });

      setInvoices(filtered as Invoice[]);
    } catch (error: any) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les factures",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.parcel_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.client_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === '_all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const pagination = usePagination(filteredInvoices, { initialPageSize: 15 });

  const handleExportCSV = () => {
    exportToCSV({
      filename: `factures_${format(new Date(), 'yyyy-MM-dd')}.csv`,
      headers: ['Numéro', 'Date', 'Client', 'Email', 'Parcelle', 'Montant', 'Statut'],
      data: filteredInvoices.map(inv => [
        inv.invoice_number,
        format(new Date(inv.created_at), 'dd/MM/yyyy'),
        inv.client_name || 'N/A',
        inv.client_email,
        inv.parcel_number,
        `$${Number(inv.total_amount_usd).toFixed(2)}`,
        inv.status
      ])
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Factures</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus Totaux</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${pendingRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remises Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalDiscounts.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
            <CardTitle className="text-base sm:text-lg">Factures Cadastrales</CardTitle>
            <div className="flex flex-wrap gap-2">
              <PurgeTestDataButton onDone={() => window.location.reload()} />
              <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-1 h-8 text-xs">
                <Download className="h-3 w-3" />
                <span className="hidden sm:inline">Exporter CSV</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 sm:pl-8 h-8 text-xs sm:text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs sm:text-sm">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tous les statuts</SelectItem>
                <SelectItem value="paid">Payée</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="failed">Échouée</SelectItem>
                <SelectItem value="cancelled">Annulée</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ResponsiveTable>
            <ResponsiveTableHeader>
              <ResponsiveTableRow>
                <ResponsiveTableHead priority="high">N° Facture</ResponsiveTableHead>
                <ResponsiveTableHead priority="medium">Date</ResponsiveTableHead>
                <ResponsiveTableHead priority="medium">Client</ResponsiveTableHead>
                <ResponsiveTableHead priority="low">Parcelle</ResponsiveTableHead>
                <ResponsiveTableHead priority="high">Montant</ResponsiveTableHead>
                <ResponsiveTableHead priority="low">Remise</ResponsiveTableHead>
                <ResponsiveTableHead priority="high">Statut</ResponsiveTableHead>
                <ResponsiveTableHead priority="high">Actions</ResponsiveTableHead>
              </ResponsiveTableRow>
            </ResponsiveTableHeader>
            <ResponsiveTableBody>
              {pagination.paginatedData.length === 0 ? (
                <ResponsiveTableRow>
                  <ResponsiveTableCell priority="high" className="text-center text-xs sm:text-sm text-muted-foreground">
                    Aucune facture trouvée
                  </ResponsiveTableCell>
                </ResponsiveTableRow>
              ) : (
                pagination.paginatedData.map((invoice) => (
                  <ResponsiveTableRow key={invoice.id}>
                    <ResponsiveTableCell priority="high" label="N° Facture" className="font-medium text-xs sm:text-sm">
                      {invoice.invoice_number}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="medium" label="Date" className="text-xs sm:text-sm">
                      {format(new Date(invoice.created_at), 'dd/MM/yyyy', { locale: fr })}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="medium" label="Client">
                      <div>
                        <div className="font-medium text-xs sm:text-sm">{invoice.client_name || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">{invoice.client_email}</div>
                      </div>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="low" label="Parcelle" className="text-xs sm:text-sm">
                      {invoice.parcel_number}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="high" label="Montant" className="font-medium text-xs sm:text-sm">
                      ${Number(invoice.total_amount_usd).toFixed(2)}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="low" label="Remise">
                      {invoice.discount_amount_usd ? (
                        <span className="text-green-600 text-xs sm:text-sm">
                          -${Number(invoice.discount_amount_usd).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs sm:text-sm">-</span>
                      )}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="high" label="Statut">
                      <StatusBadge status={invoice.status as any} compact />
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="high" label="Actions">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedInvoice(invoice)}
                            className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] sm:max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="text-sm sm:text-base">Détails de la facture</DialogTitle>
                          </DialogHeader>
                          {selectedInvoice && (
                            <div className="space-y-3 sm:space-y-4">
                              <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                                <div>
                                  <p className="font-medium">Numéro</p>
                                  <p className="text-muted-foreground">{selectedInvoice.invoice_number}</p>
                                </div>
                                <div>
                                  <p className="font-medium">Date</p>
                                  <p className="text-muted-foreground">
                                    {format(new Date(selectedInvoice.created_at), 'dd MMMM yyyy', { locale: fr })}
                                  </p>
                                </div>
                                <div>
                                  <p className="font-medium">Client</p>
                                  <p className="text-muted-foreground">{selectedInvoice.client_name || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="font-medium">Email</p>
                                  <p className="text-muted-foreground">{selectedInvoice.client_email}</p>
                                </div>
                                <div>
                                  <p className="font-medium">Organisation</p>
                                  <p className="text-muted-foreground">
                                    {selectedInvoice.client_organization || 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="font-medium">Parcelle</p>
                                  <p className="text-muted-foreground">{selectedInvoice.parcel_number}</p>
                                </div>
                                <div>
                                  <p className="font-medium">Zone géographique</p>
                                  <p className="text-muted-foreground">
                                    {selectedInvoice.geographical_zone || 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="font-medium">Mode de paiement</p>
                                  <p className="text-muted-foreground">
                                    {selectedInvoice.payment_method || 'N/A'}
                                  </p>
                                </div>
                              </div>

                              <div className="border-t pt-3 sm:pt-4">
                                <p className="font-medium mb-2 text-xs sm:text-sm">Services sélectionnés</p>
                                <div className="bg-muted p-2 sm:p-3 rounded-md">
                                  <pre className="text-[10px] sm:text-xs whitespace-pre-wrap">
                                    {JSON.stringify(selectedInvoice.selected_services, null, 2)}
                                  </pre>
                                </div>
                              </div>

                              <div className="border-t pt-3 sm:pt-4">
                                <div className="space-y-2 text-xs sm:text-sm">
                                  {selectedInvoice.original_amount_usd && (
                                    <div className="flex justify-between">
                                      <span>Montant original</span>
                                      <span className="font-medium">
                                        ${Number(selectedInvoice.original_amount_usd).toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                  {selectedInvoice.discount_amount_usd && (
                                    <>
                                      <div className="flex justify-between text-green-600">
                                        <span>
                                          Remise ({selectedInvoice.discount_code_used})
                                        </span>
                                        <span className="font-medium">
                                          -${Number(selectedInvoice.discount_amount_usd).toFixed(2)}
                                        </span>
                                      </div>
                                    </>
                                  )}
                                  <div className="flex justify-between border-t pt-2">
                                    <span className="font-medium">Total</span>
                                    <span className="font-bold text-base sm:text-lg">
                                      ${Number(selectedInvoice.total_amount_usd).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                ))
              )}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInvoices;
