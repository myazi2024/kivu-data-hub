import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminStatistics } from '@/hooks/useAdminStatistics';
import { usePeriodFilter } from '@/hooks/usePeriodFilter';
import { PeriodFilter } from '@/components/admin/dashboard/PeriodFilter';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Users, FileText, Percent } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const AdminFinancialDashboard = () => {
  const { periodRange, periodType, setPeriodType } = usePeriodFilter();
  const { statistics, loading } = useAdminStatistics(
    periodRange.startDate, 
    periodRange.endDate, 
    'overview'
  );

  // Revenue metrics
  const totalRevenue = statistics?.total_revenue || 0;
  const totalInvoices = statistics?.total_invoices || 0;
  const averageOrderValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;
  const pendingPayments = statistics?.pending_payments || 0;
  const conversionRate = totalInvoices > 0 && pendingPayments < totalInvoices 
    ? ((totalInvoices - pendingPayments) / totalInvoices) * 100 
    : 0;

  // Revenue by service data
  const revenueByService = [
    { name: 'Services Cadastraux', value: totalRevenue * 0.65 },
    { name: 'Publications', value: totalRevenue * 0.20 },
    { name: 'Codes CCC', value: totalRevenue * 0.10 },
    { name: 'Autres', value: totalRevenue * 0.05 }
  ];

  // Monthly trend (mock data - should come from backend)
  const monthlyTrend = [
    { month: 'Jan', revenue: totalRevenue * 0.08, transactions: Math.floor(totalInvoices * 0.08) },
    { month: 'Fév', revenue: totalRevenue * 0.09, transactions: Math.floor(totalInvoices * 0.09) },
    { month: 'Mar', revenue: totalRevenue * 0.11, transactions: Math.floor(totalInvoices * 0.11) },
    { month: 'Avr', revenue: totalRevenue * 0.10, transactions: Math.floor(totalInvoices * 0.10) },
    { month: 'Mai', revenue: totalRevenue * 0.12, transactions: Math.floor(totalInvoices * 0.12) },
    { month: 'Juin', revenue: totalRevenue * 0.13, transactions: Math.floor(totalInvoices * 0.13) },
    { month: 'Juil', revenue: totalRevenue * 0.11, transactions: Math.floor(totalInvoices * 0.11) },
    { month: 'Août', revenue: totalRevenue * 0.09, transactions: Math.floor(totalInvoices * 0.09) },
    { month: 'Sep', revenue: totalRevenue * 0.08, transactions: Math.floor(totalInvoices * 0.08) },
    { month: 'Oct', revenue: totalRevenue * 0.05, transactions: Math.floor(totalInvoices * 0.05) },
    { month: 'Nov', revenue: totalRevenue * 0.02, transactions: Math.floor(totalInvoices * 0.02) },
    { month: 'Déc', revenue: totalRevenue * 0.02, transactions: Math.floor(totalInvoices * 0.02) }
  ];

  // Payment methods distribution
  const paymentMethods = [
    { name: 'Mobile Money', value: 70, amount: totalRevenue * 0.70 },
    { name: 'Carte Bancaire', value: 20, amount: totalRevenue * 0.20 },
    { name: 'Virement', value: 8, amount: totalRevenue * 0.08 },
    { name: 'Espèces', value: 2, amount: totalRevenue * 0.02 }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <PeriodFilter
        periodType={periodType}
        onPeriodChange={setPeriodType}
      />

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus Totaux</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +12.5% vs période précédente
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
            <p className="text-xs text-muted-foreground mt-1">
              Par transaction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Conversion</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalInvoices - pendingPayments} / {totalInvoices} factures payées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paiements en Attente</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPayments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              En attente de paiement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenus</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="payments">Paiements</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Évolution des Revenus et Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="Revenus ($)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="transactions"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={2}
                    name="Transactions"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenus par Service</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={revenueByService}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="hsl(var(--primary))"
                      dataKey="value"
                    >
                      {revenueByService.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Détails par Service</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueByService.map((service, index) => (
                    <div key={service.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm font-medium">{service.name}</span>
                        </div>
                        <span className="text-sm font-bold">${service.value.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${(service.value / totalRevenue) * 100}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  ))}
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
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={paymentMethods}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" name="Utilisation (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Montants par Méthode</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentMethods.map((method, index) => (
                    <div key={method.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{method.name}</p>
                          <p className="text-sm text-muted-foreground">{method.value}% des transactions</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${method.amount.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
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
