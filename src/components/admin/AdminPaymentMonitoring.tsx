import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  AlertTriangle,
  DollarSign,
  Download
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Transaction {
  id: string;
  created_at: string;
  user_id: string;
  amount_usd: number;
  provider: string;
  status: string;
  phone_number: string;
  error_message: string | null;
  transaction_reference: string | null;
  metadata: any;
}

export const AdminPaymentMonitoring = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
    totalAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTransactions(data || []);

      // Calculate stats
      const completed = data?.filter(t => t.status === 'completed').length || 0;
      const pending = data?.filter(t => t.status === 'pending' || t.status === 'processing').length || 0;
      const failed = data?.filter(t => t.status === 'failed').length || 0;
      const totalAmount = data?.filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.amount_usd, 0) || 0;

      setStats({
        total: data?.length || 0,
        completed,
        pending,
        failed,
        totalAmount,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Pagination
  const {
    paginatedData,
    currentPage,
    pageSize,
    totalPages,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    changePageSize,
    hasNextPage,
    hasPreviousPage,
    totalItems
  } = usePagination(transactions, { initialPageSize: 20 });

  const retryPayment = async (transactionId: string) => {
    try {
      toast({
        title: "Fonctionnalité en développement",
        description: "Le réessai automatique sera disponible prochainement",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Fournisseur', 'Téléphone', 'Montant', 'Statut', 'Mode Test', 'Référence'];
    const rows = transactions.map(tx => [
      format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm'),
      tx.provider,
      tx.phone_number,
      `$${tx.amount_usd.toFixed(2)}`,
      tx.status,
      tx.metadata?.test_mode ? 'Oui' : 'Non',
      tx.transaction_reference || 'N/A'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment_monitoring_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  useEffect(() => {
    loadTransactions();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('payment-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_transactions'
        },
        () => {
          loadTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      completed: { variant: 'default', icon: CheckCircle, label: 'Complété' },
      pending: { variant: 'secondary', icon: Clock, label: 'En attente' },
      processing: { variant: 'secondary', icon: RefreshCw, label: 'Traitement' },
      failed: { variant: 'destructive', icon: XCircle, label: 'Échoué' },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Montant Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalAmount.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Réussis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              En cours / Échoués
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.pending} / <span className="text-red-600">{stats.failed}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Transactions récentes</CardTitle>
            <div className="flex gap-2">
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
              <Button onClick={loadTransactions} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    {format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </TableCell>
                  <TableCell className="capitalize">{tx.provider}</TableCell>
                  <TableCell>{tx.phone_number}</TableCell>
                  <TableCell>${tx.amount_usd.toFixed(2)}</TableCell>
                  <TableCell>{getStatusBadge(tx.status)}</TableCell>
                  <TableCell>
                    {tx.metadata?.test_mode && (
                      <Badge variant="outline">Test</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {tx.status === 'failed' && (
                      <Button
                        onClick={() => retryPayment(tx.id)}
                        variant="ghost"
                        size="sm"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="mt-4">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalItems}
              hasNextPage={hasNextPage}
              hasPreviousPage={hasPreviousPage}
              onPageChange={goToPage}
              onPageSizeChange={changePageSize}
              onNextPage={goToNextPage}
              onPreviousPage={goToPreviousPage}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
