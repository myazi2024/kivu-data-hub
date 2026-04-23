import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { untypedTables, untypedRpc } from '@/integrations/supabase/untyped';
import { toast } from 'sonner';
import { RefreshCw, Users, Search, DollarSign, TrendingUp, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SummaryRow {
  reseller_id: string;
  reseller_name: string;
  reseller_code: string;
  commission_rate: number;
  total_sales_usd: number;
  total_commission_usd: number;
  commission_paid_usd: number;
  commission_pending_usd: number;
  sales_count: number;
  last_payout_at: string | null;
}

interface SaleRow {
  id: string;
  reseller_id: string;
  invoice_id: string;
  sale_amount_usd: number;
  commission_earned_usd: number;
  commission_paid: boolean;
  commission_paid_at: string | null;
  created_at: string;
  reseller_name?: string;
  invoice_number?: string;
}

const AdminResellerCommissions = () => {
  const [summaries, setSummaries] = useState<SummaryRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [orphanCount, setOrphanCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [regenerating, setRegenerating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: sumData, error: sumErr }, { data: salesData, error: salesErr }, { data: orphanData }] =
        await Promise.all([
          untypedTables.reseller_commissions_summary().select('*'),
          supabase
            .from('reseller_sales')
            .select(`*, resellers!reseller_sales_reseller_id_fkey(business_name), cadastral_invoices!reseller_sales_invoice_id_fkey(invoice_number)`)
            .order('created_at', { ascending: false })
            .limit(500),
          untypedRpc.get_orphan_reseller_invoices_count(),
        ]);
      if (sumErr) throw sumErr;
      if (salesErr) throw salesErr;

      setSummaries(((sumData || []) as unknown as SummaryRow[]).sort(
        (a, b) => Number(b.total_commission_usd) - Number(a.total_commission_usd)
      ));
      setSales(
        (salesData || []).map((s: any) => ({
          ...s,
          reseller_name: s.resellers?.business_name || 'N/A',
          invoice_number: s.cadastral_invoices?.invoice_number || 'N/A',
        })) as SaleRow[]
      );
      setOrphanCount(Number(orphanData ?? 0));
    } catch (e: any) {
      console.error('Reseller commissions fetch error:', e);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const regenerateOrphans = async () => {
    setRegenerating(true);
    try {
      const { data, error } = await untypedRpc.regenerate_orphan_reseller_sales();
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      toast.success(`${row?.inserted_count ?? 0} vente(s) régénérée(s) sur ${row?.scanned_count ?? 0} scannée(s).`);
      await fetchData();
    } catch (e: any) {
      toast.error(e?.message ?? 'Échec de la régénération');
    } finally {
      setRegenerating(false);
    }
  };

  const filteredSummaries = useMemo(
    () => summaries.filter((s) => s.reseller_name?.toLowerCase().includes(search.toLowerCase())),
    [summaries, search]
  );

  const totals = useMemo(() => {
    return {
      sales: summaries.reduce((s, x) => s + Number(x.total_sales_usd || 0), 0),
      commission: summaries.reduce((s, x) => s + Number(x.total_commission_usd || 0), 0),
      paid: summaries.reduce((s, x) => s + Number(x.commission_paid_usd || 0), 0),
      pending: summaries.reduce((s, x) => s + Number(x.commission_pending_usd || 0), 0),
      activeResellers: summaries.filter((s) => s.sales_count > 0).length,
    };
  }, [summaries]);

  return (
    <div className="space-y-4">
      <Card className="p-3 bg-muted/40 border-dashed">
        <p className="text-xs text-muted-foreground">
          📊 <strong>Vue analytique par revendeur</strong> — synthèse, ventes générées et historique. Pour générer un batch de virements, va sur <strong>Payouts revendeurs</strong>.
        </p>
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold">Commissions revendeurs</h2>
            <p className="text-xs text-muted-foreground">
              Synthèse, ventes et paiements consolidés
            </p>
          </div>
          <div className="flex items-center gap-2">
            {orphanCount > 0 && (
              <Button variant="outline" size="sm" onClick={regenerateOrphans} disabled={regenerating}>
                Régénérer {orphanCount} vente(s) orpheline(s)
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>
      </Card>

      {/* KPI globaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <DollarSign className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
          <p className="text-lg font-bold">${totals.sales.toFixed(0)}</p>
          <p className="text-[10px] text-muted-foreground">Ventes totales</p>
        </Card>
        <Card className="p-3 text-center">
          <TrendingUp className="h-4 w-4 mx-auto text-primary mb-1" />
          <p className="text-lg font-bold">${totals.commission.toFixed(0)}</p>
          <p className="text-[10px] text-muted-foreground">Commissions générées</p>
        </Card>
        <Card className="p-3 text-center">
          <Wallet className="h-4 w-4 mx-auto text-amber-500 mb-1" />
          <p className="text-lg font-bold">${totals.pending.toFixed(0)}</p>
          <p className="text-[10px] text-muted-foreground">À payer</p>
        </Card>
        <Card className="p-3 text-center">
          <Users className="h-4 w-4 mx-auto text-blue-500 mb-1" />
          <p className="text-lg font-bold">{totals.activeResellers}</p>
          <p className="text-[10px] text-muted-foreground">Revendeurs actifs</p>
        </Card>
      </div>

      <Tabs defaultValue="summary" className="space-y-3">
        <TabsList>
          <TabsTrigger value="summary">Synthèse</TabsTrigger>
          <TabsTrigger value="sales">Ventes ({sales.length})</TabsTrigger>
          <TabsTrigger value="payouts">Paiements</TabsTrigger>
        </TabsList>

        {/* Synthèse */}
        <TabsContent value="summary" className="space-y-3">
          <Card className="p-2.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher revendeur…"
                className="h-8 text-xs pl-8 max-w-xs"
              />
            </div>
          </Card>
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Revendeur</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Taux</TableHead>
                  <TableHead>Ventes</TableHead>
                  <TableHead>Total CA</TableHead>
                  <TableHead>Comm. payée</TableHead>
                  <TableHead>Comm. due</TableHead>
                  <TableHead>Dernier paiement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSummaries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                      Aucun revendeur
                    </TableCell>
                  </TableRow>
                )}
                {filteredSummaries.map((r) => (
                  <TableRow key={r.reseller_id}>
                    <TableCell className="text-xs font-medium">{r.reseller_name}</TableCell>
                    <TableCell className="font-mono text-[10px]">{r.reseller_code}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.commission_rate}%</Badge>
                    </TableCell>
                    <TableCell>{r.sales_count}</TableCell>
                    <TableCell>${Number(r.total_sales_usd).toFixed(2)}</TableCell>
                    <TableCell className="text-emerald-500">
                      ${Number(r.commission_paid_usd).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-amber-500 font-semibold">
                      ${Number(r.commission_pending_usd).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.last_payout_at
                        ? format(new Date(r.last_payout_at), 'dd/MM/yyyy', { locale: fr })
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Ventes */}
        <TabsContent value="sales">
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Revendeur</TableHead>
                  <TableHead>Facture</TableHead>
                  <TableHead>Montant vente</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      Aucune vente
                    </TableCell>
                  </TableRow>
                )}
                {sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs">
                      {format(new Date(s.created_at), 'dd/MM/yy', { locale: fr })}
                    </TableCell>
                    <TableCell className="text-xs">{s.reseller_name}</TableCell>
                    <TableCell className="font-mono text-[10px]">{s.invoice_number}</TableCell>
                    <TableCell>${Number(s.sale_amount_usd).toFixed(2)}</TableCell>
                    <TableCell className="text-emerald-500 font-semibold">
                      ${Number(s.commission_earned_usd).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.commission_paid ? 'default' : 'secondary'}>
                        {s.commission_paid ? 'Payée' : 'En attente'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Paiements */}
        <TabsContent value="payouts">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">
              Pour générer un paiement en lot, va sur l'écran « Commissions à payer » dans le menu.
              Cet onglet liste l'historique des versements.
            </p>
          </Card>
          <Card className="p-0 overflow-hidden mt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Revendeur</TableHead>
                  <TableHead>Date paiement</TableHead>
                  <TableHead>Vente d'origine</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.filter((s) => s.commission_paid).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      Aucun paiement effectué
                    </TableCell>
                  </TableRow>
                )}
                {sales
                  .filter((s) => s.commission_paid)
                  .map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{s.reseller_name}</TableCell>
                      <TableCell className="text-xs">
                        {s.commission_paid_at
                          ? format(new Date(s.commission_paid_at), 'dd/MM/yyyy', { locale: fr })
                          : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-[10px]">{s.invoice_number}</TableCell>
                      <TableCell className="text-right text-emerald-500 font-semibold">
                        ${Number(s.commission_earned_usd).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminResellerCommissions;
