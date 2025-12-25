import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Users, Search, Eye, DollarSign, TrendingUp, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ResellerCommission {
  id: string;
  reseller_id: string;
  invoice_id: string;
  discount_code_id: string | null;
  sale_amount_usd: number;
  discount_applied_usd: number;
  commission_earned_usd: number;
  created_at: string;
  reseller_name?: string;
  invoice_number?: string;
}

interface ResellerSummary {
  id: string;
  business_name: string;
  total_sales: number;
  total_commission: number;
  sales_count: number;
  commission_rate: number;
}

const AdminResellerCommissions = () => {
  const [commissions, setCommissions] = useState<ResellerCommission[]>([]);
  const [summaries, setSummaries] = useState<ResellerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedReseller, setSelectedReseller] = useState<ResellerSummary | null>(null);
  const [resellerCommissions, setResellerCommissions] = useState<ResellerCommission[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch resellers
      const { data: resellers, error: resellersError } = await supabase
        .from('resellers' as any)
        .select('id, business_name, commission_rate')
        .eq('is_active', true);

      if (resellersError) throw resellersError;

      // Fetch sales
      const { data: sales, error: salesError } = await supabase
        .from('reseller_sales')
        .select(`
          *,
          resellers!reseller_sales_reseller_id_fkey(business_name),
          cadastral_invoices!reseller_sales_invoice_id_fkey(invoice_number)
        `)
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      const commissionsWithDetails = (sales || []).map(s => ({
        ...s,
        reseller_name: (s.resellers as any)?.business_name || 'N/A',
        invoice_number: (s.cadastral_invoices as any)?.invoice_number || 'N/A'
      }));

      setCommissions(commissionsWithDetails);

      // Calculate summaries
      const summaryMap = new Map<string, ResellerSummary>();
      ((resellers || []) as any[]).forEach((r: any) => {
        summaryMap.set(r.id, {
          id: r.id,
          business_name: r.business_name,
          total_sales: 0,
          total_commission: 0,
          sales_count: 0,
          commission_rate: r.commission_rate
        });
      });

      (sales || []).forEach(s => {
        const summary = summaryMap.get(s.reseller_id);
        if (summary) {
          summary.total_sales += s.sale_amount_usd;
          summary.total_commission += s.commission_earned_usd;
          summary.sales_count += 1;
        }
      });

      setSummaries(Array.from(summaryMap.values()).sort((a, b) => b.total_commission - a.total_commission) as ResellerSummary[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (reseller: ResellerSummary) => {
    setSelectedReseller(reseller);
    setResellerCommissions(commissions.filter(c => c.reseller_id === reseller.id));
    setDetailsOpen(true);
  };

  const filteredSummaries = summaries.filter(s =>
    s.business_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCommissions = summaries.reduce((sum, s) => sum + s.total_commission, 0);
  const totalSales = summaries.reduce((sum, s) => sum + s.total_sales, 0);
  const activeResellers = summaries.filter(s => s.sales_count > 0).length;

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header */}
      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm md:text-base font-bold">Commissions Revendeurs</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">Suivi détaillé des commissions</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-8 text-xs">
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center">
          <p className="text-lg md:text-xl font-bold text-primary">${(totalCommissions / 1000).toFixed(1)}k</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Commissions totales</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center">
          <p className="text-lg md:text-xl font-bold text-green-500">${(totalSales / 1000).toFixed(1)}k</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Ventes totales</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center">
          <p className="text-lg md:text-xl font-bold text-blue-500">{activeResellers}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Revendeurs actifs</p>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-2.5 bg-background rounded-xl shadow-sm border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Rechercher revendeur..." className="h-8 text-xs pl-8" />
        </div>
      </Card>

      {/* Resellers List */}
      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <h3 className="text-xs font-semibold mb-3">Revendeurs ({filteredSummaries.length})</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : filteredSummaries.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Aucun revendeur</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSummaries.map((reseller) => (
              <div key={reseller.id} className="p-2.5 md:p-3 rounded-xl border bg-card">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-xs font-medium truncate">{reseller.business_name}</span>
                      <Badge variant="outline" className="text-[9px]">{reseller.commission_rate}%</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-2.5 w-2.5" />
                        {reseller.sales_count} ventes
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-2.5 w-2.5" />
                        ${reseller.total_sales.toFixed(0)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-500">${reseller.total_commission.toFixed(2)}</p>
                      <p className="text-[9px] text-muted-foreground">Commission</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleViewDetails(reseller)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-[360px] rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">{selectedReseller?.business_name}</DialogTitle>
          </DialogHeader>
          {selectedReseller && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                  <p className="text-lg font-bold text-primary">${selectedReseller.total_commission.toFixed(2)}</p>
                  <p className="text-[9px] text-muted-foreground">Commission totale</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                  <p className="text-lg font-bold">{selectedReseller.sales_count}</p>
                  <p className="text-[9px] text-muted-foreground">Ventes</p>
                </div>
              </div>
              
              <h4 className="text-xs font-semibold mt-3">Historique des ventes</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {resellerCommissions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Aucune vente</p>
                ) : (
                  resellerCommissions.map(commission => (
                    <div key={commission.id} className="p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-medium">{commission.invoice_number}</span>
                        <span className="text-[10px] text-green-500 font-semibold">+${commission.commission_earned_usd.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                        <span>Vente: ${commission.sale_amount_usd.toFixed(2)}</span>
                        <span>{format(new Date(commission.created_at), 'dd/MM/yy', { locale: fr })}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDetailsOpen(false)} className="h-8 text-xs">Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminResellerCommissions;
