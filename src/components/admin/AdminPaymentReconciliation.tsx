import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, CreditCard, Search, CheckCircle2, XCircle, AlertTriangle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PaymentTransaction {
  id: string;
  amount_usd: number;
  payment_method: string;
  provider: string;
  status: string;
  transaction_reference: string | null;
  phone_number: string | null;
  invoice_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

const AdminPaymentReconciliation = () => {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProvider, setFilterProvider] = useState<string>('all');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleReconcile = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('payment_transactions')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId);

      if (error) throw error;
      toast.success('Transaction réconciliée');
      fetchTransactions();
    } catch (error) {
      toast.error('Erreur lors de la réconciliation');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="text-[9px] bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="h-2 w-2 mr-0.5" />Complété</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-[9px] bg-amber-100 text-amber-700 border-amber-200"><AlertTriangle className="h-2 w-2 mr-0.5" />En attente</Badge>;
      case 'failed':
        return <Badge variant="outline" className="text-[9px] bg-red-100 text-red-700 border-red-200"><XCircle className="h-2 w-2 mr-0.5" />Échoué</Badge>;
      default:
        return <Badge variant="outline" className="text-[9px]">{status}</Badge>;
    }
  };

  const getProviderLabel = (provider: string) => {
    switch (provider) {
      case 'mpesa': return 'M-Pesa';
      case 'airtel': return 'Airtel Money';
      case 'orange': return 'Orange Money';
      case 'stripe': return 'Stripe';
      default: return provider;
    }
  };

  const providers = [...new Set(transactions.map(t => t.provider))];
  
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.transaction_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone_number?.includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesProvider = filterProvider === 'all' || t.provider === filterProvider;
    return matchesSearch && matchesStatus && matchesProvider;
  });

  const pendingCount = transactions.filter(t => t.status === 'pending').length;
  const completedTotal = transactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.amount_usd, 0);
  const failedCount = transactions.filter(t => t.status === 'failed').length;

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header */}
      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm md:text-base font-bold">Réconciliation Paiements</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">Vérification et rapprochement des transactions</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchTransactions} disabled={loading} className="h-8 text-xs">
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center cursor-pointer hover:bg-accent/50" onClick={() => setFilterStatus('pending')}>
          <p className="text-lg md:text-xl font-bold text-amber-500">{pendingCount}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">En attente</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center">
          <p className="text-lg md:text-xl font-bold text-green-500">${(completedTotal / 1000).toFixed(1)}k</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Complétés</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center cursor-pointer hover:bg-accent/50" onClick={() => setFilterStatus('failed')}>
          <p className="text-lg md:text-xl font-bold text-red-500">{failedCount}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Échoués</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-2.5 bg-background rounded-xl shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Référence ou téléphone..." className="h-8 text-xs pl-8" />
          </div>
          <Select value={filterProvider} onValueChange={setFilterProvider}>
            <SelectTrigger className="h-8 text-xs w-full sm:w-28">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {providers.map(p => (
                <SelectItem key={p} value={p}>{getProviderLabel(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs w-full sm:w-28">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="completed">Complétés</SelectItem>
              <SelectItem value="failed">Échoués</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Transactions List */}
      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <h3 className="text-xs font-semibold mb-3">Transactions ({filteredTransactions.length})</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Aucune transaction</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.slice(0, 50).map((transaction) => (
              <div key={transaction.id} className="p-2.5 md:p-3 rounded-xl border bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-xs font-medium">{getProviderLabel(transaction.provider)}</span>
                      {getStatusBadge(transaction.status)}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      Ref: {transaction.transaction_reference || 'N/A'}
                      {transaction.phone_number && ` • ${transaction.phone_number}`}
                    </div>
                    {transaction.error_message && (
                      <p className="text-[9px] text-red-500 mt-1 truncate">{transaction.error_message}</p>
                    )}
                    <p className="text-[9px] text-muted-foreground mt-1">
                      {format(new Date(transaction.created_at), 'dd/MM/yy HH:mm', { locale: fr })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                      <DollarSign className="h-3 w-3" />
                      {transaction.amount_usd.toFixed(2)}
                    </div>
                    {transaction.status === 'pending' && (
                      <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleReconcile(transaction.id)}>
                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                        Réconcilier
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminPaymentReconciliation;
