import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

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

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
        const { data, error } = await supabase
          .from('payments')
          .select(`
            *,
            profiles(full_name, email),
            publications(title)
          `)
          .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
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

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { variant: 'secondary' as const, icon: Clock, label: 'En attente' },
      completed: { variant: 'default' as const, icon: CheckCircle, label: 'Complété' },
      failed: { variant: 'destructive' as const, icon: XCircle, label: 'Échoué' },
      cancelled: { variant: 'outline' as const, icon: XCircle, label: 'Annulé' }
    };
    
    const { variant, icon: Icon, label } = config[status as keyof typeof config] || config.pending;
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  const getProviderBadge = (provider: string) => {
    const colors = {
      'mpesa': 'bg-green-100 text-green-800',
      'orange_money': 'bg-orange-100 text-orange-800',
      'airtel_money': 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${colors[provider as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {provider?.replace('_', ' ').toUpperCase() || 'Mobile Money'}
      </span>
    );
  };

  const filteredPayments = filterStatus === 'all' 
    ? payments 
    : payments.filter(payment => payment.status === filterStatus);

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Gestion des Paiements
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
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
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Publication</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Méthode</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{payment.profiles?.full_name || 'Utilisateur'}</div>
                    <div className="text-sm text-muted-foreground">{payment.profiles?.email}</div>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{payment.publications?.title}</TableCell>
                <TableCell>${payment.amount_usd}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div>{getProviderBadge(payment.payment_provider)}</div>
                    <div className="text-xs text-muted-foreground">
                      {payment.transaction_id && `ID: ${payment.transaction_id.slice(0, 8)}...`}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{payment.phone_number}</TableCell>
                <TableCell>{getStatusBadge(payment.status)}</TableCell>
                <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  {payment.status === 'pending' && (
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updatePaymentStatus(payment.id, 'completed')}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updatePaymentStatus(payment.id, 'failed')}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {filteredPayments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Aucun paiement trouvé
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPayments;