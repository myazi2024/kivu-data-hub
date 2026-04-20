import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, DollarSign, Users, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';

interface Sale {
  id: string;
  reseller_id: string;
  invoice_id: string;
  sale_amount_usd: number;
  discount_applied_usd: number;
  commission_earned_usd: number;
  commission_paid: boolean;
  commission_paid_at: string | null;
  created_at: string;
}

const AdminResellerSales = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [orphanCount, setOrphanCount] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: salesData }, { count: orphan }] = await Promise.all([
      supabase
        .from('reseller_sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000),
      supabase
        .from('cadastral_invoices')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'paid')
        .not('discount_code_used', 'is', null),
    ]);
    setSales((salesData ?? []) as Sale[]);
    // Orphans = paid invoices with code but no reseller_sales row
    const { data: paidInv } = await supabase
      .from('cadastral_invoices')
      .select('id')
      .eq('status', 'paid')
      .not('discount_code_used', 'is', null)
      .limit(2000);
    const salesInv = new Set((salesData ?? []).map((s) => s.invoice_id));
    const missing = (paidInv ?? []).filter((i) => !salesInv.has(i.id)).length;
    setOrphanCount(missing);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const [regenerating, setRegenerating] = useState(false);

  const regenerateOrphans = async () => {
    setRegenerating(true);
    try {
      const { data, error } = await (supabase as any).rpc('regenerate_orphan_reseller_sales');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const inserted = row?.inserted_count ?? 0;
      const scanned = row?.scanned_count ?? 0;
      toast.success(`${inserted} vente(s) régénérée(s) sur ${scanned} facture(s) orpheline(s) scannée(s).`);
      await fetchData();
    } catch (e: any) {
      toast.error(e?.message ?? 'Échec de la régénération');
    } finally {
      setRegenerating(false);
    }
  };

  const totalCommission = sales.reduce((s, x) => s + Number(x.commission_earned_usd ?? 0), 0);
  const paidCommission = sales
    .filter((s) => s.commission_paid)
    .reduce((s, x) => s + Number(x.commission_earned_usd ?? 0), 0);

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
  } = usePagination(sales, { initialPageSize: 15 });

  return (
    <div className="space-y-3">
      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm md:text-base font-bold">Ventes revendeurs</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              Commissions générées par les codes promo
            </p>
          </div>
          <div className="flex gap-2">
            {orphanCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={regenerateOrphans}
                disabled={regenerating}
                className="h-8 text-xs text-amber-600"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${regenerating ? 'animate-spin' : ''}`} />
                Régénérer {orphanCount} orphelines
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-8 text-xs">
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <Card className="p-2.5 bg-background rounded-xl border text-center">
          <p className="text-lg font-bold text-primary">{sales.length}</p>
          <p className="text-[10px] text-muted-foreground">Ventes</p>
        </Card>
        <Card className="p-2.5 bg-background rounded-xl border text-center">
          <p className="text-lg font-bold text-green-600">${totalCommission.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Commissions générées</p>
        </Card>
        <Card className="p-2.5 bg-background rounded-xl border text-center">
          <p className="text-lg font-bold text-blue-600">${paidCommission.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Déjà versées</p>
        </Card>
      </div>

      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <h3 className="text-xs font-semibold mb-2">Détail ({totalItems})</h3>
        {loading ? (
          <div className="text-center py-6 text-xs text-muted-foreground">Chargement…</div>
        ) : paginatedData.length === 0 ? (
          <div className="text-center py-6">
            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Aucune vente revendeur enregistrée</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {paginatedData.map((s) => (
              <div key={s.id} className="p-2 border rounded-lg bg-card flex items-center justify-between gap-2 text-[11px]">
                <div className="flex-1 min-w-0">
                  <code className="font-mono">Inv {s.invoice_id.slice(0, 8)}…</code>
                  <span className="text-muted-foreground ml-2">
                    {format(new Date(s.created_at), 'dd/MM/yy HH:mm', { locale: fr })}
                  </span>
                </div>
                <span className="text-primary font-medium flex items-center gap-0.5">
                  <DollarSign className="h-3 w-3" />
                  {Number(s.sale_amount_usd).toFixed(2)}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[9px] ${
                    s.commission_paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {s.commission_paid ? 'Versée' : 'En attente'} ${Number(s.commission_earned_usd).toFixed(2)}
                </Badge>
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

export default AdminResellerSales;
