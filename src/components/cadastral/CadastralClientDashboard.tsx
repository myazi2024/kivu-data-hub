import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  DollarSign,
  Receipt,
  Eye,
  Filter,
  Search,
  Loader2,
  FileDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCadastralServices } from '@/hooks/useCadastralServices';
import CadastralInvoiceDetailsDialog from './CadastralInvoiceDetailsDialog';

// Fix #2: Type local au lieu d'importer depuis useCadastralBilling
export interface CadastralInvoice {
  id: string;
  parcel_number: string;
  search_date: string;
  selected_services: any;
  total_amount_usd: number;
  status: string;
  invoice_number: string;
  client_name?: string | null;
  client_email: string;
  client_organization?: string | null;
  geographical_zone?: string | null;
  payment_method?: string | null;
  created_at: string;
  updated_at: string;
  discount_code_used?: string | null;
  discount_amount_usd?: number;
  original_amount_usd?: number;
}

const CadastralClientDashboard: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<CadastralInvoice | null>(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [invoices, setInvoices] = useState<CadastralInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
  // Fix #2: Utiliser le hook réactif au lieu de CADASTRAL_SERVICES
  const { services: catalogServices } = useCadastralServices();

  const fetchUserInvoices = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cadastral_invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const transformedData = (data || []).map(invoice => ({
        ...invoice,
        selected_services: Array.isArray(invoice.selected_services) 
          ? invoice.selected_services 
          : JSON.parse(invoice.selected_services as string || '[]')
      })) as CadastralInvoice[];
      setInvoices(transformedData);
    } catch (error) {
      console.error('Erreur lors de la récupération des factures:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserInvoices();
    }
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Payé</Badge>;
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'failed':
        return <Badge variant="destructive">Échoué</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.parcel_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalAmount = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + parseFloat(inv.total_amount_usd.toString()), 0);

  // Fix #2: Utiliser catalogServices réactifs
  const generatePDFInvoice = (invoice: CadastralInvoice) => {
    import('@/lib/pdf').then(({ generateInvoicePDF }) => {
      generateInvoicePDF(invoice as any, catalogServices);
    });
  };

  const viewInvoiceDetails = (invoice: CadastralInvoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceDetails(true);
  };

  const handleCloseInvoiceDetails = () => {
    setShowInvoiceDetails(false);
    setSelectedInvoice(null);
  };

  if (loading && invoices.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{invoices.length}</div>
                <div className="text-sm text-muted-foreground">Total factures</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Total payé</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {invoices.filter(inv => inv.status === 'paid').length}
                </div>
                <div className="text-sm text-muted-foreground">Recherches payées</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Historique des recherches facturées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par numéro de parcelle ou facture..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="paid">Payé</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="failed">Échoué</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucune facture trouvée</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Aucune facture ne correspond à vos critères de recherche.'
                  : 'Vous n\'avez pas encore effectué de recherches payantes.'
                }
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Facture</TableHead>
                    <TableHead>Parcelle</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono text-sm">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell className="font-mono">
                        {invoice.parcel_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(invoice.search_date).toLocaleDateString('fr-FR')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {Array.isArray(invoice.selected_services) 
                            ? invoice.selected_services.length 
                            : (typeof invoice.selected_services === 'string' ? JSON.parse(invoice.selected_services || '[]').length : 0)
                          } service{(Array.isArray(invoice.selected_services) ? invoice.selected_services.length : 0) > 1 ? 's' : ''}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${Number(invoice.total_amount_usd).toFixed(2)} USD
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invoice.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewInvoiceDetails(invoice)}
                            aria-label={`Voir les détails de la facture ${invoice.invoice_number}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {invoice.status === 'paid' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => generatePDFInvoice(invoice)}
                              aria-label={`Télécharger la facture ${invoice.invoice_number}`}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog des détails de facture */}
      <CadastralInvoiceDetailsDialog
        invoice={selectedInvoice}
        isOpen={showInvoiceDetails}
        onClose={handleCloseInvoiceDetails}
        onDownloadPDF={generatePDFInvoice}
      />
    </div>
  );
};

export default CadastralClientDashboard;
