import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line, Area, AreaChart } from 'recharts';
import { MapPin, TrendingUp, TrendingDown, Users, DollarSign } from 'lucide-react';
import { TerritorialPerformance as TerritorialPerformanceType } from '@/hooks/useAdvancedAnalytics';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  data: TerritorialPerformanceType | null;
  loading: boolean;
}

export const TerritorialPerformance: React.FC<Props> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-48" />
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
          <p className="text-muted-foreground text-center">Aucune donnée territoriale disponible pour la période sélectionnée.</p>
        </CardContent>
      </Card>
    );
  }

  const sortedByRevenue = [...data.byProvince].sort((a, b) => b.revenue - a.revenue);
  const topProvinces = sortedByRevenue.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Provinces KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topProvinces.slice(0, 4).map((province, index) => (
          <Card key={index}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{province.province}</p>
                  <p className="text-lg sm:text-xl font-bold mt-1">${province.revenue.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {province.growth >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-primary" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-destructive" />
                    )}
                    <span className={`text-xs ${province.growth >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {Math.abs(province.growth).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Graphiques Principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenus par Province */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Revenus par Province
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={sortedByRevenue} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="province" type="category" width={100} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenus" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Utilisateurs par Province */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Utilisateurs par Province
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={sortedByRevenue}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="province" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="users" fill="hsl(var(--secondary))" name="Utilisateurs" />
                <Line type="monotone" dataKey="penetrationRate" stroke="hsl(var(--primary))" name="Pénétration %" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Croissance par Province */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Taux de Croissance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sortedByRevenue}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="province" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
              <Bar dataKey="growth" fill="hsl(var(--accent))" name="Croissance %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Heatmap Simulation (Table) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Vue d'Ensemble Territoriale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedByRevenue.map((province, index) => {
              const intensity = (province.revenue / sortedByRevenue[0].revenue) * 100;
              return (
                <div 
                  key={index} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg gap-3"
                  style={{ 
                    background: `linear-gradient(to right, hsl(var(--primary) / ${intensity/100}), transparent)`
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                    <div>
                      <p className="font-medium text-sm sm:text-base">{province.province}</p>
                      <p className="text-xs text-muted-foreground">
                        {province.users} utilisateurs
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-muted-foreground">Revenus</p>
                      <p className="font-bold text-sm">${province.revenue.toLocaleString()}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-muted-foreground">Rev/Capita</p>
                      <p className="font-bold text-sm">${province.revenuePerCapita.toFixed(2)}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-muted-foreground">Pénétration</p>
                      <Badge variant="secondary" className="text-xs">
                        {province.penetrationRate.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-muted-foreground">Croissance</p>
                      <Badge 
                        variant={province.growth >= 0 ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {province.growth >= 0 ? '+' : ''}{province.growth.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Métriques Comparatives */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Revenus par Habitant</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={sortedByRevenue}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="province" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
                <Area type="monotone" dataKey="revenuePerCapita" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} name="$/Capita" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Taux de Pénétration</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={sortedByRevenue}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="province" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
                <Area type="monotone" dataKey="penetrationRate" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.6} name="Pénétration %" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
