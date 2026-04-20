import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePeriodFilter } from '@/hooks/usePeriodFilter';
import { PeriodFilter } from '@/components/admin/dashboard/PeriodFilter';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, FileText, Percent } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import TestModeBanner from '@/components/admin/billing/TestModeBanner';
import BillingAnomaliesPanel from '@/components/admin/billing/BillingAnomaliesPanel';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const SOURCE_LABELS: Record<string, string> = {
  cadastral: 'Cadastral',
  expertise: 'Expertise',
  permit: 'Autorisation',
  publication: 'Publications',
};

interface BillingSummary {
  total_transactions: number;
  completed_count: number;
  failed_count: number;
  pending_count: number;
  total_revenue_usd: number;
  pending_revenue_usd: number;
  by_source: Record<string, { count: number; revenue: number }>;
  by_method: Record<string, { count: number; revenue: number }>;
}

const AdminFinancialDashboard = () => {
  const { periodRange, periodType, setPeriodType } = usePeriodFilter();
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<BillingSummary | null>(null);
  const [previous, setPrevious] = useState<BillingSummary | null>(null);

  useEffect(() => {
    void fetchData();
  }, [periodRange.startDate, periodRange.endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const start = new Date(periodRange.startDate);
      const end = new Date(periodRange.endDate);
      const durationMs = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - durationMs);

      const [{ data: curData, error: curErr }, { data: prevData, error: prevErr }] = await Promise.all([
        (supabase as any).rpc('get_billing_summary', {
          p_from: start.toISOString(),
          p_to: end.toISOString(),
        }),
        (supabase as any).rpc('get_billing_summary', {
          p_from: prevStart.toISOString(),
          p_to: start.toISOString(),
        }),
      ]);

      if (curErr) console.error('billing summary current:', curErr);
      if (prevErr) console.error('billing summary previous:', prevErr);

      setCurrent((curData as BillingSummary) || null);
      setPrevious((prevData as BillingSummary) || null);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = Number(current?.total_revenue_usd || 0);
  const totalTransactions = Number(current?.total_transactions || 0);
  const completed = Number(current?.completed_count || 0);
  const pending = Number(current?.pending_count || 0);
  const averageOrderValue = completed > 0 ? totalRevenue / completed : 0;
  const conversionRate = totalTransactions > 0 ? (completed / totalTransactions) * 100 : 0;

  const prevRevenue = Number(previous?.total_revenue_usd || 0);
  const variation = prevRevenue > 0
    ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
    : (totalRevenue > 0 ? 100 : 0);
  const variationPositive = variation >= 0;

  const revenueBySource = Object.entries(current?.by_source || {}).map(([key, v]) => ({
    name: SOURCE_LABELS[key] || key,
    value: Number(v.revenue || 0),
    count: Number(v.count || 0),
  })).filter(s => s.value > 0 || s.count > 0);

  const paymentMethods = Object.entries(current?.by_method || {}).map(([name, v]) => ({
    name: name === 'unknown' ? 'Non spécifié' : name,
    amount: Number(v.revenue || 0),
    count: Number(v.count || 0),
    value: totalTransactions > 0 ? (Number(v.count || 0) / totalTransactions) * 100 : 0,
  })).filter(m => m.count > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TestModeBanner />
      <BillingAnomaliesPanel />
      <PeriodFilter periodType={periodType} onPeriodChange={setPeriodType} />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus Totaux</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className={`text-xs mt-1 flex items-center gap-1 ${variationPositive ? 'text-green-600' : 'text-destructive'}`}>
              {variationPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {variationPositive ? '+' : ''}{variation.toFixed(1)}% vs période précédente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur Moyenne</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averageOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Par transaction réussie</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Réussite</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">{completed} / {totalTransactions} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paiements en Attente</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ${Number(current?.pending_revenue_usd || 0).toFixed(2)} en attente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">Par Service</TabsTrigger>
          <TabsTrigger value="payments">Méthodes de paiement</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenus par Service</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueBySource.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">Aucune donnée sur la période</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={revenueBySource}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="hsl(var(--primary))"
                        dataKey="value"
                      >
                        {revenueBySource.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Détails par Service</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueBySource.map((service, index) => (
                    <div key={service.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm font-medium">{service.name}</span>
                          <span className="text-xs text-muted-foreground">({service.count} tx)</span>
                        </div>
                        <span className="text-sm font-bold">${service.value.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: totalRevenue > 0 ? `${(service.value / totalRevenue) * 100}%` : '0%',
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {revenueBySource.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">Aucune donnée</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Méthodes de Paiement</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentMethods.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">Aucune donnée sur la période</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={paymentMethods}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" name="Utilisation (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Montants par Méthode</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentMethods.map((method) => (
                    <div key={method.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{method.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {method.value.toFixed(1)}% — {method.count} tx
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${method.amount.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                  {paymentMethods.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">Aucune donnée</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminFinancialDashboard;
