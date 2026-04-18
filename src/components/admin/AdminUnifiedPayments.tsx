import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, DollarSign, Search } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';

interface UnifiedPayment {
  id: string;
  source: string;
  reference: string;
  amount: number;
  status: string;
  created_at: string;
  user_label: string;
}

const SOURCE_COLORS: Record<string, string> = {
  invoice: 'bg-blue-100 text-blue-700 border-blue-200',
  transaction: 'bg-purple-100 text-purple-700 border-purple-200',
  expertise: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  land_title: 'bg-amber-100 text-amber-700 border-amber-200',
  mutation: 'bg-rose-100 text-rose-700 border-rose-200',
};

const AdminUnifiedPayments = () => {
  const [items, setItems] = useState<UnifiedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const [inv, tx, exp, lt, mu] = await Promise.all([
      supabase
        .from('cadastral_invoices')
        .select('id,invoice_number,total_amount_usd,status,created_at,client_email')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('payment_transactions')
        .select('id,transaction_reference,amount_usd,status,created_at,phone_number')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('expertise_payments')
        .select('id,total_amount_usd,status,created_at,expertise_request_id')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('land_title_requests')
        .select('id,reference_number,payment_status,created_at,requester_email')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('mutation_requests')
        .select('id,reference_number,payment_status,created_at')
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

    const merged: UnifiedPayment[] = [
      ...(inv.data ?? []).map((r: any) => ({
        id: r.id,
        source: 'invoice',
        reference: r.invoice_number ?? r.id.slice(0, 8),
        amount: Number(r.total_amount_usd ?? 0),
        status: r.status,
        created_at: r.created_at,
        user_label: r.client_email ?? '—',
      })),
      ...(tx.data ?? []).map((r: any) => ({
        id: r.id,
        source: 'transaction',
        reference: r.transaction_reference ?? r.id.slice(0, 8),
        amount: Number(r.amount_usd ?? 0),
        status: r.status,
        created_at: r.created_at,
        user_label: r.phone_number ?? '—',
      })),
      ...(exp.data ?? []).map((r: any) => ({
        id: r.id,
        source: 'expertise',
        reference: r.expertise_request_id?.slice(0, 8) ?? r.id.slice(0, 8),
        amount: Number(r.total_amount_usd ?? 0),
        status: r.status,
        created_at: r.created_at,
        user_label: '—',
      })),
      ...(lt.data ?? []).map((r: any) => ({
        id: r.id,
        source: 'land_title',
        reference: r.reference_number ?? r.id.slice(0, 8),
        amount: 0,
        status: r.payment_status ?? 'pending',
        created_at: r.created_at,
        user_label: r.requester_email ?? '—',
      })),
      ...(mu.data ?? []).map((r: any) => ({
        id: r.id,
        source: 'mutation',
        reference: r.reference_number ?? r.id.slice(0, 8),
        amount: 0,
        status: r.payment_status ?? 'pending',
        created_at: r.created_at,
        user_label: '—',
      })),
    ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

    setItems(merged);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter(
    (i) =>
      !search ||
      i.reference.toLowerCase().includes(search.toLowerCase()) ||
      i.user_label.toLowerCase().includes(search.toLowerCase()) ||
      i.source.includes(search.toLowerCase()),
  );

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
    totalItems,
  } = usePagination(filtered, { initialPageSize: 25 });

  return (
    <div className="space-y-3">
      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm md:text-base font-bold">Vue unifiée paiements</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              5 sources : factures, transactions, expertise, titre foncier, mutation
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-8 text-xs">
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </Card>

      <Card className="p-2.5 bg-background rounded-xl border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Référence, email, source…"
            className="h-8 text-xs pl-8"
          />
        </div>
      </Card>

      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <h3 className="text-xs font-semibold mb-2">Paiements ({totalItems})</h3>
        {loading ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Chargement…</p>
        ) : (
          <div className="space-y-1">
            {paginatedData.map((p) => (
              <div
                key={`${p.source}-${p.id}`}
                className="p-2 border rounded-lg bg-card flex items-center justify-between gap-2 text-[11px]"
              >
                <Badge variant="outline" className={`text-[9px] ${SOURCE_COLORS[p.source]}`}>
                  {p.source}
                </Badge>
                <code className="font-mono flex-1 truncate">{p.reference}</code>
                <span className="text-muted-foreground hidden md:inline truncate max-w-[120px]">
                  {p.user_label}
                </span>
                <span className="text-primary font-medium flex items-center gap-0.5 w-16 justify-end">
                  <DollarSign className="h-3 w-3" />
                  {p.amount.toFixed(2)}
                </span>
                <Badge variant="outline" className="text-[9px]">
                  {p.status}
                </Badge>
                <span className="text-muted-foreground text-[10px] hidden md:inline">
                  {format(new Date(p.created_at), 'dd/MM/yy', { locale: fr })}
                </span>
              </div>
            ))}
          </div>
        )}
        {!loading && totalItems > 0 && (
          <div className="mt-3">
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
        )}
      </Card>
    </div>
  );
};

export default AdminUnifiedPayments;
