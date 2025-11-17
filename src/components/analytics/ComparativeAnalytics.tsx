import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { ComparativeData } from '@/hooks/useAdvancedAnalytics';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  data: ComparativeData | null;
  loading: boolean;
}

export const ComparativeAnalytics: React.FC<Props> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">Aucune donnée comparative disponible pour la période sélectionnée.</p>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    { key: 'revenue', label: 'Revenus', format: (v: number) => `$${v.toLocaleString()}`, change: data.changes.revenueChange },
    { key: 'users', label: 'Utilisateurs', format: (v: number) => v.toLocaleString(), change: data.changes.usersChange },
    { key: 'transactions', label: 'Transactions', format: (v: number) => v.toLocaleString(), change: data.changes.transactionsChange },
    { key: 'avgOrderValue', label: 'Panier Moyen', format: (v: number) => `$${v.toFixed(2)}`, change: data.changes.aovChange }
  ];

  const comparisonData = metrics.map(m => ({
    metric: m.label,
    current: (data.current as any)[m.key],
    previous: (data.previous as any)[m.key]
  }));

  return (
    <div className="space-y-6">
      {/* Cartes de Comparaison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-4 sm:p-6">
              <p className="text-xs text-muted-foreground mb-3">{metric.label}</p>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-muted-foreground">Précédent</p>
                  <p className="text-base font-medium">
                    {metric.format((data.previous as any)[metric.key])}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Actuel</p>
                  <p className="text-base font-bold">
                    {metric.format((data.current as any)[metric.key])}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                {metric.change >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-primary" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-destructive" />
                )}
                <Badge variant={metric.change >= 0 ? 'default' : 'destructive'} className="text-xs">
                  {metric.change >= 0 ? '+' : ''}{metric.change.toFixed(1)}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Graphiques de Comparaison */}
      <Tabs defaultValue="bar" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bar">Vue Barres</TabsTrigger>
          <TabsTrigger value="table">Vue Tableau</TabsTrigger>
        </TabsList>

        <TabsContent value="bar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Comparaison Période à Période</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="previous" fill="hsl(var(--muted))" name="Période Précédente" />
                  <Bar dataKey="current" fill="hsl(var(--primary))" name="Période Actuelle" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Tableau Comparatif</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-xs sm:text-sm font-medium">Métrique</th>
                      <th className="text-right p-3 text-xs sm:text-sm font-medium">Précédent</th>
                      <th className="text-right p-3 text-xs sm:text-sm font-medium">Actuel</th>
                      <th className="text-right p-3 text-xs sm:text-sm font-medium">Variation</th>
                      <th className="text-right p-3 text-xs sm:text-sm font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((metric, index) => {
                      const prev = (data.previous as any)[metric.key];
                      const curr = (data.current as any)[metric.key];
                      const diff = curr - prev;
                      return (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium text-xs sm:text-sm">{metric.label}</td>
                          <td className="p-3 text-right text-xs sm:text-sm">{metric.format(prev)}</td>
                          <td className="p-3 text-right font-bold text-xs sm:text-sm">{metric.format(curr)}</td>
                          <td className="p-3 text-right text-xs sm:text-sm">
                            <span className={diff >= 0 ? 'text-primary' : 'text-destructive'}>
                              {diff >= 0 ? '+' : ''}{metric.format(diff)}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <Badge variant={metric.change >= 0 ? 'default' : 'destructive'} className="text-xs">
                              {metric.change >= 0 ? '+' : ''}{metric.change.toFixed(1)}%
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Analyse des Variations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Analyse des Variations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.map((metric, index) => {
              const isPositive = metric.change >= 0;
              const magnitude = Math.abs(metric.change);
              let impact = 'Faible';
              if (magnitude > 20) impact = 'Fort';
              else if (magnitude > 10) impact = 'Moyen';

              return (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-sm sm:text-base">{metric.label}</h4>
                        <Badge variant="outline" className="text-xs">{impact}</Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {isPositive ? '📈 Augmentation' : '📉 Diminution'} de {Math.abs(metric.change).toFixed(1)}% 
                        par rapport à la période précédente
                      </p>
                    </div>
                    <Badge 
                      variant={isPositive ? 'default' : 'destructive'}
                      className="self-start sm:self-auto text-xs sm:text-sm"
                    >
                      {isPositive ? '+' : ''}{metric.change.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
