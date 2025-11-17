import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CreditCard, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { PaymentAnalytics as PaymentAnalyticsType } from '@/hooks/useAdvancedAnalytics';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  data: PaymentAnalyticsType | null;
  loading: boolean;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export const PaymentAnalytics: React.FC<Props> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* KPIs Principaux */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Taux de Réussite</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{data.successRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <Progress value={data.successRate} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Transactions</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{data.totalTransactions}</p>
              </div>
              <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-secondary" />
            </div>
            <Badge variant="secondary" className="mt-3 text-xs">
              {data.failedTransactions} échecs
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Temps Moyen</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{data.averageProcessingTime.toFixed(1)}s</p>
              </div>
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Taux d'Abandon</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{data.abandonmentRate.toFixed(1)}%</p>
              </div>
              <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Par Méthode de Paiement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Performance par Méthode</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.byMethod}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="method" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="total" fill="hsl(var(--primary))" name="Montant Total ($)" />
                <Bar dataKey="count" fill="hsl(var(--secondary))" name="Nombre" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Répartition des Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.byMethod}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ method, count }) => `${method}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.byMethod.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Détails par Méthode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Détails par Méthode de Paiement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.byMethod.map((method, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <div>
                    <p className="font-medium text-sm sm:text-base">{method.method}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{method.count} transactions</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 sm:gap-4">
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-bold text-sm sm:text-base">${method.total.toFixed(2)}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-muted-foreground">Moyenne</p>
                    <p className="font-bold text-sm sm:text-base">${method.avgAmount.toFixed(2)}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-muted-foreground">Taux Réussite</p>
                    <Badge variant={method.successRate > 90 ? 'default' : 'secondary'} className="text-xs">
                      {method.successRate.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
