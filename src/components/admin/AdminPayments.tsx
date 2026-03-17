import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, CheckCircle, XCircle, Clock, Download } from 'lucide-react';
import { toast } from 'sonner';
import { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody, ResponsiveTableRow, ResponsiveTableCell, ResponsiveTableHead } from '@/components/ui/responsive-table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { exportToCSV } from '@/utils/csvExport';
import { format } from 'date-fns';

interface Payment {
  id: string;
  user_id: string;
  publication_id: string;
  amount_usd: number;
  payment_method: string;
  transaction_id: string | null;
  phone_number: string | null;
  status: string;
  payment_provider: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  } | null;
  publications: {
    title: string;
  } | null;
}

interface AdminPaymentsProps {
  onRefresh: () => void;
}

const AdminPayments: React.FC<AdminPaymentsProps> = ({ onRefresh }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      // Fetch payments
      const { data: paymentsData, error } = await supabase
        .from('payments')
        .select(`
          *,
          publications(id, title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set(paymentsData?.map(p => p.user_id).filter(Boolean) || [])];
      let profilesData: any[] = [];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        profilesData = profiles || [];
      }

      // Combine data
      const combinedPayments = paymentsData?.map(payment => ({
        ...payment,
        profiles: profilesData.find(p => p.user_id === payment.user_id) || null
      })) || [];

      setPayments(combinedPayments);
    } catch (error) {
      console.error('Erreur lors du chargement des paiements:', error);
      toast.error('Erreur lors du chargement des paiements');
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (paymentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: newStatus })
        .eq('id', paymentId);

      if (error) throw error;
      
      toast.success('Statut du paiement mis à jour');
      fetchPayments();
      onRefresh();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getProviderBadge = (provider: string) => {
    const colors = {
      'mpesa': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'orange_money': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'airtel_money': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${colors[provider as keyof typeof colors] || 'bg-muted text-muted-foreground'}`}>
        {provider?.replace('_', ' ').toUpperCase() || 'Mobile Money'}
      </span>
    );
  };

  const filteredPayments = payments.filter(payment => {
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    const paymentDate = new Date(payment.created_at);
    const matchesFrom = !dateFrom || paymentDate >= new Date(dateFrom);
    const matchesTo = !dateTo || paymentDate <= new Date(dateTo + 'T23:59:59');
    return matchesStatus && matchesFrom && matchesTo;
  });

  const pagination = usePagination(filteredPayments, { initialPageSize: 15 });

  const handleExport = () => {
    exportToCSV({
      filename: `paiements_${format(new Date(), 'yyyy-MM-dd')}.csv`,
      headers: ['Date', 'Utilisateur', 'Email', 'Publication', 'Montant', 'Méthode', 'Téléphone', 'Statut'],
      data: filteredPayments.map(p => [
        format(new Date(p.created_at), 'dd/MM/yyyy HH:mm'),
        p.profiles?.full_name || 'N/A',
        p.profiles?.email || 'N/A',
        p.publications?.title || 'N/A',
        `$${p.amount_usd}`,
        p.payment_provider || 'N/A',
        p.phone_number || 'N/A',
        p.status
      ])
    });
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
            Gestion des Paiements
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32 sm:w-48 h-8 text-xs sm:text-sm">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="completed">Complété</SelectItem>
                <SelectItem value="failed">Échoué</SelectItem>
                <SelectItem value="cancelled">Annulé</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} variant="outline" size="sm" className="gap-1 h-8 text-xs">
              <Download className="h-3 w-3" />
              <span className="hidden sm:inline">Exporter</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        <ResponsiveTable>
          <ResponsiveTableHeader>
            <ResponsiveTableRow>
              <ResponsiveTableHead priority="high">Utilisateur</ResponsiveTableHead>
              <ResponsiveTableHead priority="medium">Publication</ResponsiveTableHead>
              <ResponsiveTableHead priority="high">Montant</ResponsiveTableHead>
              <ResponsiveTableHead priority="low">Méthode</ResponsiveTableHead>
              <ResponsiveTableHead priority="low">Téléphone</ResponsiveTableHead>
              <ResponsiveTableHead priority="high">Statut</ResponsiveTableHead>
              <ResponsiveTableHead priority="medium">Date</ResponsiveTableHead>
              <ResponsiveTableHead priority="high">Actions</ResponsiveTableHead>
            </ResponsiveTableRow>
          </ResponsiveTableHeader>
          <ResponsiveTableBody>
            {pagination.paginatedData.map((payment) => (
              <ResponsiveTableRow key={payment.id}>
                <ResponsiveTableCell priority="high" label="Utilisateur">
                  <div>
                    <div className="font-medium text-xs sm:text-sm">{payment.profiles?.full_name || 'Utilisateur'}</div>
                    <div className="text-xs text-muted-foreground">{payment.profiles?.email}</div>
                  </div>
                </ResponsiveTableCell>
                <ResponsiveTableCell priority="medium" label="Publication" className="font-medium text-xs sm:text-sm">
                  {payment.publications?.title}
                </ResponsiveTableCell>
                <ResponsiveTableCell priority="high" label="Montant" className="font-semibold text-xs sm:text-sm">
                  ${payment.amount_usd}
                </ResponsiveTableCell>
                <ResponsiveTableCell priority="low" label="Méthode">
                  <div className="space-y-1">
                    <div>{getProviderBadge(payment.payment_provider)}</div>
                    <div className="text-xs text-muted-foreground">
                      {payment.transaction_id && `ID: ${payment.transaction_id.slice(0, 8)}...`}
                    </div>
                  </div>
                </ResponsiveTableCell>
                <ResponsiveTableCell priority="low" label="Téléphone" className="text-xs sm:text-sm">
                  {payment.phone_number}
                </ResponsiveTableCell>
                <ResponsiveTableCell priority="high" label="Statut">
                  <StatusBadge status={payment.status as any} />
                </ResponsiveTableCell>
                <ResponsiveTableCell priority="medium" label="Date" className="text-xs sm:text-sm">
                  {format(new Date(payment.created_at), 'dd/MM/yyyy')}
                </ResponsiveTableCell>
                <ResponsiveTableCell priority="high" label="Actions">
                  {payment.status === 'pending' && (
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updatePaymentStatus(payment.id, 'completed')}
                        className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                      >
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updatePaymentStatus(payment.id, 'failed')}
                        className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                      >
                        <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                  )}
                </ResponsiveTableCell>
              </ResponsiveTableRow>
            ))}
          </ResponsiveTableBody>
        </ResponsiveTable>
        
        {filteredPayments.length === 0 && (
          <div className="text-center py-8 text-xs sm:text-sm text-muted-foreground">
            Aucun paiement trouvé
          </div>
        )}

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
  );
};

export default AdminPayments;