import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { 
  DollarSign, 
  Users, 
  FileText, 
  TrendingUp, 
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import { useAdminStatistics } from '@/hooks/useAdminStatistics';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#fbbf24', '#f87171'];

interface AdminStatisticsChartsProps {
  onExport?: () => void;
}

const AdminStatisticsCharts: React.FC<AdminStatisticsChartsProps> = ({ onExport }) => {
  const [dateRange, setDateRange] = useState<string>('30');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<string>('revenue');

  // Charger les statistiques selon l'onglet actif pour optimiser les performances
  const { statistics: overview, loading: loadingOverview } = useAdminStatistics(startDate, endDate, 'overview');
  const { statistics: revenueByDay, loading: loadingRevenue } = useAdminStatistics(
    startDate, 
    endDate, 
    activeTab === 'revenue' ? 'revenue_by_day' : 'overview'
  );
  const { statistics: servicesUsage, loading: loadingServices } = useAdminStatistics(
    startDate, 
    endDate, 
    activeTab === 'services' ? 'services_usage' : 'overview'
  );
  const { statistics: userGrowth, loading: loadingUsers } = useAdminStatistics(
    startDate, 
    endDate, 
    activeTab === 'users' ? 'user_growth' : 'overview'
  );
  const { statistics: contributionsStatus, loading: loadingContributions } = useAdminStatistics(
    startDate, 
    endDate, 
    activeTab === 'contributions' ? 'contributions_status' : 'overview'
  );
  const { statistics: paymentMethods, loading: loadingPayments } = useAdminStatistics(
    startDate, 
    endDate, 
    activeTab === 'revenue' ? 'payment_methods' : 'overview'
  );
  const { statistics: resellerPerformance, loading: loadingResellers } = useAdminStatistics(
    startDate, 
    endDate, 
    activeTab === 'resellers' ? 'reseller_performance' : 'overview'
  );

  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    const days = parseInt(value);
    setStartDate(subDays(new Date(), days));
    setEndDate(new Date());
  };

  if (loadingOverview) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const contributionsData = contributionsStatus?.contributions_status ? [
    { name: 'En attente', value: contributionsStatus.contributions_status.pending, color: COLORS[3] },
    { name: 'Approuvé', value: contributionsStatus.contributions_status.approved, color: COLORS[0] },
    { name: 'Rejeté', value: contributionsStatus.contributions_status.rejected, color: COLORS[4] },
    { name: 'Suspect', value: contributionsStatus.contributions_status.suspicious, color: COLORS[2] }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Filtres et contrôles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Statistiques détaillées
              </CardTitle>
              <CardDescription>
                Analyse complète de l'activité de la plateforme
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 derniers jours</SelectItem>
                  <SelectItem value="30">30 derniers jours</SelectItem>
                  <SelectItem value="90">90 derniers jours</SelectItem>
                  <SelectItem value="365">12 derniers mois</SelectItem>
                </SelectContent>
              </Select>
              {onExport && (
                <Button variant="outline" size="sm" onClick={onExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenus totaux</p>
                <p className="text-2xl font-bold">${overview?.total_revenue?.toFixed(2) || '0.00'}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {overview?.total_invoices || 0} factures
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Utilisateurs</p>
                <p className="text-2xl font-bold">{overview?.total_users || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Utilisateurs actifs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Contributions</p>
                <p className="text-2xl font-bold">{overview?.approved_contributions || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {overview?.total_contributions || 0} au total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold">${overview?.pending_payments?.toFixed(2) || '0.00'}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Paiements en attente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques détaillés */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="revenue">Revenus</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="contributions">Contributions</TabsTrigger>
          <TabsTrigger value="resellers">Revendeurs</TabsTrigger>
        </TabsList>

        {/* Revenus par jour */}
        <TabsContent value="revenue">
          {loadingRevenue || loadingPayments ? (
            <Card>
              <CardContent className="pt-6 flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : (
            <Card>
            <CardHeader>
              <CardTitle>Évolution des revenus</CardTitle>
              <CardDescription>Revenus quotidiens et nombre de factures</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={revenueByDay?.revenue_by_day || []}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), 'dd MMM', { locale: fr })}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      name === 'revenue' ? `$${value.toFixed(2)}` : value,
                      name === 'revenue' ? 'Revenus' : 'Factures'
                    ]}
                    labelFormatter={(label) => format(new Date(label), 'dd MMMM yyyy', { locale: fr })}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                    name="Revenus"
                  />
                  <Line type="monotone" dataKey="count" stroke="#f59e0b" name="Factures" />
                </AreaChart>
              </ResponsiveContainer>

              {/* Méthodes de paiement */}
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-4">Répartition par méthode de paiement</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={paymentMethods?.payment_methods || []}
                      dataKey="total"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.method}: $${entry.total.toFixed(0)}`}
                    >
                      {(paymentMethods?.payment_methods || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        {/* Croissance utilisateurs */}
        <TabsContent value="users">
          {loadingUsers ? (
            <Card>
              <CardContent className="pt-6 flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : (
            <Card>
            <CardHeader>
              <CardTitle>Croissance des utilisateurs</CardTitle>
              <CardDescription>Nouveaux utilisateurs et total cumulé</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={userGrowth?.user_growth || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), 'dd MMM', { locale: fr })}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    labelFormatter={(label) => format(new Date(label), 'dd MMMM yyyy', { locale: fr })}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="new_users" 
                    stroke="#3b82f6" 
                    name="Nouveaux utilisateurs"
                    strokeWidth={2}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="cumulative" 
                    stroke="hsl(var(--primary))" 
                    name="Total cumulé"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        {/* Utilisation des services */}
        <TabsContent value="services">
          {loadingServices ? (
            <Card>
              <CardContent className="pt-6 flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : (
            <Card>
            <CardHeader>
              <CardTitle>Utilisation des services</CardTitle>
              <CardDescription>Services les plus utilisés et revenus générés</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={servicesUsage?.services_usage || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="service_name" type="category" width={200} />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      name === 'revenue' ? `$${value.toFixed(2)}` : value,
                      name === 'revenue' ? 'Revenus' : 'Utilisations'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="count" fill="hsl(var(--primary))" name="Utilisations" />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenus" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        {/* Statut des contributions */}
        <TabsContent value="contributions">
          {loadingContributions ? (
            <Card>
              <CardContent className="pt-6 flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : (
            <Card>
            <CardHeader>
              <CardTitle>Statut des contributions</CardTitle>
              <CardDescription>Répartition des contributions par statut</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={contributionsData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {contributionsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {contributionsData.map((item, index) => (
                  <div key={index} className="text-center p-4 rounded-lg border">
                    <div className="text-2xl font-bold" style={{ color: item.color }}>
                      {item.value}
                    </div>
                    <div className="text-sm text-muted-foreground">{item.name}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        {/* Performance des revendeurs */}
        <TabsContent value="resellers">
          {loadingResellers ? (
            <Card>
              <CardContent className="pt-6 flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : (
            <Card>
            <CardHeader>
              <CardTitle>Performance des revendeurs</CardTitle>
              <CardDescription>Ventes et commissions par revendeur</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={resellerPerformance?.reseller_performance || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="reseller_code" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      `$${(value as number).toFixed(2)}`,
                      name === 'total_sales' ? 'Ventes totales' : 'Commission gagnée'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="total_sales" fill="hsl(var(--primary))" name="Ventes" />
                  <Bar dataKey="commission_earned" fill="#f59e0b" name="Commission" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminStatisticsCharts;
