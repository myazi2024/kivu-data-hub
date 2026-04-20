import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Search, Download, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { exportToCSV } from '@/utils/csvExport';
import { StatusBadge, StatusType } from '@/components/shared/StatusBadge';
import {
  ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody,
  ResponsiveTableRow, ResponsiveTableCell, ResponsiveTableHead
} from '@/components/ui/responsive-table';

interface Transaction {
  id: string;
  source: 'cadastral' | 'expertise' | 'permit' | 'publication';
  type: 'payment' | 'refund' | 'commission' | 'discount';
  amount: number;
  status: string;
  user_email: string;
  description: string;
  created_at: string;
  reference: string;
}

const SOURCE_LABELS: Record<string, string> = {
  cadastral: 'Cadastre',
  expertise: 'Expertise',
  permit: 'Autorisation',
  publication: 'Publication',
};

const STATUS_MAP: Record<string, StatusType> = {
  completed: 'completed',
  paid: 'paid',
  pending: 'pending',
  failed: 'failed',
  cancelled: 'cancelled',
};

const AdminTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('_all');
  const [statusFilter, setStatusFilter] = useState<string>('_all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      // Unified source: query 4 transaction tables in parallel
      const [pt, exp, per, pay] = await Promise.all([
        supabase
          .from('payment_transactions')
          .select('id, amount_usd, status, payment_method, created_at, transaction_reference, user_id')
          .order('created_at', { ascending: false })
          .limit(2000),
        supabase
          .from('expertise_payments')
          .select('id, total_amount_usd, status, payment_method, created_at, transaction_id, user_id')
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase
          .from('permit_payments')
          .select('id, total_amount_usd, status, payment_method, created_at, transaction_id, user_id')
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase
          .from('payments')
          .select('id, amount_usd, status, payment_method, created_at, transaction_id, user_id')
          .order('created_at', { ascending: false })
          .limit(1000),
      ]);

      const allRows: Array<{
        id: string;
        source: Transaction['source'];
        amount: number;
        status: string;
        method: string | null;
        created_at: string;
        reference: string;
        user_id: string | null;
      }> = [];

      (pt.data || []).forEach((r: any) => allRows.push({
        id: r.id, source: 'cadastral', amount: Number(r.amount_usd || 0),
        status: r.status, method: r.payment_method, created_at: r.created_at,
        reference: r.transaction_reference || r.id, user_id: r.user_id,
      }));
      (exp.data || []).forEach((r: any) => allRows.push({
        id: r.id, source: 'expertise', amount: Number(r.total_amount_usd || 0),
        status: r.status, method: r.payment_method, created_at: r.created_at,
        reference: r.transaction_id || r.id, user_id: r.user_id,
      }));
      (per.data || []).forEach((r: any) => allRows.push({
        id: r.id, source: 'permit', amount: Number(r.total_amount_usd || 0),
        status: r.status, method: r.payment_method, created_at: r.created_at,
        reference: r.transaction_id || r.id, user_id: r.user_id,
      }));
      (pay.data || []).forEach((r: any) => allRows.push({
        id: r.id, source: 'publication', amount: Number(r.amount_usd || 0),
        status: r.status, method: r.payment_method, created_at: r.created_at,
        reference: r.transaction_id || r.id, user_id: r.user_id,
      }));

      const userIds = [...new Set(allRows.map(r => r.user_id).filter(Boolean))] as string[];
      let profilesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, email')
          .in('user_id', userIds);
        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = p.email || 'N/A';
          return acc;
        }, {} as Record<string, string>);
      }

      const transactionData: Transaction[] = allRows.map(r => ({
        id: `${r.source}-${r.id}`,
        source: r.source,
        type: 'payment',
        amount: r.amount,
        status: r.status,
        user_email: r.user_id ? (profilesMap[r.user_id] || 'N/A') : 'N/A',
        description: `${SOURCE_LABELS[r.source]} • ${r.method || '—'}`,
        created_at: r.created_at,
        reference: r.reference,
      }));

      setTransactions(transactionData);
    } catch (error: any) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les transactions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedTransactions = useMemo(() => {
    return transactions
      .filter(tx => {
        const matchesSearch = 
          tx.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tx.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tx.description.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesSource = typeFilter === '_all' || tx.source === typeFilter;
        const matchesStatus = statusFilter === '_all' || tx.status === statusFilter;
        
        return matchesSearch && matchesSource && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'date') {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        } else {
          return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
        }
      });
  }, [transactions, searchTerm, typeFilter, statusFilter, sortBy, sortOrder]);

  const pagination = usePagination(filteredAndSortedTransactions, { initialPageSize: 15 });

  const totalAmount = filteredAndSortedTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const successfulTransactions = filteredAndSortedTransactions.filter(tx => 
    tx.status === 'completed' || tx.status === 'paid'
  ).length;

  const getTypeBadge = (type: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      payment: { variant: "default", label: "Paiement" },
      refund: { variant: "secondary", label: "Remboursement" },
      commission: { variant: "outline", label: "Commission" },
      discount: { variant: "secondary", label: "Remise" }
    };
    
    const config = variants[type] || { variant: "outline" as const, label: type };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleExportCSV = () => {
    exportToCSV({
      filename: `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`,
      headers: ['Date', 'Référence', 'Type', 'Utilisateur', 'Description', 'Montant', 'Statut'],
      data: filteredAndSortedTransactions.map(tx => [
        format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm'),
        tx.reference,
        tx.type,
        tx.user_email,
        tx.description,
        `$${tx.amount.toFixed(2)}`,
        tx.status
      ])
    });
  };

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Montant Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Réussite</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pagination.totalItems > 0
                ? ((successfulTransactions / pagination.totalItems) * 100).toFixed(1)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Journal des Transactions</CardTitle>
            <Button onClick={handleExportCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par référence, email, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tous types</SelectItem>
                <SelectItem value="payment">Paiement</SelectItem>
                <SelectItem value="refund">Remboursement</SelectItem>
                <SelectItem value="commission">Commission</SelectItem>
                <SelectItem value="discount">Remise</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tous statuts</SelectItem>
                <SelectItem value="completed">Complété</SelectItem>
                <SelectItem value="paid">Payé</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="failed">Échoué</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ResponsiveTable>
            <ResponsiveTableHeader>
              <ResponsiveTableRow>
                <ResponsiveTableHead priority="medium">
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('date')} className="h-8 px-2">
                    Date <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </ResponsiveTableHead>
                <ResponsiveTableHead priority="high">Référence</ResponsiveTableHead>
                <ResponsiveTableHead priority="medium">Type</ResponsiveTableHead>
                <ResponsiveTableHead priority="low">Utilisateur</ResponsiveTableHead>
                <ResponsiveTableHead priority="low">Description</ResponsiveTableHead>
                <ResponsiveTableHead priority="high">
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('amount')} className="h-8 px-2">
                    Montant <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </ResponsiveTableHead>
                <ResponsiveTableHead priority="high">Statut</ResponsiveTableHead>
              </ResponsiveTableRow>
            </ResponsiveTableHeader>
            <ResponsiveTableBody>
              {pagination.paginatedData.length === 0 ? (
                <ResponsiveTableRow>
                  <ResponsiveTableCell priority="high" label="" colSpan={7}>
                    <div className="text-center py-8 text-muted-foreground">Aucune transaction trouvée</div>
                  </ResponsiveTableCell>
                </ResponsiveTableRow>
              ) : (
                pagination.paginatedData.map((transaction) => (
                  <ResponsiveTableRow key={transaction.id}>
                    <ResponsiveTableCell priority="medium" label="Date">
                      <span className="text-xs">
                        {format(new Date(transaction.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </span>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="high" label="Référence">
                      <span className="font-mono text-xs">{transaction.reference}</span>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="medium" label="Type">
                      {getTypeBadge(transaction.type)}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="low" label="Utilisateur">
                      <span className="text-xs">{transaction.user_email}</span>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="low" label="Description">
                      <span className="text-xs">{transaction.description}</span>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="high" label="Montant">
                      <span className="font-medium text-xs">${transaction.amount.toFixed(2)}</span>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="high" label="Statut">
                      <StatusBadge status={STATUS_MAP[transaction.status] || 'pending'} compact />
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                ))
              )}
            </ResponsiveTableBody>
          </ResponsiveTable>

          <div className="mt-4">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTransactions;
