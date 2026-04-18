/**
 * Dedicated invoices view for the user dashboard.
 * Replaces the previous reuse of `CadastralDashboardTabs` (which embedded
 * unrelated multi-tab content) for a focused, single-purpose listing.
 */
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Invoice {
  id: string;
  invoice_number: string;
  parcel_number: string;
  total_amount_usd: number;
  status: string;
  created_at: string;
  payment_method: string | null;
}

export function UserInvoices() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery<Invoice[]>({
    queryKey: ['user-invoices', user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cadastral_invoices')
        .select('id, invoice_number, parcel_number, total_amount_usd, status, created_at, payment_method')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invoice[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-none shadow-sm rounded-2xl">
        <CardContent className="p-8 text-center">
          <div className="h-12 w-12 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
            <CreditCard className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Aucune facture pour le moment</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((inv) => (
        <Card key={inv.id} className="border-none shadow-sm rounded-2xl">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium font-mono truncate">{inv.invoice_number}</p>
                <Badge variant={inv.status === 'paid' ? 'default' : 'outline'} className="text-[10px]">
                  {inv.status === 'paid' ? 'Payée' : inv.status === 'cancelled' ? 'Annulée' : 'En attente'}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Parcelle {inv.parcel_number} · {format(new Date(inv.created_at), 'dd MMM yyyy', { locale: fr })}
              </p>
            </div>
            <p className="text-sm font-bold shrink-0">{inv.total_amount_usd} USD</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
