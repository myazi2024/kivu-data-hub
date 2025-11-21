import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { FileText, Search, Download, Eye, DollarSign, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  const [statusFilter, setStatusFilter] = useState<string>('all');
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
      const { data, error } = await supabase
        .from('cadastral_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch user profiles separately
      const invoicesWithProfiles = await Promise.all(
        (data || []).map(async (invoice) => {
          if (invoice.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', invoice.user_id)
              .single();
            return { ...invoice, profiles: profile || undefined };
          }
          return { ...invoice, profiles: undefined };
        })
      );
      
      setInvoices(invoicesWithProfiles as Invoice[]);
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
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      paid: { variant: "default", label: "Payée" },
      pending: { variant: "secondary", label: "En attente" },
      failed: { variant: "destructive", label: "Échouée" },
      cancelled: { variant: "outline", label: "Annulée" }
    };
    
    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const exportToCSV = () => {
    const headers = ['Numéro', 'Date', 'Client', 'Email', 'Parcelle', 'Montant', 'Statut'];
    const rows = filteredInvoices.map(inv => [
      inv.invoice_number,
      format(new Date(inv.created_at), 'dd/MM/yyyy'),
      inv.client_name || 'N/A',
      inv.client_email,
      inv.parcel_number,
      `$${Number(inv.total_amount_usd).toFixed(2)}`,
      inv.status
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factures_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
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
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Factures Cadastrales</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par numéro, parcelle, client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="paid">Payée</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="failed">Échouée</SelectItem>
                <SelectItem value="cancelled">Annulée</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Facture</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Parcelle</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Remise</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Aucune facture trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>
                        {format(new Date(invoice.created_at), 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.client_name || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{invoice.client_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{invoice.parcel_number}</TableCell>
                      <TableCell className="font-medium">
                        ${Number(invoice.total_amount_usd).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {invoice.discount_amount_usd ? (
                          <span className="text-green-600">
                            -${Number(invoice.discount_amount_usd).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedInvoice(invoice)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Détails de la facture</DialogTitle>
                            </DialogHeader>
                            {selectedInvoice && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium">Numéro</p>
                                    <p className="text-sm text-muted-foreground">{selectedInvoice.invoice_number}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Date</p>
                                    <p className="text-sm text-muted-foreground">
                                      {format(new Date(selectedInvoice.created_at), 'dd MMMM yyyy', { locale: fr })}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Client</p>
                                    <p className="text-sm text-muted-foreground">{selectedInvoice.client_name || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Email</p>
                                    <p className="text-sm text-muted-foreground">{selectedInvoice.client_email}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Organisation</p>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedInvoice.client_organization || 'N/A'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Parcelle</p>
                                    <p className="text-sm text-muted-foreground">{selectedInvoice.parcel_number}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Zone géographique</p>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedInvoice.geographical_zone || 'N/A'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Mode de paiement</p>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedInvoice.payment_method || 'N/A'}
                                    </p>
                                  </div>
                                </div>

                                <div className="border-t pt-4">
                                  <p className="text-sm font-medium mb-2">Services sélectionnés</p>
                                  <div className="bg-muted p-3 rounded-md">
                                    <pre className="text-xs whitespace-pre-wrap">
                                      {JSON.stringify(selectedInvoice.selected_services, null, 2)}
                                    </pre>
                                  </div>
                                </div>

                                <div className="border-t pt-4">
                                  <div className="space-y-2">
                                    {selectedInvoice.original_amount_usd && (
                                      <div className="flex justify-between">
                                        <span className="text-sm">Montant original</span>
                                        <span className="text-sm font-medium">
                                          ${Number(selectedInvoice.original_amount_usd).toFixed(2)}
                                        </span>
                                      </div>
                                    )}
                                    {selectedInvoice.discount_amount_usd && (
                                      <>
                                        <div className="flex justify-between text-green-600">
                                          <span className="text-sm">
                                            Remise ({selectedInvoice.discount_code_used})
                                          </span>
                                          <span className="text-sm font-medium">
                                            -${Number(selectedInvoice.discount_amount_usd).toFixed(2)}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                    <div className="flex justify-between border-t pt-2">
                                      <span className="font-medium">Total</span>
                                      <span className="font-bold text-lg">
                                        ${Number(selectedInvoice.total_amount_usd).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInvoices;
