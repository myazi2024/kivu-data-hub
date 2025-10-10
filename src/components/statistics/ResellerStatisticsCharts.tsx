import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { DollarSign, TrendingUp, Tag, BarChart as BarChartIcon } from 'lucide-react';
import { useResellerStatistics } from '@/hooks/useResellerStatistics';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const ResellerStatisticsCharts: React.FC = () => {
  const [dateRange, setDateRange] = useState<string>('30');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'sales' | 'codes'>('sales');

  const { statistics: overview, loading } = useResellerStatistics(startDate, endDate, 'overview');
  const { statistics: salesByDay, loading: loadingSales } = useResellerStatistics(
    startDate, 
    endDate, 
    'sales_by_day'
  );
  const { statistics: codesPerformance, loading: loadingCodes } = useResellerStatistics(
    startDate, 
    endDate, 
    'discount_codes_performance'
  );

  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    const days = parseInt(value);
    setStartDate(subDays(new Date(), days));
    setEndDate(new Date());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contrôles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChartIcon className="h-5 w-5" />
                Mes statistiques de vente
              </CardTitle>
              <CardDescription>
                Performance de vos codes de remise
              </CardDescription>
            </div>
            <Select value={dateRange} onValueChange={handleDateRangeChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 derniers jours</SelectItem>
                <SelectItem value="30">30 derniers jours</SelectItem>
                <SelectItem value="90">90 derniers jours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ventes totales</p>
                <p className="text-2xl font-bold">${overview?.total_sales?.toFixed(2) || '0.00'}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {overview?.sales_count || 0} ventes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Commission totale</p>
                <p className="text-2xl font-bold">${overview?.total_commission?.toFixed(2) || '0.00'}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Moyenne: ${overview?.avg_sale_amount?.toFixed(2) || '0.00'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Commission payée</p>
                <p className="text-2xl font-bold text-green-600">
                  ${overview?.paid_commission?.toFixed(2) || '0.00'}
                </p>
              </div>
              <Tag className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-orange-600">
                  ${overview?.pending_commission?.toFixed(2) || '0.00'}
                </p>
              </div>
              <Tag className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'sales' | 'codes')} className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Évolution des ventes</TabsTrigger>
          <TabsTrigger value="codes">Performance des codes</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          {loadingSales ? (
            <Card>
              <CardContent className="pt-6 flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Évolution quotidienne</CardTitle>
                <CardDescription>Ventes, revenus et commissions par jour</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={salesByDay?.sales_by_day || []}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
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
                      typeof value === 'number' ? `$${value.toFixed(2)}` : value,
                      name === 'revenue' ? 'Revenus' : name === 'commission' ? 'Commission' : 'Ventes'
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
                  <Area 
                    type="monotone" 
                    dataKey="commission" 
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorCommission)" 
                    name="Commission"
                  />
                  <Line type="monotone" dataKey="sales" stroke="#f59e0b" name="Nombre de ventes" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        <TabsContent value="codes">
          {loadingCodes ? (
            <Card>
              <CardContent className="pt-6 flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : (
            <Card>
            <CardHeader>
              <CardTitle>Performance des codes de remise</CardTitle>
              <CardDescription>Utilisation et revenus générés par code</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={codesPerformance?.discount_codes_performance || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="code" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      typeof value === 'number' ? 
                        (name.includes('commission') || name.includes('discount') ? `$${value.toFixed(2)}` : value)
                        : value,
                      name === 'usage_count' ? 'Utilisations' :
                      name === 'total_discount' ? 'Remise totale' :
                      name === 'total_commission' ? 'Commission totale' : name
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="usage_count" fill="hsl(var(--primary))" name="Utilisations" />
                  <Bar dataKey="total_commission" fill="#10b981" name="Commission" />
                </BarChart>
              </ResponsiveContainer>

              {/* Tableau détaillé des codes */}
              <div className="mt-6 space-y-2">
                <h4 className="text-sm font-medium">Détails des codes</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium">Code</th>
                        <th className="px-4 py-2 text-right text-sm font-medium">Utilisations</th>
                        <th className="px-4 py-2 text-right text-sm font-medium">Limite</th>
                        <th className="px-4 py-2 text-right text-sm font-medium">Remise</th>
                        <th className="px-4 py-2 text-right text-sm font-medium">Commission</th>
                        <th className="px-4 py-2 text-center text-sm font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(codesPerformance?.discount_codes_performance || []).map((code, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2 font-mono text-sm">{code.code}</td>
                          <td className="px-4 py-2 text-right">{code.usage_count}</td>
                          <td className="px-4 py-2 text-right">
                            {code.max_usage || 'Illimité'}
                          </td>
                          <td className="px-4 py-2 text-right">
                            ${code.total_discount.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-green-600">
                            ${code.total_commission.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                              code.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {code.is_active ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ResellerStatisticsCharts;
